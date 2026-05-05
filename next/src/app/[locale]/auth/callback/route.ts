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
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const locale = request.nextUrl.pathname.split('/')[1] || 'en'

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/${locale}/sign-in?error=${reason}`, origin))

  if (!code) return fail('no_code')

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
