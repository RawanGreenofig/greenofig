import type { NextRequest } from 'next/server'
import webpush from 'web-push'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getServerSupabase } from '@/lib/supabase/server'
import type { UserRole, UserTier } from '@/lib/supabase/types'
import { sendFcmToTokens } from '@/lib/fcm'

/**
 * POST /api/notifications/send
 *
 * Two auth modes:
 *   - `x-secret` header that matches OPENCLAW_WEBHOOK_SECRET — used
 *     by server-to-server callers (Stripe webhook, scheduled jobs).
 *   - Otherwise standard session auth via withAuth, gated to
 *     admin / nutritionist roles.
 *
 * Body:
 * {
 *   userIds?:  string[]   // specific users
 *   tiers?:    UserTier[] // OR all users matching these tiers
 *   title:     string
 *   titleAr?:  string
 *   body:      string
 *   bodyAr?:   string
 *   type?:     string     // free-form category ("billing", "message", ...)
 *   url?:      string     // deep link inside the app
 *   data?:     Record<string, unknown>
 * }
 *
 * Side effects:
 *   1. Inserts one `notifications` row per target so the bell + history
 *      reflect the message.
 *   2. Dispatches a Web Push to every `push_subscriptions` row for
 *      those users, using web-push + the configured VAPID keys.
 *
 * Returns: `{ notifications, pushSent, pushFailed, errors }`.
 */

interface Body {
  userIds?: string[]
  tiers?: UserTier[]
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  type?: string
  url?: string
  data?: Record<string, unknown>
}

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:greenofig@gmail.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

interface PushSubRow {
  endpoint: string
  p256dh: string
  auth: string
}

async function dispatchPush(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; failed: number; expired: string[] }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, failed: 0, expired: [] }
  }
  const service = getServiceSupabase()
  if (!service) return { sent: 0, failed: 0, expired: [] }

  const { data: subs } = await service
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  const rows = (subs as PushSubRow[] | null) ?? []
  if (rows.length === 0) return { sent: 0, failed: 0, expired: [] }

  const body = JSON.stringify(payload)
  let sent = 0
  let failed = 0
  const expired: string[] = []

  await Promise.allSettled(
    rows.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body,
        )
        sent++
      } catch (e) {
        failed++
        // 404 / 410 = subscription is dead, garbage-collect it
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          expired.push(s.endpoint)
        }
        console.error('[push] send failed:', status, (e as Error).message)
      }
    }),
  )

  if (expired.length > 0) {
    await service.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return { sent, failed, expired }
}

/**
 * Fan a notification out to every FCM token registered to these
 * user ids. Mirrors dispatchPush but for the native Android app.
 * No-op when FCM credentials aren't configured, so the web-push
 * pipeline keeps working unchanged.
 */
