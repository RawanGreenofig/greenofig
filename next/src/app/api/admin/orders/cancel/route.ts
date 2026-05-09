import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/admin/orders/cancel
 *
 * Admin-only. Cancels a pending or processing order — flips status to
 * 'cancelled' and (best-effort) cancels the underlying Stripe payment
 * intent if it hasn't captured yet. Already-shipped or delivered
 * orders should be refunded, not cancelled — this route 409s in that
 * case.
 *
 * Body: { orderId: string }
 *
 * Errors:
 *   401 — caller not authed (withAuth)
 *   403 — caller not admin
 *   404 — order not found
 *   409 — order already cancelled / refunded / shipped / delivered
 *   503 — Supabase / Stripe env missing
 *   500 — unexpected
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: { orderId?: string }
  try {
    body = (await req.json()) as { orderId?: string }
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const orderId = body.orderId
  if (!orderId || !/^[0-9a-f-]{32,}$/i.test(orderId)) {
    return badRequest('orderId is required.')
  }

  type OrderRow = {
    id: string
    status: string
    stripe_payment_intent_id: string | null
    user_id: string
  }
  const { data: orderRow } = await service
    .from('orders')
    .select('id, status, stripe_payment_intent_id, user_id')
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as OrderRow | null
  if (!order) return notFound('Order not found.')

  if (order.status === 'cancelled') {
    return json(
      { error: { code: 'already_cancelled', message: 'Order already cancelled.' } },
      409,
    )
  }
  if (order.status === 'refunded') {
    return json(
      { error: { code: 'already_refunded', message: 'Order already refunded — cancel not applicable.' } },
      409,
    )
  }
  if (order.status === 'shipped' || order.status === 'delivered') {
    return json(
      {
        error: {
          code: 'already_fulfilled',
          message: `Order is ${order.status}. Refund instead of cancelling.`,
        },
      },
      409,
    )
  }

  // Best-effort: cancel the Stripe payment intent. Only works on
  // intents that haven't captured. Failure is non-fatal — we still
  // mark the local order cancelled and the admin can refund manually
  // from the Stripe dashboard if a charge already settled.
  if (isStripeConfigured() && order.stripe_payment_intent_id) {
    const stripe = getStripe()
    if (stripe) {
      try {
        await stripe.paymentIntents.cancel(order.stripe_payment_intent_id)
      } catch (err) {
        console.warn('[admin/orders/cancel] PI already captured or cancel failed:', err)
      }
    }
  }

  const { error: updErr } = await service
    .from('orders')
    .update({ status: 'cancelled' } as never)
    .eq('id', orderId)
  if (updErr) {
    console.error('[admin/orders/cancel] db update failed:', updErr)
    return internalError()
  }

  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'order_cancelled',
    resource_type: 'order',
    resource_id: orderId,
    new_value: { status: 'cancelled' },
  } as never)

  await service.from('notifications').insert({
    user_id: order.user_id,
    type: 'order',
    title: 'Order cancelled',
    body: 'Your order was cancelled. If you were charged, the funds will return to your card automatically.',
    data: { orderId },
    is_read: false,
  } as never)

  return json({ ok: true })
})
