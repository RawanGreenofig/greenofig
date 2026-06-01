import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { notifyUsers } from '@/lib/server/notify'
import { localDateTimeInTzToUtc } from '@/lib/timezone'

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
      date?: string
      time?: string
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
    // Reschedule: prefer {date,time} interpreted in the coach's timezone
    // (so it matches how the slot was created and how the calendar shows
    // it); fall back to a pre-computed scheduled_at.
    if (body.date && body.time) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !/^\d{2}:\d{2}$/.test(body.time)) {
        return badRequest('Invalid date/time.')
      }
      const { data: prof } = await service
        .from('profiles')
        .select('timezone')
        .eq('id', booking.nutritionist_id ?? '')
        .maybeSingle()
      const tz = (prof as { timezone: string | null } | null)?.timezone || 'Asia/Amman'
      try {
        update.scheduled_at = localDateTimeInTzToUtc(body.date, body.time, tz).toISOString()
      } catch {
        return badRequest('Could not interpret date/time in the coach timezone.')
      }
    } else if (typeof body.scheduled_at === 'string') {
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

    // Tell the client when their appointment moved or was cancelled.
    const cancelled = update.status === 'cancelled'
    const rescheduled = update.scheduled_at != null
    if (cancelled || rescheduled) {
      // Recipient: online booking → client_id is the user; walk-in → resolve
      // the clinic_clients.user_id (null if they never linked an account).
      let recipient = booking.client_id
      if (!recipient && booking.clinic_client_id) {
        const { data: cc } = await service
          .from('clinic_clients')
          .select('user_id')
          .eq('id', booking.clinic_client_id)
          .maybeSingle()
        recipient = (cc as { user_id: string | null } | null)?.user_id ?? null
      }
      if (recipient) {
        const when = update.scheduled_at
          ? new Date(update.scheduled_at as string).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
          : ''
        await notifyUsers({
          userIds: [recipient],
          title: cancelled ? 'Appointment cancelled' : 'Appointment rescheduled 📅',
          titleAr: cancelled ? 'تم إلغاء الموعد' : 'تم تغيير الموعد 📅',
          body: cancelled ? 'Your coach cancelled an appointment.' : `New time: ${when}.`,
          bodyAr: cancelled ? 'ألغت مدربتك أحد المواعيد.' : `الموعد الجديد: ${when}.`,
          type: 'system',
          url: '/dashboard/appointments',
        })
      }
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
