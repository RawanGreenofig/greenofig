import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/my-plan
 *
 * The signed-in (linked walk-in) client's assigned meal plans / recipes
 * from their coach, so they can see and check them off. Resolves the
 * caller's clinic_clients record(s) via user_id.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: ccs } = await service
    .from('clinic_clients')
    .select('id')
    .eq('user_id', ctx.userId)
  const ids = ((ccs as { id: string }[] | null) ?? []).map((r) => r.id)
  if (ids.length === 0) return json({ assignments: [] })

  const { data } = await service
    .from('clinic_assignments')
    .select('id, kind, title, details, link, status, due_date, completed_at, created_at')
    .in('clinic_client_id', ids)
    .order('created_at', { ascending: false })
    .limit(200)
  return json({ assignments: data ?? [] })
})
