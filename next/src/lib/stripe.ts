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
 * The fallbacks below point at the demo's USD sandbox prices so the
 * checkout still works locally without env vars set. Production should
 * always set these env vars; if you rotate the prices in Stripe, update
 * Vercel before relying on these defaults.
 */
const USD_DEFAULTS = {
  basic:   { monthly: 'price_1TUwA22OHDHL9Mv9AFCo1J4e', yearly: 'price_1TUwAA2OHDHL9Mv9jN1zTSFx' },
  premium: { monthly: 'price_1TUwAI2OHDHL9Mv9qzVSRgIb', yearly: 'price_1TUwAT2OHDHL9Mv9iirB4qek' },
  vip:     { monthly: 'price_1TUwAa2OHDHL9Mv9FRxQEJR1', yearly: 'price_1TUwAi2OHDHL9Mv9J4Xff5yh' },
} as const

export const STRIPE_PRICES: Record<
  'basic' | 'premium' | 'vip',
  { monthly: string; yearly: string }
> = {
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY ?? USD_DEFAULTS.basic.monthly,
    yearly:  process.env.STRIPE_PRICE_BASIC_YEARLY  ?? USD_DEFAULTS.basic.yearly,
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? USD_DEFAULTS.premium.monthly,
    yearly:  process.env.STRIPE_PRICE_PREMIUM_YEARLY  ?? USD_DEFAULTS.premium.yearly,
  },
  vip: {
    monthly: process.env.STRIPE_PRICE_VIP_MONTHLY ?? USD_DEFAULTS.vip.monthly,
    yearly:  process.env.STRIPE_PRICE_VIP_YEARLY  ?? USD_DEFAULTS.vip.yearly,
  },
}