async function dispatchFcm(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<{ sent: number; failed: number; expired: number }> {
  const service = getServiceSupabase()
  if (!service) return { sent: 0, failed: 0, expired: 0 }

  const { data: tokens } = await service
    .from('fcm_tokens')
    .select('token')
    .in('user_id', userIds)
  const tokenList = ((tokens as { token: string }[] | null) ?? []).map((r) => r.token)
  if (tokenList.length === 0) return { sent: 0, failed: 0, expired: 0 }

  const result = await sendFcmToTokens(tokenList, {
    title: payload.title,
    body: payload.body,
    url: payload.url,
  })

  if (result.expiredTokens.length > 0) {
    await service.from('fcm_tokens').delete().in('token', result.expiredTokens)
  }

  return {
    sent: result.sent,
    failed: result.failed,
    expired: result.expiredTokens.length,
  }
}

async function handleSend(
  body: Body,
  audit: {
    actorId: string | null
    actorRole: UserRole | null
    ip: string | null
  },
) {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  if (!body.title?.trim() || !body.body?.trim()) {
    return badRequest('title and body are required.')
  }

  const errors: string[] = []
  let targets: string[] = []

  if (body.userIds && body.userIds.length > 0) {
    targets = body.userIds
  } else if (body.tiers && body.tiers.length > 0) {
    const { data, error } = await service
      .from('profiles')
      .select('id')
      .in('tier', body.tiers)
    if (error) errors.push(`profiles query failed: ${error.message}`)
    targets = ((data as { id: string }[] | null) ?? []).map((r) => r.id)
  } else {
    const { data, error } = await service.from('profiles').select('id')
    if (error) errors.push(`profiles query failed: ${error.message}`)
    targets = ((data as { id: string }[] | null) ?? []).map((r) => r.id)
  }

  if (targets.length === 0) {
    return json({ notifications: 0, pushSent: 0, pushFailed: 0, errors })
  }

  // Insert in chunks. Schema columns: title / title_ar / body / body_ar /
  // type / data jsonb / is_read. URL gets folded into data.url so
  // realtime listeners + the bell can navigate when clicked.
  let inserted = 0
  for (let i = 0; i < targets.length; i += 200) {
    const slice = targets.slice(i, i + 200)
    const rows = slice.map((userId) => ({
      user_id: userId,
      title: body.title,
      title_ar: body.titleAr ?? null,
      body: body.body,
      body_ar: body.bodyAr ?? null,
      type: body.type ?? 'system',
      data: { ...(body.data ?? {}), url: body.url ?? '/dashboard' },
      is_read: false,
    }))
    const { error } = await service.from('notifications').insert(rows as never)
    if (error) errors.push(error.message)
    else inserted += slice.length
  }

  // Fan out across both channels in parallel. Web-push hits the
  // existing push_subscriptions table; FCM hits fcm_tokens. A user
  // with both a browser AND the Android app will get both deliveries.
  const [pushResult, fcmResult] = await Promise.all([
    dispatchPush(targets, {
      title: body.title,
      body: body.body,
      url: body.url,
    }),
    dispatchFcm(targets, {
      title: body.title,
      body: body.body,
      url: body.url,
    }),
  ])

  if (audit.actorId) {
    await logAudit({
      action: 'notifications.broadcast',
      actorId: audit.actorId,
      actorRole: audit.actorRole,
      resourceType: 'notifications',
      newValue: {
        title: body.title,
        type: body.type ?? 'system',
        audience: body.userIds
          ? `userIds:${body.userIds.length}`
          : body.tiers
            ? `tiers:${body.tiers.join(',')}`
            : 'all',
        inserted,
        pushSent: pushResult.sent,
        pushFailed: pushResult.failed,
        fcmSent: fcmResult.sent,
        fcmFailed: fcmResult.failed,
      },
      ip: audit.ip,
    })
  }

  return json({
    notifications: inserted,
    pushSent: pushResult.sent,
    pushFailed: pushResult.failed,
    fcmSent: fcmResult.sent,
    fcmFailed: fcmResult.failed,
    errors,
  })
}

/* ── Server-to-server entry: x-secret header bypasses session auth ── */

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-secret')
  if (secret && secret === process.env.OPENCLAW_WEBHOOK_SECRET) {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }
    return handleSend(body, {
      actorId: null,
      actorRole: null,
      ip: ipFromRequest(req),
    })
  }
  // Fall back to session-auth path
  return sessionPost(req, { params: {} })
}

const sessionPost = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin' && ctx.profile.role !== 'nutritionist') {
    return forbidden()
  }
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  return handleSend(body, {
    actorId: ctx.userId,
    actorRole: ctx.profile.role,
    ip: ipFromRequest(req),
  })
})

/**
 * GET /api/notifications/send?userId=...
 *
 * Returns the last 20 notifications for the requested user. Admins +
 * nutritionists can pull any user; signed-in users can only pull their
 * own (we silently swap in their userId if they ask for someone else's).
 */
export const GET = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  const url = new URL(req.url)
  const askedFor = url.searchParams.get('userId')
  const targetId =
    ctx.profile.role === 'admin' || ctx.profile.role === 'nutritionist'
      ? askedFor || ctx.userId
      : ctx.userId

  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
    .limit(20)

  return json({ notifications: data ?? [] })
})
