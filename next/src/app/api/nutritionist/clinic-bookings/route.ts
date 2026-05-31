import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/nutritionist/clinic-bookings
 *
 * Coach books an in-clinic visit on behalf of one of their walk-in
 * clients. Mirrors the online /api/bookings/create route but writes
 * `clinic_client_id` instead of `user_id`. The XOR check constraint
 * on bookings keeps the two universes from leaking into one row.
 *
 * Body:
 *   {
 *     clinic_client_id: uuid,
 *     scheduled_at: ISO datetime,
 *     duration_minutes?: number,   // default 30
 *     type?: string,                // e.g. 'inClinicVisit'
 *     notes?: string,
 *     payment_method?: 'cash'|'card'|'transfer'|'online'|'other',
 *     is_paid?: boolean,
 *     amount_paid_cents?: number,
 *   }
 */

interface Body {
  clinic_client_id?: string
  scheduled_at?: string
  duration_minutes?: number
  type?: string
  notes?: string
  payment_method?: 'cash' | 'card' | 'transfer' | 'online' | 'other'
  is_paid?: boolean
  amount_paid_cents?: number
}

const ALLOWED_METHODS = new Set([
  'cash',
  'card',
  'transfer',
  'online',
  'other',
])

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }

    if (!body.clinic_client_id) return badRequest('clinic_client_id is required.')
    if (!body.scheduled_at) return badRequest('scheduled_at is required.')
    const scheduled = new Date(body.scheduled_at)
    if (Number.isNaN(scheduled.getTime())) {
      return badRequest('scheduled_at must be a valid datetime.')
    }
    const duration = body.duration_minutes ?? 30
    if (
      typeof duration !== 'number' ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 480
    ) {
      return badRequest('duration_minutes must be 1..480.')
    }
    if (
      body.payment_method !== undefined &&
      !ALLOWED_METHODS.has(body.payment_method)
    ) {
      return badRequest('Invalid payment_method.')
    }
    if (
      body.amount_paid_cents !== undefined &&
      (typeof body.amount_paid_cents !== 'number' ||
        !Number.isFinite(body.amount_paid_cents) ||
        body.amount_paid_cents < 0)
    ) {
      return badRequest('amount_paid_cents must be >= 0.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Confirm the coach owns this clinic_client. Admins can write for
    // anyone — that's how the head coach reschedules an employee's
    // booking.
    const { data: ccRow } = await service
      .from('clinic_clients')
      .select('coach_id')
      .eq('id', body.clinic_client_id)
      .maybeSingle()
    const cc = ccRow as { coach_id: string } | null
    if (!cc) return notFound('Clinic client not found.')
    if (cc.coach_id !== ctx.userId && ctx.profile.role !== 'admin') {
      return notFound('Clinic client not found.')
    }

    const { data, error } = await service
      .from('bookings')
      .insert({
        client_id: null,
        clinic_client_id: body.clinic_client_id,
        nutritionist_id: cc.coach_id,
        scheduled_at: scheduled.toISOString(),
        duration_min: duration,
        status: 'scheduled',
        type: body.type ?? 'inClinicVisit',
        notes: body.notes?.trim() || null,
        payment_method: body.payment_method ?? null,
        is_paid: !!body.is_paid,
        amount_paid_cents:
          body.amount_paid_cents !== undefined
            ? Math.round(body.amount_paid_cents)
            : null,
      } as never)
      .select('id')
      .maybeSingle()
    if (error) {
      // Overlap exclusion constraint → clean 409 so the UI shows the
      // "slot taken" toast instead of a raw Postgres error.
      if ((error as { code?: string }).code === '23P01' || /overlap|exclu/i.test(error.message)) {
        return json({ error: 'slot_taken' }, 409)
      }
      return badRequest(error.message)
    }
    return json({ id: (data as { id?: string } | null)?.id })
  },
)
