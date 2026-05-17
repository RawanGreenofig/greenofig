import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getStripe } from '@/lib/stripe'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/stripe/subscription-detail
 *
 * Returns the real Stripe-side info the dashboard Settings →
 * Subscription tab needs to render — renew date, payment method
 * (brand + last4 + expiry), and recent invoices. Replaces the
 * hardcoded "Visa ··· 4242 · exp 04/28" + INV-20480/422/371 mocks
 * + renewISO='2026-06-03' that used to live in the settings page.
 *
 * Returns null fields when the user has no active subscription or
 * Stripe isn't configured — the UI hides those blocks and points
 * at the billing portal instead of inventing data.
 *
 * Response:
 * ```
 * {
 *   renewsAt: ISO string | null,
 *   paymentMethod: { brand, last4, expMonth, expYear } | null,
 *   invoices: [{ id, number, date, amount, currency, status, url }],
 * }
 * ```
 */

export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const stripe = getStripe()
  if (!stripe) {
    return json({ renewsAt: null, paymentMethod: null, invoices: [] })
  }
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: subRow } = await service
    .from('subscriptions')
    .select('stripe_subscription_id, stripe_customer_id, status')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subInfo = subRow as
    | {
        stripe_subscription_id: string | null
        stripe_customer_id: string | null
        status: string | null
      }
    | null
  if (!subInfo?.stripe_customer_id) {
    return json({ renewsAt: null, paymentMethod: null, invoices: [] })
  }

  let renewsAt: string | null = null
  if (subInfo.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        subInfo.stripe_subscription_id,
      )
      const period = sub.items.data[0]?.current_period_end
      if (typeof period === 'number') {
        renewsAt = new Date(period * 1000).toISOString()
      }
    } catch {
      /* Subscription may have been cancelled — leave renewsAt null */
    }
  }

  // Default payment method — Stripe stores it on the customer's
  // invoice_settings. Falls through to listing payment methods if
  // there's no default set.
  let paymentMethod: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  } | null = null
  try {
    const customer = await stripe.customers.retrieve(
      subInfo.stripe_customer_id,
    )
    if (!('deleted' in customer) || !customer.deleted) {
      const c = customer as import('stripe').Stripe.Customer
      const dpm = c.invoice_settings?.default_payment_method
      const defaultPmId: string | null =
        typeof dpm === 'string' ? dpm : dpm?.id ?? null
      if (defaultPmId) {
        const pm = await stripe.paymentMethods.retrieve(defaultPmId)
        if (pm.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        }
      }
    }
  } catch {
    /* leave null */
  }

  // Last few invoices.
  const invoices: Array<{
    id: string
    number: string | null
    date: string
    amount: number
    currency: string
    status: string | null
    url: string | null
  }> = []
  try {
    const list = await stripe.invoices.list({
      customer: subInfo.stripe_customer_id,
      limit: 5,
    })
    for (const inv of list.data) {
      invoices.push({
        id: inv.id ?? '',
        number: inv.number,
        date: new Date(inv.created * 1000).toISOString(),
        amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
        currency: (inv.currency ?? 'usd').toUpperCase(),
        status: inv.status,
        url: inv.hosted_invoice_url ?? null,
      })
    }
  } catch {
    /* leave empty */
  }

  return json({ renewsAt, paymentMethod, invoices })
})
