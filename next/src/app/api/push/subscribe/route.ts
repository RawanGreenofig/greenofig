import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Save (or refresh) a push subscription for the signed-in user.
 *
 * The endpoint accepts BOTH shapes:
 *
 *   1. Browser web-push (VAPID) — original behaviour:
 *        { endpoint: string, keys: { p256dh, auth } }
 *      Upsert into public.push_subscriptions, key = endpoint.
 *
 *   2. Native FCM (Capacitor Android app):
 *        { fcmToken: string, platform?: 'android'|'ios', appVersion?: string }
 *      Upsert into public.fcm_tokens, key = token.
 *
 * Branching is purely on body shape so existing browser clients
 * notice nothing changed.
 */
export async function POST(req: Request) {
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    // VAPID
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
    // FCM
    fcmToken?: string
    platform?: string
    appVersion?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent')

  // ── FCM path (native Android via Capacitor) ─────────────────────
  if (typeof body.fcmToken === 'string' && body.fcmToken.length > 0) {
    const platform = body.platform === 'ios' ? 'ios' : 'android'
    const appVersion =
      typeof body.appVersion === 'string' ? body.appVersion.slice(0, 32) : null

    const { error } = await supabase
      .from('fcm_tokens')
      .upsert(
        {
          user_id: user.id,
          token: body.fcmToken,
          platform,
          app_version: appVersion,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'token' },
      )

    if (error) {
      console.error('[api/push/subscribe] fcm upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, channel: 'fcm' })
  }

  // ── VAPID path (browser web push) — unchanged from before ───────
  const endpoint = body.endpoint
  const p256dh = body.keys?.p256dh
  const auth = body.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: 'Invalid subscription object' },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'endpoint' },
    )

  if (error) {
    console.error('[api/push/subscribe] upsert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, channel: 'web' })
}
