import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/** DELETE /api/nutritionist/clinic-assessments/[id] — remove one check-in. */
export const DELETE = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data } = await service
      .from('clinic_assessments')
      .select('id, coach_id')
      .eq('id', params.id)
      .maybeSingle()
    const row = data as { id: string; coach_id: string } | null
    if (!row) return notFound('Check-in not found.')
    if (ctx.profile.role !== 'admin' && row.coach_id !== ctx.userId) return forbidden()

    const { error } = await service.from('clinic_assessments').delete().eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)
