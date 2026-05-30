import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/** DELETE /api/nutritionist/clinic-client-log/[id] — remove one log entry. */
export const DELETE = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data } = await service
      .from('clinic_client_log')
      .select('id, coach_id')
      .eq('id', params.id)
      .maybeSingle()
    const row = data as { id: string; coach_id: string } | null
    if (!row) return notFound('Entry not found.')
    if (ctx.profile.role !== 'admin' && row.coach_id !== ctx.userId) return forbidden()

    const { error } = await service.from('clinic_client_log').delete().eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)
