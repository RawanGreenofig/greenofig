import { redirect } from 'next/navigation'
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

function localePath(locale: string, path: string): string {
  if (locale === 'en' || !locale) return path
  return `/${locale}${path === '/' ? '' : path}`
}

function defaultHomeFor(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'nutritionist') return '/nutritionist'
  return '/dashboard'
}
