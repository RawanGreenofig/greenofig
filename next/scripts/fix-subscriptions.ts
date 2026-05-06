/* eslint-disable no-console */
/**
 * Backfill the `profiles.tier` column for users who paid via Stripe before
 * the webhook reliably mirrored the upgrade.
 *
 * Walks recent successful Stripe checkout sessions, resolves each session's
 * tier (metadata → line-item price id), looks up the user via the session
 * email (auth.users.email → profiles.id), and updates `profiles.tier`.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npm run fix:subscriptions
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * STRIPE_SECRET_KEY, STRIPE_PRICE_* from .env.local.
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[fix:subscriptions] Missing Supabase env in .env.local')
  process.exit(1)
}
if (!STRIPE_KEY) {
  console.error('[fix:subscriptions] Missing STRIPE_SECRET_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: '2026-04-22.dahlia',
})

type Tier = 'free' | 'basic' | 'premium' | 'vip'

const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_BASIC_MONTHLY ?? '']:   'basic',
  [process.env.STRIPE_PRICE_BASIC_YEARLY ?? '']:    'basic',
  [process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? '']: 'premium',
  [process.env.STRIPE_PRICE_PREMIUM_YEARLY ?? '']:  'premium',
  [process.env.STRIPE_PRICE_VIP_MONTHLY ?? '']:     'vip',
  [process.env.STRIPE_PRICE_VIP_YEARLY ?? '']:      'vip',
}

async function resolveUserIdByEmail(
  client: SupabaseClient,
  email: string,
): Promise<string | null> {
  const lower = email.toLowerCase()
  for (let page = 1; page < 10; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) return null
    const hit = data.users.find((u) => u.email?.toLowerCase() === lower)
    if (hit) return hit.id
    if (data.users.length < 200) return null
  }
  return null
}

async function tierFromSession(
  session: Stripe.Checkout.Session,
): Promise<Tier> {
  const metaTier = session.metadata?.tier as Tier | undefined
  if (metaTier && metaTier !== 'free') return metaTier
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 5,
    })
    for (const item of items.data) {
      const id = item.price?.id
      if (id && PRICE_TO_TIER[id]) return PRICE_TO_TIER[id]
    }
  } catch {
    /* fall through */
  }
  return 'basic'
}

async function main() {
  console.log('[fix:subscriptions] Walking recent Stripe sessions…\n')

  const sessions = await stripe.checkout.sessions.list({
    limit: 50,
    status: 'complete',
  })

  let fixed = 0
  let skipped = 0
  let errored = 0

  for (const session of sessions.data) {
    const email =
      session.customer_email ?? session.customer_details?.email ?? null
    if (!email) {
      skipped++
      continue
    }

    // Subscription sessions only — orders / bookings have their own tables.
    if (
      session.mode !== 'subscription' &&
      session.metadata?.kind !== 'subscription'
    ) {
      skipped++
      continue
    }

    const tier = await tierFromSession(session)
    const userId =
      session.metadata?.userId ??
      (await resolveUserIdByEmail(supabase, email))

    if (!userId) {
      console.log(`  • ${email.padEnd(34)} no matching user — skipped`)
      skipped++
      continue
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tier })
      .eq('id', userId)

    if (error) {
      console.log(`  • ${email.padEnd(34)} ERROR: ${error.message}`)
      errored++
      continue
    }

    console.log(`  • ${email.padEnd(34)} → ${tier}`)
    fixed++
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Fixed:   ${fixed}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errored: ${errored}`)
  if (errored > 0) process.exit(1)
}

main().catch((e) => {
  console.error('[fix:subscriptions] Fatal:', e)
  process.exit(1)
})
