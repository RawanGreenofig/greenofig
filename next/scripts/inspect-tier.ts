/* eslint-disable no-console */
/**
 * One-off diagnostic — print the current `profiles.tier` for one or
 * more emails. Useful for confirming whether a tier-flicker bug is in
 * the database (wrong stored value) or in the client-side fetch path
 * (correct stored value, wrong rendering).
 *
 * Usage:  npm run inspect:tier  [email1] [email2] ...
 *         (defaults to ahmed93sabah93@gmail.com when called with no args)
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[inspect:tier] Missing Supabase env in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const targets =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ['ahmed93sabah93@gmail.com']

async function findUserId(email: string): Promise<string | null> {
  const lower = email.toLowerCase()
  for (let page = 1; page < 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === lower)
    if (hit) return hit.id
    if (data.users.length < 200) return null
  }
  return null
}

async function main() {
  console.log('[inspect:tier] Looking up profiles…\n')

  for (const email of targets) {
    const userId = await findUserId(email)
    if (!userId) {
      console.log(`  • ${email.padEnd(34)} not found in auth.users`)
      continue
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, tier, role, updated_at')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.log(
        `  • ${email.padEnd(34)} no profile row — ${error?.message ?? '?'}`,
      )
      continue
    }

    type Row = {
      id: string
      full_name: string | null
      tier: string
      role: string
      updated_at: string | null
    }
    const row = data as Row
    console.log(`  • ${email}`)
    console.log(`      id:         ${row.id}`)
    console.log(`      full_name:  ${row.full_name ?? '(null)'}`)
    console.log(`      tier:       ${row.tier}`)
    console.log(`      role:       ${row.role}`)
    console.log(`      updated_at: ${row.updated_at ?? '(null)'}`)
    console.log()
  }

  // Bonus: pull the most recent subscriptions row for the same email(s)
  // so we can compare what Stripe wrote vs what profiles mirrors.
  for (const email of targets) {
    const userId = await findUserId(email)
    if (!userId) continue
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('tier, status, stripe_customer_id, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
    type SubRow = {
      tier: string
      status: string
      stripe_customer_id: string | null
      updated_at: string | null
    }
    const subRow = (subs as SubRow[] | null)?.[0]
    if (subRow) {
      console.log(`  → subscriptions for ${email}:`)
      console.log(`      tier:        ${subRow.tier}`)
      console.log(`      status:      ${subRow.status}`)
      console.log(`      customer:    ${subRow.stripe_customer_id ?? '(null)'}`)
      console.log(`      updated_at:  ${subRow.updated_at ?? '(null)'}`)
      console.log()
    }
  }
}

main().catch((e) => {
  console.error('[inspect:tier] Fatal:', e)
  process.exit(1)
})
