import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { getServiceSupabase } from '@/lib/supabase/service'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import type { Tier } from '@/lib/constants'

/**
 * POST /api/stripe/webhook
 *
 * Stripe events. Configure the URL `https://<your-host>/api/stripe/webhook`
 * in the Stripe dashboard with these events enabled:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.paid
 *   - invoice.payment_failed
 *   - payment_intent.succeeded
 *
 * Auth: Stripe signature only — no Supabase session. This must run
 * BEFORE any auth middleware (Next 14's route handlers do this naturally
 * because middleware doesn't apply to /api/* by default).
 */

// Stripe sends the body as raw bytes — Next 14's route handlers preserve
// this when we read with `req.text()`. Don't `req.json()` here or the
// signature won't verify.
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) return serviceUnavailable('Stripe')
  const stripe = getStripe()
  if (!stripe) return serviceUnavailable('Stripe')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return serviceUnavailable('Stripe webhook secret')

  const signature = req.headers.get('stripe-signature')
  if (!signature) return badRequest('Missing stripe-signature.')

  const rawBody = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return badRequest('Invalid signature.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, service)
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpsert(sub, service)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub, service)
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice, service)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(invoice, service)
        break
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        await handlePaymentIntentSucceeded(pi, service)
        break
      }
      default:
        // Unknown event types are acknowledged with 200 so Stripe doesn't retry.
        break
    }
  } catch {
    // Returning 500 makes Stripe retry. Better than silently dropping a
    // subscription update. Log it server-side in production.
    return internalError()
  }

  return json({ received: true })
}

/* ── Handlers ───────────────────────────────────────────────────── */

type ServiceClient = NonNullable<ReturnType<typeof getServiceSupabase>>

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  service: ServiceClient,
) {
  const meta = session.metadata ?? {}
  const userId = meta.userId
  if (!userId) return

  // Subscriptions: fully resolved via the customer.subscription.* events;
  // we just need to make sure the customer id is on file. Also mirror the
  // tier to profiles immediately so the user sees the upgrade as soon as
  // they land back on the app — without waiting for customer.subscription.*
  // to land seconds later.
  if (meta.kind === 'subscription' && session.customer) {
    const tier = (meta.tier as Tier) ?? 'free'
    await service
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier,
        stripe_customer_id:
          typeof session.customer === 'string' ? session.customer : session.customer.id,
        status: 'active',
      } as never, { onConflict: 'user_id' })

    await service
      .from('profiles')
      .update({ tier } as never)
      .eq('id', userId)
  }

  if (meta.kind === 'order') {
    const items: { productId: string; qty: number }[] = (() => {
      try {
        return JSON.parse(meta.itemsJson ?? '[]')
      } catch {
        return []
      }
    })()

    // Hydrate product prices server-side for the canonical totals
    const productIds = items.map((i) => i.productId)
    const { data: products } = await service
      .from('products')
      .select('id, price_jod')
      .in('id', productIds)
    type Row = { id: string; price_jod: number }
    const rows = (products as Row[] | null) ?? []

    const subtotal = items.reduce((acc, it) => {
      const p = rows.find((r) => r.id === it.productId)
      return acc + (p?.price_jod ?? 0) * it.qty
    }, 0)

    const { data: orderRow } = await service
      .from('orders')
      .insert({
        user_id: userId,
        status: 'processing',
        subtotal_jod: subtotal,
        discount_jod: 0,
        shipping_jod: 0,
        total_jod: (session.amount_total ?? subtotal * 1000) / 1000,
      } as never)
      .select('id')
      .maybeSingle()

    const orderId = (orderRow as { id?: string } | null)?.id
    if (orderId) {
      await service.from('order_items').insert(
        items.map((it) => {
          const p = rows.find((r) => r.id === it.productId)
          return {
            order_id: orderId,
            product_id: it.productId,
            qty: it.qty,
            unit_price_jod: p?.price_jod ?? 0,
          }
        }) as never,
      )
    }
  }

  if (meta.kind === 'booking' && meta.bookingId) {
    // Mark the booking as paid by setting a meeting URL placeholder; the
    // booking UI keys "join-able" off `meeting_url`. Cluster I generates the
    // real meeting URL via Calendly/Daily integration.
    await service
      .from('bookings')
      .update({
        meeting_url: `https://meet.greenofig.com/${meta.bookingId}`,
      } as never)
      .eq('id', meta.bookingId)
  }
}

