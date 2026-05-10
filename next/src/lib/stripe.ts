import Stripe from 'stripe'
import { getServiceSupabase } from '@/lib/supabase/service'

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
 * Stripe Price IDs per tier. Lookup order:
 *   1. process.env override (legacy / prod safety)
 *   2. platform_settings rows (`stripe_price_<tier>_<cycle>`)
 *   3. USD_DEFAULTS hardcoded fallback
 *
 * The /admin/pricing UI updates the platform_settings rows; that flows
 * through here on the next checkout without a redeploy.
 */
type Cycle = 'monthly' | 'yearly'
type Tier = 'basic' | 'premium' | 'vip'

const USD_DEFAULTS: Record<Tier, Record<Cycle, string>> = {
  basic:   { monthly: 'price_1TVKfh2OHDHL9Mv9EEODgruh', yearly: 'price_1TVKfk2OHDHL9Mv9OITv4FK3' },
  premium: { monthly: 'price_1TVKfn2OHDHL9Mv99p9FfkUM', yearly: 'price_1TVKfq2OHDHL9Mv9I3377K4g' },
  vip:     { monthly: 'price_1TVKft2OHDHL9Mv9UcFoLzlf', yearly: 'price_1TVKfw2OHDHL9Mv9TDTW8Cip' },
}

const ENV_KEYS: Record<Tier, Record<Cycle, string>> = {
  basic:   { monthly: 'STRIPE_PRICE_BASIC_MONTHLY',   yearly: 'STRIPE_PRICE_BASIC_YEARLY' },
  premium: { monthly: 'STRIPE_PRICE_PREMIUM_MONTHLY', yearly: 'STRIPE_PRICE_PREMIUM_YEARLY' },
  vip:     { monthly: 'STRIPE_PRICE_VIP_MONTHLY',     yearly: 'STRIPE_PRICE_VIP_YEARLY' },
}

const settingKey = (tier: Tier, cycle: Cycle): string =>
  `stripe_price_${tier}_${cycle === 'monthly' ? 'monthly' : 'yearly'}`

export async function getStripePrice(tier: Tier, cycle: Cycle): Promise<string> {
  const envValue = process.env[ENV_KEYS[tier][cycle]]
  if (envValue) return envValue

  const service = getServiceSupabase()
  if (service) {
    const { data } = await service
      .from('platform_settings')
      .select('value')
      .eq('key', settingKey(tier, cycle))
      .maybeSingle()
    const raw = (data as { value?: unknown } | null)?.value
    if (typeof raw === 'string' && raw.trim().length > 0) return raw
  }

  return USD_DEFAULTS[tier][cycle]
}

/**
 * Synchronous accessor that returns env var or the hardcoded default.
 * Used by code paths that can't async (e.g. shared constants). Prefer
 * `getStripePrice` for routes that touch Supabase anyway.
 */
export function getStripePriceSync(tier: Tier, cycle: Cycle): string {
  return process.env[ENV_KEYS[tier][cycle]] ?? USD_DEFAULTS[tier][cycle]
}

/**
 * Backwards-compat shape for callers that don't yet `await`. Reads env
 * vars + falls back to defaults — does NOT consult platform_settings.
 * Migrate call sites to `getStripePrice` when they touch DB anyway.
 */
export const STRIPE_PRICES: Record<Tier, Record<Cycle, string>> = {
  basic:   { monthly: getStripePriceSync('basic', 'monthly'),   yearly: getStripePriceSync('basic', 'yearly') },
  premium: { monthly: getStripePriceSync('premium', 'monthly'), yearly: getStripePriceSync('premium', 'yearly') },
  vip:     { monthly: getStripePriceSync('vip', 'monthly'),     yearly: getStripePriceSync('vip', 'yearly') },
}
