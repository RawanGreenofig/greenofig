import { type NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * OAuth callback for Supabase auth (Google, etc.).
 *
 * Flow:
 *   1. Provider redirects browser to /<locale>/auth/callback?code=...
 *   2. Exchange the code for a session (sets cookies via the SSR client).
 *   3. Upsert a profiles row so first-time OAuth users have a profile.
 *   4. Read the role and redirect to the right area
 *      (admin → /admin, nutritionist → /nutritionist, else /dashboard).
 *   5. On any error, send back to /sign-in?error=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const code = searchParams.get('code')
  const from = searchParams.get('from')
  const next = searchParams.get('next')
  const locale = request.nextUrl.pathname.split('/')[1] || 'en'

  // Always send the user back to the canonical app URL when configured —
  // this keeps cookies/session on greenofig.com instead of bouncing them to
  // the supabase-side or vercel-side host the OAuth provider redirected to.
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || requestOrigin

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/${locale}/sign-in?error=${reason}`, origin))

  if (!code) return fail('no_code')

  // Capacitor WebView path. The PKCE verifier was written to localStorage
  // when /app-login called signInWithOAuth, so the swap has to happen
  // client-side — the server has no way to read it. Hand the code off
  // to /<locale>/auth/capacitor-complete which runs in the same WebView
  // and therefore sees the verifier.
  const ua = request.headers.get('user-agent') ?? ''
  if (/GreenofigApp\//.test(ua)) {
    const dest = new URL(`/${locale}/auth/capacitor-complete`, origin)
    dest.searchParams.set('code', code)
    return NextResponse.redirect(dest)
  }

  // Chrome Custom Tabs path. /app-login opens the OAuth flow in a
  // Custom Tab (real Chrome surface — Google accepts it where it
  // would block an embedded WebView). After consent we land here
  // INSIDE that tab, not the WebView, so the regular server-side
  // exchange would set cookies in Chrome's cookie jar and leave the
  // app stranded on /app-login with no session.
  //
  // ?from=capacitor is the discriminator /app-login sets on the
  // redirectTo. When present, we don't touch the code — we issue a
  // small HTML page that immediately navigates to the custom scheme
  // com.greenofig.app://login-callback?code=... Android claims the
  // scheme via the intent filter mobile/scripts/patch-manifest.mjs
  // installed; Capacitor surfaces it as appUrlOpen;
  // CapacitorAuthListener runs exchangeCodeForSession against the
  // device's localStorage Supabase client (where the PKCE verifier
  // actually lives) and navigates the WebView to /dashboard.
  //
  // Two ways the bounce fires for resilience:
  //   1. <meta http-equiv="refresh"> for Custom Tab variants that
  //      respect it for custom schemes.
  //   2. A 50ms setTimeout window.location.replace() for the ones
  //      that don't. The double-fire is harmless — the second call
  //      no-ops once Android has handed off to the app.
  if (from === 'capacitor') {
    const deepLink =
      'com.greenofig.app://login-callback?code=' + encodeURIComponent(code)
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0; url=${deepLink}">
<title>Returning to Greenofig…</title>
<style>
  body { background: #0d1a12; color: #f0ede6; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; margin: 0; }
  .box { text-align: center; padding: 24px; }
  .spinner { width: 32px; height: 32px; margin: 0 auto 16px;
             border: 3px solid rgba(132,217,61,0.25);
             border-top-color: #a3e635; border-radius: 50%;
             animation: gf-spin 0.7s linear infinite; }
  p { font-size: 14px; color: #a8b5a8; margin: 0; }
  @keyframes gf-spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
  <div class="box">
    <div class="spinner" aria-hidden="true"></div>
    <p>Returning to the Greenofig app…</p>
  </div>
  <script>
    setTimeout(function () {
      window.location.replace(${JSON.stringify(deepLink)});
    }, 50);
  </script>
</body>
</html>`
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Don't cache — the URL contains a single-use OAuth code.
        'Cache-Control': 'no-store',
      },
    })
  }

  const supabase = getServerSupabase()
  if (!supabase) return fail('service_unavailable')

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return fail('auth_error')

  // Upsert a profile row for first-time OAuth signups. ignoreDuplicates
  // means we never overwrite role/tier/etc. for existing users.
  await supabase
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        full_name:
          (data.user.user_metadata?.full_name as string | undefined) ?? '',
        avatar_url:
          (data.user.user_metadata?.avatar_url as string | undefined) ?? '',
        role: 'user',
        tier: 'free',
      } as never,
      { onConflict: 'id', ignoreDuplicates: true },
    )

  // Honor a safe in-app ?next= path (e.g. the walk-in invite page that
  // links the account). Must be a local absolute path, never an
  // open redirect.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(new URL(next, origin))
  }

  // Read the role to decide redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  const role = (profile as { role?: string } | null)?.role ?? 'user'
  const dest =
    role === 'admin'
      ? '/admin'
      : role === 'nutritionist'
        ? '/nutritionist'
        : '/dashboard'

  return NextResponse.redirect(new URL(`/${locale}${dest}`, origin))
}
