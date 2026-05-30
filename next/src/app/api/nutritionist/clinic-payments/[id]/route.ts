import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-payments/[id]
 *
 * PATCH  → edit a payment: amount_cents, currency, due_date, method,
 *          notes, or status. Flipping to 'paid' stamps paid_at; back to
 *          'due' clears it and re-arms the due notification.
 * DELETE → remove the payment row.
 *
 * Coach can only touch payments they own; admin can touch any.
 */

const METHODS = ['cash', 'card', 'transfer', 'online', 'other']

interface PatchBody {
  amount_cents?: number
  currency?: string
  due_date?: string | null
  method?: string | null
  status?: 'due' | 'paid'
  notes?: string | null
}

async function loadOwned(
  service: NonNullable<ReturnType<typeof getServiceSupabase>>,
  ctx: AuthedContext,
  id: string,
) {
  const { data } = await service
    .from('clinic_payments')
    .select('id, coach_id, status')
    .eq('id', id)
    .maybeSingle()
  const row = data as { id: string; coach_id: string; status: string } | null
  if (!row) return { row: null as null, forbidden: false }
  if (ctx.profile.role !== 'admin' && row.coach_id !== ctx.userId) {
    return { row: null as null, forbidden: true }
  }
  return { row, forbidden: false }
}

export const PATCH = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: PatchBody
    try {
      body = (await req.json()) as PatchBody
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { row, forbidden: notOwned } = await loadOwned(service, ctx, params.id)
    if (notOwned) return forbidden()
    if (!row) return notFound('Payment not found.')

    const patch: Record<string, unknown> = {}
    if (body.amount_cents != null) {
      const a = Number(body.amount_cents)
      if (!Number.isFinite(a) || a < 0) return badRequest('amount_cents must be a non-negative number.')
      patch.amount_cents = Math.round(a)
    }
    if (body.currency != null) patch.currency = body.currency.trim().slice(0, 8) || 'USD'
    if (body.due_date !== undefined) patch.due_date = body.due_date || null
    if (body.method !== undefined) {
      patch.method = body.method && METHODS.includes(body.method) ? body.method : null
    }
    if (body.notes !== undefined) patch.notes = body.notes?.trim() || null
    if (body.status === 'paid' || body.status === 'due') {
      patch.status = body.status
      if (body.status === 'paid') {
        patch.paid_at = new Date().toISOString()
      } else {
        // Re-opened: clear the paid stamp and re-arm the due reminder.
        patch.paid_at = null
        patch.due_notified_at = null
      }
    }

    if (Object.keys(patch).length === 0) return badRequest('Nothing to update.')

    const { error } = await service
      .from('clinic_payments')
      .update(patch as never)
      .eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)

export const DELETE = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { row, forbidden: notOwned } = await loadOwned(service, ctx, params.id)
    if (notOwned) return forbidden()
    if (!row) return notFound('Payment not found.')

    const { error } = await service.from('clinic_payments').delete().eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)
