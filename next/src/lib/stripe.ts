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
// 2026-05 pricing bump: monthly and annual rates each raised by $20 to
// reflect the nutritionist-coaching market range. Old prices have been
// archived in Stripe — existing subscribers stay on whatever price they
// signed up with until they switch plans.
//   basic:   $14.99/mo + $9.99 annual-per-mo  →  $34.99/mo + $29.99 annual-per-mo  ($359.88/yr)
//   premium: $29.99/mo + $19.99 annual-per-mo →  $49.99/mo + $39.99 annual-per-mo  ($479.88/yr)
//   vip:     $59.99/mo + $39.99 annual-per-mo →  $79.99/mo + $59.99 annual-per-mo  ($719.88/yr)
const USD_DEFAULTS = {
  basic:   { monthly: 'price_1TVKfh2OHDHL9Mv9EEODgruh', yearly: 'price_1TVKfk2OHDHL9Mv9OITv4FK3' },
  premium: { monthly: 'price_1TVKfn2OHDHL9Mv99p9FfkUM', yearly: 'price_1TVKfq2OHDHL9Mv9I3377K4g' },
  vip:     { monthly: 'price_1TVKft2OHDHL9Mv9UcFoLzlf', yearly: 'price_1TVKfw2OHDHL9Mv9TDTW8Cip' },
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
