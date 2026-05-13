import { type NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * Non-localized OAuth / recovery callback.
 *
 * Supabase emails (recovery, magic link, invite) all redirect here, since
 * we register `${NEXT_PUBLIC_APP_URL}/auth/callback` as the canonical
 * redirect URL in the Supabase dashboard.
 *
 * Flow:
 *   1. Provider redirects to /auth/callback?code=...
 *   2. Exchange code for session (cookies set via SSR client).
 *   3. Honor `?next=<path>` if present, otherwise:
 *        - admin / nutritionist → role-specific dashboard
 *        - everyone else        → /dashboard
 *   4. On any error, route back to /sign-in?error=...
 *
 * The localized `[locale]/auth/callback/route.ts` still exists for the
 * Google sign-in flow (it uses the user's UI locale).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next')

  // Always come back to the canonical app origin if configured.
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || url.origin

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/sign-in?error=${reason}`, origin))

  if (!code) return fail('no_code')

  // Capacitor WebView path — see /[locale]/auth/callback/route.ts for
  // the full rationale. PKCE verifier lives in localStorage, so the
  // exchange has to run client-side. This non-localized callback
  // defaults to /en since the root route has no locale of its own;
  // the Capacitor sign-in flow always goes through the localized
  // callback in practice, so this is just belt-and-braces.
  const ua = request.headers.get('user-agent') ?? ''
  if (/GreenofigApp\//.test(ua)) {
    const dest = new URL('/en/auth/capacitor-complete', origin)
    dest.searchParams.set('code', code)
    return NextResponse.redirect(dest)
  }

  const supabase = getServerSupabase()
  if (!supabase) return fail('service_unavailable')

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return fail('auth_error')

  // First-time OAuth signup? Make sure they have a profile row. We never
  // overwrite an existing row's role/tier (ignoreDuplicates: true).
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

  // Caller-supplied destination (e.g. recovery emails pass ?next=/reset-password).
  if (next && next.startsWith('/')) {
    return NextResponse.redirect(new URL(next, origin))
  }

  // Otherwise route by role.
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

  return NextResponse.redirect(new URL(dest, origin))
}