async function handleSubscriptionUpsert(
  sub: Stripe.Subscription,
  service: ServiceClient,
) {
  const userId = sub.metadata?.userId
  if (!userId) return

  const tier = (sub.metadata?.tier as Tier) ?? 'basic'

  await service
    .from('subscriptions')
    .upsert({
      user_id: userId,
      tier,
      stripe_subscription_id: sub.id,
      stripe_customer_id:
        typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      status: sub.status,
      // In API 2024-12-18 the period timestamps live on the subscription
      // item, not the subscription itself.
      current_period_start: subPeriodStart(sub),
      current_period_end:   subPeriodEnd(sub),
      cancel_at_period_end: sub.cancel_at_period_end,
    } as never, { onConflict: 'stripe_subscription_id' })

  // Mirror the active tier onto profiles so the rest of the app doesn't
  // have to JOIN to subscriptions on every request.
  if (sub.status === 'active' || sub.status === 'trialing') {
    await service
      .from('profiles')
      .update({ tier } as never)
      .eq('id', userId)
  }
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  service: ServiceClient,
) {
  const userId = sub.metadata?.userId
  if (!userId) return

  await service
    .from('subscriptions')
    .update({ status: 'canceled', cancel_at_period_end: false } as never)
    .eq('stripe_subscription_id', sub.id)

  // Drop the user back to free at period end. Stripe's
  // `customer.subscription.deleted` fires AFTER the period ends, so this
  // is correct timing.
  await service
    .from('profiles')
    .update({ tier: 'free' } as never)
    .eq('id', userId)
}

async function handleInvoicePaid(invoice: Stripe.Invoice, service: ServiceClient) {
  void invoice
  void service
  // Subscription renewals — already covered by customer.subscription.updated.
  // For one-off invoices (e.g. paid bookings billed via invoice instead of
  // checkout), persist a notification so the client sees it on Today.
}

async function handleInvoiceFailed(invoice: Stripe.Invoice, service: ServiceClient) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId) return

  // Find the user via stripe_customer_id
  const { data: subRow } = await service
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1)
    .maybeSingle()
  const userId = (subRow as { user_id: string } | null)?.user_id
  if (!userId) return

  // Drop them a notification — Today page will surface it
  await service.from('notifications').insert({
    user_id: userId,
    title: 'Payment failed',
    body: 'We couldn\'t charge your card. Update payment in Settings → Subscription.',
    category: 'billing',
    href: '/dashboard/settings',
    read: false,
  } as never)
}

async function handlePaymentIntentSucceeded(
  pi: Stripe.PaymentIntent,
  service: ServiceClient,
) {
  void pi
  void service
  // Currently a no-op — checkout.session.completed already records orders.
  // Reserved for future flows (e.g. saved-card off-session charges for
  // recurring product top-ups).
}

/** Period timestamps moved off the subscription onto the line item in
 *  API version 2024-12-18. Read defensively to support both shapes. */
function subPeriodStart(sub: Stripe.Subscription): string {
  const item = sub.items?.data?.[0] as { current_period_start?: number } | undefined
  const ts = item?.current_period_start ?? (sub as unknown as { current_period_start?: number }).current_period_start
  return ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()
}
function subPeriodEnd(sub: Stripe.Subscription): string {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined
  const ts = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end
  return ts ? new Date(ts * 1000).toISOString() : new Date().toISOString()
}
