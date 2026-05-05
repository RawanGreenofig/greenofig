import Stripe from 'stripe'

/**
 * Singleton Stripe client. Returns null when STRIPE_SECRET_KEY is missing
 * so route handlers can return 503 instead of crashing during build or
 * in unconfigured environments.
 *
 * Pin the API version explicitly — Stripe rolls breaking versions on
 * their schedule and we want builds to be deterministic.
 */

let cached: Stripe | null | undefined

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    cached = null
    return null
  }
  cached = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
  })
  return cached
}

export const isStripeConfigured = () => !!process.env.STRIPE_SECRET_KEY

/**
 * Stripe Price IDs per tier, set as env vars in production:
 *   STRIPE_PRICE_BASIC_MONTHLY, STRIPE_PRICE_BASIC_YEARLY, etc.
 *
 * Falls back to empty strings during dev — checkout calls will fail
 * with a clear error instead of leaking the wrong customer to billing.
 */
export const STRIPE_PRICES: Record<
  'basic' | 'premium' | 'vip',
  { monthly: string; yearly: string }
> = {
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY ?? '',
    yearly:  process.env.STRIPE_PRICE_BASIC_YEARLY  ?? '',
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '',
    yearly:  process.env.STRIPE_PRICE_PREMIUM_YEARLY  ?? '',
  },
  vip: {
    monthly: process.env.STRIPE_PRICE_VIP_MONTHLY ?? '',
    yearly:  process.env.STRIPE_PRICE_VIP_YEARLY  ?? '',
  },
}
