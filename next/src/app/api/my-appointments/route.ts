import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/my-appointments
 *
 * The signed-in (linked walk-in) client's clinic visits/appointments —
 * the same `bookings` rows the coach records against their clinic record.
 * Resolves their clinic_clients id(s) via user_id. Coach-private notes
 * (nutritionist_notes) are intentionally NOT exposed.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: ccs } = await service
    .from('clinic_clients')
    .select('id')
    .eq('user_id', ctx.userId)
  const ids = ((ccs as { id: string }[] | null) ?? []).map((r) => r.id)
  if (ids.length === 0) return json({ appointments: [] })

  const { data } = await service
    .from('bookings')
    .select('id, scheduled_at, duration_min, status, type, notes')
    .in('clinic_client_id', ids)
    .order('scheduled_at', { ascending: false })
    .limit(100)
  return json({ appointments: data ?? [] })
})
