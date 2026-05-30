import type { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/supabase/types'
import { forbidden, serviceUnavailable, unauthorized } from './response'

export interface AuthedContext {
  userId: string
  email: string
  profile: Profile
}

/** Handler return type — accepts both NextResponse (json helpers) and
 *  plain Response (streaming routes). */
type HandlerResult = Response | Promise<Response>

/**
 * Wraps a route handler with auth. Resolves the current Supabase user,
 * loads their profile (`role` + `tier`), enforces an optional role gate,
 * and passes a typed `AuthedContext` to the handler.
 *
 * Returns 401 when no session, 403 when role doesn't match, 503 when
 * Supabase env isn't configured.
 *
 * Usage:
 * ```ts
 * export const POST = withAuth(async (req, ctx) => {
 *   // ctx.userId, ctx.profile.tier, ctx.profile.role available
 *   return json({ ok: true })
 * }, { role: ['admin'] })
 * ```
 */
export function withAuth<TParams extends Record<string, string> = Record<string, string>>(
  handler: (
    req: NextRequest,
    ctx: AuthedContext,
    routeCtx: { params: TParams },
  ) => HandlerResult,
  opts?: { role?: UserRole[]; allow?: (profile: Profile) => boolean },
) {
  return async (
    req: NextRequest,
    routeCtx: { params: TParams },
  ): Promise<Response> => {
    const supabase = getServerSupabase()
    if (!supabase) return serviceUnavailable('Supabase')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return unauthorized()

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const profile = profileRow as Profile | null
    if (!profile) return unauthorized()

    if (opts?.role && !opts.role.includes(profile.role)) {
      return forbidden()
    }
    if (opts?.allow && !opts.allow(profile)) {
      return forbidden()
    }

    const ctx: AuthedContext = {
      userId: user.id,
      email: user.email ?? '',
      profile,
    }
    return handler(req, ctx, routeCtx)
  }
}

/** Shorthand: just verify there's a session, no role restriction. */
export const withSignedIn = withAuth

/** Shorthand: nutritionist or admin only. */
export const withNutritionistOrAdmin = <P extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, ctx: AuthedContext, routeCtx: { params: P }) => HandlerResult,
) => withAuth<P>(handler, { role: ['nutritionist', 'admin'] })

/** Shorthand: admin only. */
export const withAdmin = <P extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, ctx: AuthedContext, routeCtx: { params: P }) => HandlerResult,
) => withAuth<P>(handler, { role: ['admin'] })

/**
 * Shorthand: admin OR the head coach (owner-coach). Employee nutritionists
 * are rejected. Used for owner-level business areas like careers/job postings.
 */
export const withHeadCoachOrAdmin = <P extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, ctx: AuthedContext, routeCtx: { params: P }) => HandlerResult,
) =>
  withAuth<P>(handler, {
    role: ['nutritionist', 'admin'],
    allow: (p) => p.role === 'admin' || p.is_head_coach === true,
  })
