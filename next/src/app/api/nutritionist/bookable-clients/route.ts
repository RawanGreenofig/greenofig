import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/nutritionist/bookable-clients
 *
 * The clients the coach can book a session for — both online (profiles,
 * role='user') and walk-in (clinic_clients). Served via the service role
 * so the New Session picker doesn't depend on browser-side RLS or a
 * possibly-missing is_head_coach flag on the client profile. The head
 * coach (and admin) see everyone; an employee coach sees only clients
 * assigned/owned by them.
 */
export const GET = withNutritionistOrAdmin(
  async (_req: NextRequest, ctx: AuthedContext) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const seesAll = ctx.profile.role === 'admin' || ctx.profile.is_head_coach === true

    let onlineQ = service
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'user')
      .order('full_name', { ascending: true })
      .limit(500)
    if (!seesAll) onlineQ = onlineQ.eq('assigned_coach_id', ctx.userId)

    let walkQ = service
      .from('clinic_clients')
      .select('id, full_name')
      .order('full_name', { ascending: true })
      .limit(500)
    if (ctx.profile.role !== 'admin') walkQ = walkQ.eq('coach_id', ctx.userId)

    const [{ data: online }, { data: walkIns }] = await Promise.all([onlineQ, walkQ])

    return json({
      online: (online as { id: string; full_name: string | null }[] | null) ?? [],
      walkIns: (walkIns as { id: string; full_name: string }[] | null) ?? [],
    })
  },
)
