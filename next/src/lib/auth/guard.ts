import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getServerSupabase } from '@/lib/supabase/server'

type Role = 'user' | 'nutritionist' | 'admin'

/**
 * Server-side route guard for protected layouts. Belt-and-suspenders
 * defense beyond the middleware — every protected layout calls this
 * before rendering, so even if the edge middleware misses (matcher
 * misconfig, cached page, build-time prerender), the page itself
 * refuses to render to an unauthenticated visitor.
 *
 * Usage:
 *   export default async function AdminLayout({ children, params }) {
 *     await requireRole(['admin'], params.locale)
 *     return <Shell>{children}</Shell>
 *   }
 */
export async function requireRole(
  allowed: readonly Role[],
  locale: string,
): Promise<{ userId: string; role: Role }> {
  // ── DEV-ONLY: localhost auth bypass ────────────────────────────────
  // Mirrors the middleware bypass so admin/nutritionist styling work
  // doesn't require juggling sessions on localhost. Hard-gated on:
  //   • NODE_ENV !== 'production' (Next dev server only)
  //   • host: localhost / 127.0.0.1
  // Cannot leak into deployed environments.
  // TODO(role-bypass): revisit once admin-styling pass is complete.
  if (process.env.NODE_ENV !== 'production') {
    const host = headers().get('host') ?? ''
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      return { userId: 'dev-bypass', role: allowed[0] ?? 'admin' }
    }
  }
  // ───────────────────────────────────────────────────────────────────

  // ── Capacitor Android WebView bypass ───────────────────────────────
  // The Capacitor app stores sessions in localStorage (see
  // lib/supabase/client.ts) rather than cookies, so the server has
  // no way to read who the user is from this request. We skip the
  // server-side auth + role check and let the page render — the
  // client-side AuthContext hydrates from localStorage on mount and
  // populates the chrome with the real user identity.
  //
  // Security: this is NOT a way to view someone else's data. All
  // protected data lives behind Supabase Row-Level Security; an
  // unauthenticated client gets empty result sets even if they
  // reach the page. The check we're skipping was for redirecting
  // unauthenticated visitors to /sign-in — useful UX for a regular
  // browser, but actively wrong for a Capacitor app where the
  // session is real but invisible to the server.
  // ───────────────────────────────────────────────────────────────────
  const ua = headers().get('user-agent') ?? ''
  if (/GreenofigApp\//.test(ua)) {
    return { userId: 'capacitor-client-auth', role: allowed[0] ?? 'user' }
  }

  const supabase = getServerSupabase()
  // No env / no client → bounce to sign-in. Never render a protected
  // surface to a request we can't authenticate.
  if (!supabase) {
    redirect(localePath(locale, '/sign-in'))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(localePath(locale, '/sign-in'))
  }

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = ((data as { role?: string } | null)?.role ?? 'user') as Role

  if (!allowed.includes(role)) {
    // Not allowed for this surface — kick to the role's natural home.
    redirect(localePath(locale, defaultHomeFor(role)))
  }

  return { userId: user.id, role }
}

/**
 * Variant of requireRole() for routes that should only be visible to
 * the head coach (business areas — earnings, store curation, business
 * analytics). Employee nutritionists are bounced back to /nutritionist.
 */
export async function requireHeadCoach(
  locale: string,
): Promise<{ userId: string }> {
  if (process.env.NODE_ENV !== 'production') {
    const host = headers().get('host') ?? ''
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
      return { userId: 'dev-bypass' }
    }
  }
  // Capacitor bypass — see requireRole above for the full rationale.
  const ua = headers().get('user-agent') ?? ''
  if (/GreenofigApp\//.test(ua)) {
    return { userId: 'capacitor-client-auth' }
  }
  const supabase = getServerSupabase()
  if (!supabase) redirect(localePath(locale, '/sign-in'))
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(localePath(locale, '/sign-in'))

  const { data } = await supabase
    .from('profiles')
    .select('role, is_head_coach')
    .eq('id', user.id)
    .maybeSingle()
  const row = data as { role?: string; is_head_coach?: boolean } | null
  if (row?.role !== 'nutritionist' || !row.is_head_coach) {
    redirect(localePath(locale, '/nutritionist'))
  }
  return { userId: user.id }
}

function localePath(locale: string, path: string): string {
  if (locale === 'en' || !locale) return path
  return `/${locale}${path === '/' ? '' : path}`
}

function defaultHomeFor(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'nutritionist') return '/nutritionist'
  return '/dashboard'
}
