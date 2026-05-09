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
 * POST /api/admin/orders/refund
 *
 * Admin-only. Issues a Stripe refund for the supplied order's payment
 * intent and flips the local order row to status='refunded'. Returns
 * the refund id so the UI can confirm.
 *
 * Body: { orderId: string }
 *
 * Errors:
 *   401 — caller not authed (withAuth)
 *   403 — caller not admin
 *   404 — order not found / has no payment intent
 *   409 — order already refunded
 *   503 — Stripe / Supabase env missing
 *   500 — Stripe API or DB write failed
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') {
    return forbidden('Admin only.')
  }
  if (!isStripeConfigured()) return serviceUnavailable('Stripe')
  const stripe = getStripe()
  if (!stripe) return serviceUnavailable('Stripe')

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
    total_cents: number | null
  }
  const { data: orderRow } = await service
    .from('orders')
    .select('id, status, stripe_payment_intent_id, user_id, total_cents')
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as OrderRow | null
  if (!order) return notFound('Order not found.')
  if (order.status === 'refunded') {
    return json({ error: { code: 'already_refunded', message: 'Order already refunded.' } }, 409)
  }
  if (!order.stripe_payment_intent_id) {
    return notFound('Order has no Stripe payment intent — refund manually.')
  }

  let refundId: string
  try {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      reason: 'requested_by_customer',
      metadata: {
        orderId: order.id,
        actorUserId: ctx.userId,
      },
    })
    refundId = refund.id
  } catch (err) {
    console.error('[admin/orders/refund] stripe error:', err)
    return internalError()
  }

  const { error: updateErr } = await service
    .from('orders')
    .update({ status: 'refunded' } as never)
    .eq('id', orderId)
  if (updateErr) {
    console.error('[admin/orders/refund] db update failed:', updateErr)
    return internalError()
  }

  // Audit trail
  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'order_refunded',
    resource_type: 'order',
    resource_id: orderId,
    new_value: { refundId, totalCents: order.total_cents ?? 0 },
  } as never)

  // Notify the customer
  await service.from('notifications').insert({
    user_id: order.user_id,
    type: 'order',
    title: 'Order refunded',
    body: 'Your order has been refunded. Funds will return to your card in 5-10 business days.',
    data: { orderId, refundId },
    is_read: false,
  } as never)

  return json({ ok: true, refundId })
})
