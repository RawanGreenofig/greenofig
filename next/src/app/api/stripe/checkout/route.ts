import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import {
  STRIPE_PRICES,
  getStripe,
  isStripeConfigured,
} from '@/lib/stripe'
import { TIERS, type Tier } from '@/lib/constants'

/**
 * POST /api/stripe/checkout
 *
 * Body (one of):
 *   { kind: 'subscription', tier: 'basic'|'premium'|'vip', cycle: 'monthly'|'yearly' }
 *   { kind: 'order', items: [{ productId, qty }], couponCode?: string }
 *   { kind: 'booking', bookingId: string }
 *
 * Response: `{ url: string }` — Stripe-hosted checkout page.
 */

interface CheckoutBody {
  kind: 'subscription' | 'order' | 'booking'
  tier?: 'basic' | 'premium' | 'vip'
  cycle?: 'monthly' | 'yearly'
  items?: { productId: string; qty: number }[]
  couponCode?: string
  bookingId?: string
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (!isStripeConfigured()) return serviceUnavailable('Stripe')
  const stripe = getStripe()
  if (!stripe) return serviceUnavailable('Stripe')

  let body: CheckoutBody
  try {
    body = (await req.json()) as CheckoutBody
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  // Resolve or create the Stripe customer for this user.
  const stripeCustomerId = await resolveStripeCustomer(ctx)
  if (!stripeCustomerId) return internalError()

  const baseUrl = req.nextUrl.origin

  try {
    if (body.kind === 'subscription') {
      const tier = body.tier
      const cycle = body.cycle ?? 'monthly'
      if (!tier || !TIERS.includes(tier as Tier)) {
        return badRequest('tier is required.')
      }
      const priceId = STRIPE_PRICES[tier][cycle]
      if (!priceId) return badRequest(`No Stripe price configured for ${tier}/${cycle}.`)

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${baseUrl}/dashboard/settings?upgrade=success&tier=${tier}`,
        cancel_url:  `${baseUrl}/pricing?upgrade=cancelled`,
        metadata: {
          userId: ctx.userId,
          kind: 'subscription',
          tier,
          cycle,
        },
        subscription_data: {
          metadata: {
            userId: ctx.userId,
            tier,
          },
        },
        allow_promotion_codes: true,
      })

      return json({ url: session.url })
    }

    if (body.kind === 'order') {
      const items = body.items ?? []
      if (items.length === 0) return badRequest('items is required.')

      // Hydrate prices from products table (authoritative — never trust client price)
      const productIds = items.map((i) => i.productId)
      const { data: products } = await supabase
        .from('products')
        .select('id, name, price_jod')
        .in('id', productIds)

      type ProductRow = { id: string; name: string; price_jod: number }
      const rows = (products as ProductRow[] | null) ?? []
      if (rows.length !== items.length) return badRequest('Product not found.')

      const lineItems: Array<{
        price_data: {
          currency: string
          unit_amount: number
          product_data: { name: string }
        }
        quantity: number
      }> = items.map((it) => {
        const p = rows.find((r) => r.id === it.productId)
        return {
          price_data: {
            currency: 'jod',
            unit_amount: Math.round((p?.price_jod ?? 0) * 1000), // JOD has 3 minor units
            product_data: { name: p?.name ?? 'Product' },
          },
          quantity: Math.max(1, it.qty),
        }
      })

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: stripeCustomerId,
        line_items: lineItems,
        success_url: `${baseUrl}/dashboard/orders?order=success`,
        cancel_url:  `${baseUrl}/dashboard/store?order=cancelled`,
        metadata: {
          userId: ctx.userId,
          kind: 'order',
          itemsJson: JSON.stringify(items).slice(0, 480),
          couponCode: body.couponCode ?? '',
        },
        allow_promotion_codes: true,
      })
      return json({ url: session.url })
    }

    if (body.kind === 'booking') {
      const bookingId = body.bookingId
      if (!bookingId) return badRequest('bookingId is required.')

      const { data: bookingRow } = await supabase
        .from('bookings')
        .select('id, type, duration_min, client_id')
        .eq('id', bookingId)
        .maybeSingle()
      const booking = bookingRow as
        | { id: string; type: string; duration_min: number; client_id: string }
        | null
      if (!booking || booking.client_id !== ctx.userId) {
        return badRequest('Booking not found.')
      }

      // Per-type pricing; in production this comes from platform_settings
      const priceJod =
        booking.type === 'introCall' ? 0 :
        booking.type === 'followUp'  ? 15 :
        booking.type === 'deepDive'  ? 35 : 0
      if (priceJod === 0) {
        return badRequest('This session is free — no payment required.')
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: 'jod',
              unit_amount: priceJod * 1000,
              product_data: { name: `${booking.type} session (${booking.duration_min} min)` },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/dashboard/bookings?booking=${bookingId}&paid=1`,
        cancel_url:  `${baseUrl}/dashboard/bookings?booking=${bookingId}&paid=0`,
        metadata: {
          userId: ctx.userId,
          kind: 'booking',
          bookingId,
        },
      })
      return json({ url: session.url })
    }

    return badRequest('Unknown kind.')
  } catch {
    return internalError()
  }
})

/**
 * Look up an existing Stripe customer for this user, or create one.
 * Stored on the most recent `subscriptions` row; if none exists yet, we
 * create a customer on Stripe and persist it via the service client
 * (subscriptions table is admin-write only).
 */
async function resolveStripeCustomer(ctx: AuthedContext): Promise<string | null> {
  const supabase = getServerSupabase()
  if (!supabase) return null

  const { data: existingRow } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const existing = (existingRow as { stripe_customer_id: string | null } | null)
  if (existing?.stripe_customer_id) return existing.stripe_customer_id

  const stripe = getStripe()
  if (!stripe) return null

  const customer = await stripe.customers.create({
    email: ctx.email,
    name: ctx.profile.full_name ?? undefined,
    metadata: { userId: ctx.userId },
  })

  // Use service client to write — RLS allows admin-only writes to subscriptions.
  const service = getServiceSupabase()
  if (service) {
    await service
      .from('subscriptions')
      .upsert({
        user_id: ctx.userId,
        tier: ctx.profile.tier,
        stripe_customer_id: customer.id,
        status: 'incomplete',
      } as never, { onConflict: 'user_id' })
  }

  return customer.id
}
