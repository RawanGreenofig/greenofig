import type { NextRequest } from 'next/server'
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
import type { UserTier } from '@/lib/supabase/types'

/**
 * POST /api/notifications/send
 *
 * Body: {
 *   userIds?: string[]   // specific users
 *   tiers?: UserTier[]   // OR all users matching these tiers
 *   title: string,  titleAr: string
 *   body:  string,  bodyAr:  string
 *   type:  string         // free-form category ("billing", "weekly", etc.)
 *   data?: Record<string, unknown>
 * }
 *
 * If neither userIds nor tiers is provided, broadcasts to ALL users.
 *
 * Returns: { sent: number, errors: string[] }
 *
 * Auth: nutritionist or admin only.
 */

interface Body {
  userIds?: string[]
  tiers?: UserTier[]
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  type?: string
  data?: Record<string, unknown>
  href?: string
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin' && ctx.profile.role !== 'nutritionist') {
    return forbidden()
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }

  if (!body.title?.trim() || !body.body?.trim()) {
    return badRequest('title and body are required.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Resolve target user IDs
  let targets: string[] = []
  const errors: string[] = []

  if (body.userIds && body.userIds.length > 0) {
    targets = body.userIds
  } else if (body.tiers && body.tiers.length > 0) {
    const { data, error } = await service
      .from('profiles')
      .select('id')
      .in('tier', body.tiers)
    if (error) {
      errors.push(`profiles query failed: ${error.message}`)
    }
    targets = ((data as { id: string }[] | null) ?? []).map((r) => r.id)
  } else {
    // Broadcast — all profiles
    const { data, error } = await service.from('profiles').select('id')
    if (error) {
      errors.push(`profiles query failed: ${error.message}`)
    }
    targets = ((data as { id: string }[] | null) ?? []).map((r) => r.id)
  }

  // Insert one notification per target. Chunk to keep payloads small.
  let sent = 0
  for (let i = 0; i < targets.length; i += 200) {
    const slice = targets.slice(i, i + 200)
    const rows = slice.map((userId) => ({
      user_id: userId,
      title:  body.titleAr ? `${body.title} | ${body.titleAr}` : body.title,
      body:   body.bodyAr  ? `${body.body} | ${body.bodyAr}`   : body.body,
      category: body.type ?? 'admin',
      href: body.href ?? null,
      read: false,
    }))
    const { error } = await service.from('notifications').insert(rows as never)
    if (error) {
      errors.push(error.message)
    } else {
      sent += slice.length
    }
  }

  await logAudit({
    action: 'notifications.broadcast',
    actorId: ctx.userId,
    actorRole: ctx.profile.role,
    resourceType: 'notifications',
    newValue: {
      title: body.title,
      type: body.type ?? 'admin',
      audience: body.userIds
        ? `userIds:${body.userIds.length}`
        : body.tiers
          ? `tiers:${body.tiers.join(',')}`
          : 'all',
      sent,
    },
    ip: ipFromRequest(req),
  })

  return json({ sent, errors })
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
