import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * PATCH /api/bookings/[id]/payment
 *
 * Coach marks a booking as paid (and how). Used mostly for in-clinic
 * visits where the client paid cash or via in-person card terminal,
 * but also lets the coach record a manual online transfer for any
 * booking that didn't flow through Stripe.
 *
 * Body:
 *   {
 *     is_paid?: boolean,
 *     payment_method?: 'cash' | 'card' | 'transfer' | 'online' | 'other',
 *     amount_paid_cents?: number,
 *   }
 *
 * Only the assigned nutritionist on the booking (or an admin) may
 * update payment status — we don't want clients self-marking paid.
 */

interface Body {
  is_paid?: boolean
  payment_method?: 'cash' | 'card' | 'transfer' | 'online' | 'other'
  amount_paid_cents?: number
}

const ALLOWED_METHODS = new Set([
  'cash',
  'card',
  'transfer',
  'online',
  'other',
])

export const PATCH = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
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

    // Confirm the caller is the booking's coach (or admin). Admins
    // pass the check via the role gate; coaches must match.
    const { data: row } = await service
      .from('bookings')
      .select('id, nutritionist_id')
      .eq('id', params.id)
      .maybeSingle()
    const r = row as { id: string; nutritionist_id: string | null } | null
    if (!r) return notFound('Booking not found.')
    if (r.nutritionist_id !== ctx.userId && ctx.profile.role !== 'admin') {
      return notFound('Booking not found.')
    }

    const patch: Record<string, unknown> = {}
    if (body.is_paid !== undefined) patch.is_paid = !!body.is_paid
    if (body.payment_method !== undefined)
      patch.payment_method = body.payment_method
    if (body.amount_paid_cents !== undefined) {
      patch.amount_paid_cents = Math.round(body.amount_paid_cents)
    }
    if (Object.keys(patch).length === 0) return json({ ok: true })

    const { error } = await service
      .from('bookings')
      .update(patch as never)
      .eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)
