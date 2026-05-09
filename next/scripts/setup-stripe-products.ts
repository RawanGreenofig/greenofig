/* eslint-disable no-console */
/**
 * Create Greenofig subscription products + prices in Stripe.
 *
 * Usage: npm run setup:stripe
 *
 * Reads STRIPE_SECRET_KEY from .env.local. Creates one product per tier
 * (Basic / Premium / VIP) with two prices each (monthly + yearly).
 *
 * Currency: USD.
 * The yearly price total = (monthly_per_month * 12) so Stripe shows the
 * full annual charge while the marketing copy quotes the per-month cost.
 *
 * Idempotent: safe to re-run. Looks up existing products by metadata.tier
 * before creating, so you won't end up with duplicate products.
 *
 * Env var names printed for .env.local match src/lib/stripe.ts:
 *   STRIPE_PRICE_BASIC_MONTHLY / STRIPE_PRICE_BASIC_YEARLY
 *   STRIPE_PRICE_PREMIUM_MONTHLY / STRIPE_PRICE_PREMIUM_YEARLY
 *   STRIPE_PRICE_VIP_MONTHLY / STRIPE_PRICE_VIP_YEARLY
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import Stripe from 'stripe'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SECRET = process.env.STRIPE_SECRET_KEY
if (!SECRET) {
  console.error(
    '[setup:stripe] STRIPE_SECRET_KEY missing in .env.local. Add your Stripe secret key (sk_test_... or sk_live_...) and re-run.',
  )
  process.exit(1)
}

const stripe = new Stripe(SECRET, { apiVersion: '2026-04-22.dahlia' })

interface PlanSpec {
  tier: 'basic' | 'premium' | 'vip'
  name: string
  description: string
  /** Monthly per-month cost in cents (1 USD = 100 cents). */
  monthlyMinor: number
  /** Yearly per-month cost in cents (multiplied by 12 for the annual charge). */
  yearlyPerMonthMinor: number
}

const PLANS: PlanSpec[] = [
  {
    tier: 'basic',
    name: 'Greenofig Basic',
    description: 'Unlimited food scanning, daily nutrition tracking, full recipe library, and store discounts.',
    monthlyMinor: 1499,        // $14.99
    yearlyPerMonthMinor: 999,  // $9.99/mo billed yearly = $119.88/year
  },
  {
    tier: 'premium',
    name: 'Greenofig Premium',
    description: 'Custom meal plans, AI nutrition assistant, advanced analytics, and direct messaging with Dr. Rawan.',
    monthlyMinor: 2999,        // $29.99
    yearlyPerMonthMinor: 1999, // $19.99/mo billed yearly = $239.88/year
  },
  {
    tier: 'vip',
    name: 'Greenofig VIP',
    description: 'Everything in Premium + monthly consultation, fastest AI response, and exclusive products.',
    monthlyMinor: 5999,        // $59.99
    yearlyPerMonthMinor: 3999, // $39.99/mo billed yearly = $479.88/year
  },
]

async function findOrCreateProduct(plan: PlanSpec): Promise<Stripe.Product> {
  // Search by metadata.tier so we don't create duplicates
  const existing = await stripe.products.search({
    query: `metadata['greenofig_tier']:'${plan.tier}'`,
    limit: 1,
  })
  if (existing.data.length > 0) {
    console.log(`  ↻ found existing product for ${plan.tier}: ${existing.data[0].id}`)
    return existing.data[0]
  }
  const created = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { greenofig_tier: plan.tier },
  })
  console.log(`  + created product ${plan.name}: ${created.id}`)
  return created
}

async function findOrCreatePrice(
  productId: string,
  tier: PlanSpec['tier'],
  cycle: 'monthly' | 'yearly',
  unitAmount: number,
): Promise<Stripe.Price> {
  // Search by metadata
  const existing = await stripe.prices.search({
    query: `product:'${productId}' AND metadata['greenofig_tier']:'${tier}' AND metadata['greenofig_cycle']:'${cycle}'`,
    limit: 1,
  })
  if (existing.data.length > 0 && existing.data[0].active) {
    console.log(`    ↻ existing ${cycle} price: ${existing.data[0].id} (${existing.data[0].unit_amount} ${existing.data[0].currency})`)
    return existing.data[0]
  }
  const created = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: { interval: cycle === 'monthly' ? 'month' : 'year' },
    metadata: {
      greenofig_tier: tier,
      greenofig_cycle: cycle,
    },
  })
  console.log(`    + created ${cycle} price: ${created.id} (${created.unit_amount} ${created.currency})`)
  return created
}

async function main() {
  console.log('[setup:stripe] Creating Greenofig subscription products + prices in Stripe…')
  console.log(`[setup:stripe] Using key starting with: ${SECRET!.slice(0, 12)}…`)
  console.log('')

  const out: Record<string, string> = {}

  for (const plan of PLANS) {
    console.log(`▸ ${plan.name}`)
    const product = await findOrCreateProduct(plan)
    const monthly = await findOrCreatePrice(product.id, plan.tier, 'monthly', plan.monthlyMinor)
    const yearly = await findOrCreatePrice(product.id, plan.tier, 'yearly', plan.yearlyPerMonthMinor * 12)
    out[`STRIPE_PRICE_${plan.tier.toUpperCase()}_MONTHLY`] = monthly.id
    out[`STRIPE_PRICE_${plan.tier.toUpperCase()}_YEARLY`] = yearly.id
    console.log('')
  }

  console.log('[setup:stripe] ✓ Done. Add these to next/.env.local:')
  console.log('')
  console.log('# ━━━ Stripe price IDs (from npm run setup:stripe) ━━━')
  for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`)
  console.log('')
  console.log('Also add these to your Vercel project: Settings → Environment Variables.')
}

main().catch((err) => {
  console.error('[setup:stripe] ✗ Failed:', err.message ?? err)
  process.exit(1)
})
