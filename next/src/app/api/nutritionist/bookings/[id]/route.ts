import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/bookings/[id]
 *
 * Manage a single appointment the coach owns — works for BOTH online
 * (client_id) and walk-in (clinic_client_id) bookings since they're the
 * same `bookings` row. The coach manages everything from her calendar.
 *
 *   PATCH  → reschedule (scheduled_at / duration_min), change type, edit
 *            notes, or set status (scheduled / completed / cancelled / noShow).
 *   DELETE → remove the appointment entirely.
 *
 * Ownership: the booking's nutritionist_id must equal the caller (admins
 * bypass). Service role is used for the writes; we enforce ownership here.
 */

const VALID_STATUS = ['scheduled', 'completed', 'cancelled', 'noShow'] as const
const VALID_TYPE = ['introCall', 'followUp', 'deepDive', 'inClinicVisit'] as const

async function loadOwned(
  service: NonNullable<ReturnType<typeof getServiceSupabase>>,
  id: string,
  ctx: AuthedContext,
) {
  const { data } = await service
    .from('bookings')
    .select('id, nutritionist_id, client_id, clinic_client_id')
    .eq('id', id)
    .maybeSingle()
  const b = data as
    | { id: string; nutritionist_id: string | null; client_id: string | null; clinic_client_id: string | null }
    | null
  if (!b) return { booking: null as typeof b, allowed: false }
  const allowed = ctx.profile.role === 'admin' || b.nutritionist_id === ctx.userId
  return { booking: b, allowed }
}

export const PATCH = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: {
      scheduled_at?: string
      duration_min?: number
      type?: string
      notes?: string
      status?: string
    }
    try {
      body = (await req.json()) as typeof body
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const { booking, allowed } = await loadOwned(service, params.id, ctx)
    if (!booking) return notFound('Appointment not found.')
    if (!allowed) return forbidden('This is not your appointment.')

    const update: Record<string, unknown> = {}
    if (typeof body.scheduled_at === 'string') {
      const d = new Date(body.scheduled_at)
      if (Number.isNaN(d.getTime())) return badRequest('Invalid date/time.')
      update.scheduled_at = d.toISOString()
    }
    if (body.duration_min != null) {
      const n = Number(body.duration_min)
      if (!Number.isFinite(n) || n < 5 || n > 480) return badRequest('Duration must be 5–480 minutes.')
      update.duration_min = Math.round(n)
    }
    if (typeof body.type === 'string') {
      if (!(VALID_TYPE as readonly string[]).includes(body.type)) return badRequest('Invalid type.')
      update.type = body.type
    }
    if (body.notes !== undefined) {
      update.notes = typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null
    }
    if (typeof body.status === 'string') {
      if (!(VALID_STATUS as readonly string[]).includes(body.status)) return badRequest('Invalid status.')
      update.status = body.status
    }
    if (Object.keys(update).length === 0) return badRequest('Nothing to update.')

    const { error } = await service.from('bookings').update(update as never).eq('id', booking.id)
    if (error) {
      // Postgres exclusion-constraint violation = overlapping booking.
      if ((error as { code?: string }).code === '23P01' || /overlap|exclu/i.test(error.message)) {
        return badRequest('That time overlaps another appointment. Pick a different slot.')
      }
      return badRequest(error.message)
    }
    return json({ ok: true })
  },
)

export const DELETE = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const { booking, allowed } = await loadOwned(service, params.id, ctx)
    if (!booking) return notFound('Appointment not found.')
    if (!allowed) return forbidden('This is not your appointment.')

    const { error } = await service.from('bookings').delete().eq('id', booking.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)
