import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { getMiddlewareSupabase } from '@/lib/supabase/middleware'

/**
 * Combined middleware:
 *   1. next-intl resolves the locale and may emit a redirect (adds /ar
 *      prefix when needed, redirects "/" appropriately, etc.).
 *   2. Once the locale is settled, gate role-protected routes.
 *
 * Auth check is skipped when Supabase env vars aren't set so the public
 * pages keep working in unconfigured environments.
 */
const intlMiddleware = createIntlMiddleware(routing)

// Each role gets exactly one workspace — no cross-role access. A
// nutritionist who navigates to /dashboard (the user-side personal
// tracker) is bounced to /nutritionist; an admin to /admin. Avoids
// the "why am I seeing a VIP user dashboard while signed in as a
// nutritionist" confusion.
const PROTECTED = [
  { prefix: '/dashboard',     allowed: ['user'] },
  { prefix: '/nutritionist',  allowed: ['nutritionist'] },
  { prefix: '/admin',         allowed: ['admin'] },
  { prefix: '/onboarding',    allowed: ['user', 'nutritionist', 'admin'] },
] as const

type Allowed = (typeof PROTECTED)[number]['allowed'][number]

/** Strip the `/ar` (or other) locale prefix and return the rest. */
function stripLocale(pathname: string): { locale: string; rest: string } {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) continue
    if (pathname === `/${locale}`) return { locale, rest: '/' }
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, rest: pathname.slice(`/${locale}`.length) }
    }
  }
  return { locale: routing.defaultLocale, rest: pathname }
}

function localePath(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path
  return `/${locale}${path === '/' ? '' : path}`
}

export async function middleware(request: NextRequest) {
  // ── Step 1: locale routing ─────────────────────────────────────────
  const intlResponse = intlMiddleware(request)

  // If next-intl is redirecting (e.g. adding the `/ar` prefix), let it.
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse
  }

  // ── Step 2: auth gate on protected paths ───────────────────────────
  const { pathname } = request.nextUrl
  const { locale, rest } = stripLocale(pathname)

  const protectedRoute = PROTECTED.find((p) => rest.startsWith(p.prefix))
  if (!protectedRoute) return intlResponse

  // We need to return a response we can attach refreshed cookies to.
  // Use the intl response as the base.
  const response =
    intlResponse instanceof NextResponse ? intlResponse : NextResponse.next()

  const supabase = getMiddlewareSupabase(request, response)
  if (!supabase) {
    // Env missing: redirect any protected hit to sign-in so we never
    // accidentally render a protected screen unauthenticated.
    return NextResponse.redirect(
      new URL(localePath(locale, '/sign-in'), request.url),
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = new URL(localePath(locale, '/sign-in'), request.url)
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = ((profile as { role?: string } | null)?.role ?? 'user') as Allowed
  if (!(protectedRoute.allowed as readonly string[]).includes(role)) {
    // Send each role to its own home, not a generic /dashboard. A
    // nutritionist who hits /admin should land on /nutritionist (their
    // actual workspace), not on the user-side dashboard which is for
    // their personal nutrition tracking.
    const home: Record<Allowed, string> =
      {
        admin: '/admin',
        nutritionist: '/nutritionist',
        user: '/dashboard',
      }
    return NextResponse.redirect(
      new URL(localePath(locale, home[role] ?? '/dashboard'), request.url),
    )
  }

  return response
}

export const config = {
  // Skip i18n + auth gate on:
  //   /api/*       — Next.js API routes
  //   /_next/*     — framework chunks
  //   /_vercel/*   — Vercel runtime
  //   /auth/*      — non-localized OAuth / recovery callback (must NOT be
  //                  rewritten under /[locale]/, since Supabase only knows
  //                  the canonical `${APP_URL}/auth/callback`)
  //   anything with a dot — static files
  matcher: '/((?!api|_next|_vercel|auth|.*\\..*).*)',
}
