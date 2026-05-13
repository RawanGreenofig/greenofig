import { type NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/bridge
 *
 * Capacitor → cookies bridge.
 *
 * The Capacitor WebView stores its Supabase session in localStorage
 * (see lib/supabase/client.ts) because the cookie-based flow from
 * @supabase/ssr doesn't reliably round-trip the auth state through
 * the WebView. localStorage is invisible to the server, though, so
 * none of the server-side surfaces (RSC pages, API routes that call
 * getServerSupabase) would see the user — every fetch from a
 * Capacitor-signed-in user would look unauthenticated.
 *
 * After the client completes sign-in it POSTs the access + refresh
 * tokens here. The server-side SSR client's setSession() emits the
 * proper Set-Cookie headers (HttpOnly / Secure / SameSite=Lax) so
 * subsequent requests from the WebView carry the session for the
 * server too. localStorage remains the canonical store on the
 * client; cookies are the mirror for server consumption.
 *
 * Idempotent. Best-effort from the caller's perspective: a failure
 * to bridge doesn't block sign-in (the client already has the
 * session), it just means server-rendered surfaces will render as
 * unauthenticated until the bridge succeeds on a retry.
 *
 * Rejects invalid token shapes early so a malformed payload can't
 * trick the server into storing arbitrary text in a cookie.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const { access_token, refresh_token } =
    (body as { access_token?: unknown; refresh_token?: unknown }) ?? {}
  if (typeof access_token !== 'string' || typeof refresh_token !== 'string') {
    return NextResponse.json({ error: 'missing_tokens' }, { status: 400 })
  }
  // JWT shape check — three base64 segments. Cheap defence against
  // someone POSTing a non-JWT string that would still be stored in a
  // cookie.
  if (access_token.split('.').length !== 3) {
    return NextResponse.json({ error: 'invalid_access_token' }, { status: 400 })
  }
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })
  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? 'invalid_session' },
      { status: 401 },
    )
  }
  return NextResponse.json({ ok: true, userId: data.session.user.id })
}
