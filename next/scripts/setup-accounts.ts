/* eslint-disable no-console */
/**
 * Greenofig — provision the canonical set of accounts in Supabase.
 *
 * Usage:
 *   npm run setup:accounts
 *   (or: npx tsx scripts/setup-accounts.ts)
 *
 * Creates / reconciles:
 *   - greenofig@gmail.com           role=admin         (password reset link emitted)
 *   - rawanothman21@gmail.com       role=nutritionist  (password reset link emitted)
 *   - demo.free@greenofig.com       role=user, tier=free      pwd=GreenDemo2025!
 *   - demo.basic@greenofig.com      role=user, tier=basic     pwd=GreenDemo2025!
 *   - demo.premium@greenofig.com    role=user, tier=premium   pwd=GreenDemo2025!
 *   - demo.vip@greenofig.com        role=user, tier=vip       pwd=GreenDemo2025!
 *
 * Idempotent — safe to re-run. If a user already exists, this script just
 * reconciles role/tier in `public.profiles` instead of failing.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://greenofig.com'
const RECOVERY_REDIRECT = `${APP_URL}/auth/callback`

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[setup:accounts] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Role = 'admin' | 'nutritionist' | 'user'
type Tier = 'free' | 'basic' | 'premium' | 'vip'

interface Spec {
  email: string
  role: Role
  tier: Tier
  fullName: string
  password?: string // when set, the account uses email+password directly
  resetLink?: boolean // when true, emit a recovery link
}

const SPECS: Spec[] = [
  {
    email: 'greenofig@gmail.com',
    role: 'admin',
    tier: 'vip',
    fullName: 'Greenofig Admin',
    resetLink: true,
  },
  {
    email: 'rawanothman21@gmail.com',
    role: 'nutritionist',
    tier: 'vip',
    fullName: 'Dr. Rawan Othman',
    resetLink: true,
  },
  {
    email: 'demo.free@greenofig.com',
    role: 'user',
    tier: 'free',
    fullName: 'Demo Free',
    password: 'GreenDemo2025!',
  },
  {
    email: 'demo.basic@greenofig.com',
    role: 'user',
    tier: 'basic',
    fullName: 'Demo Basic',
    password: 'GreenDemo2025!',
  },
  {
    email: 'demo.premium@greenofig.com',
    role: 'user',
    tier: 'premium',
    fullName: 'Demo Premium',
    password: 'GreenDemo2025!',
  },
  {
    email: 'demo.vip@greenofig.com',
    role: 'user',
    tier: 'vip',
    fullName: 'Demo VIP',
    password: 'GreenDemo2025!',
  },
]

interface Result {
  email: string
  role: Role
  tier: Tier
  password?: string
  resetLink?: string
  status: 'created' | 'updated' | 'error'
  error?: string
}

async function findUserByEmail(
  client: SupabaseClient,
  email: string,
): Promise<{ id: string } | null> {
  // listUsers paginates; for a small fleet of fixtures, page 1 with a generous
  // perPage is sufficient (Supabase default cap is 1000).
  let page = 1
  while (page < 20) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const hit = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (hit) return { id: hit.id }
    if (data.users.length < 200) return null
    page++
  }
  return null
}

async function provision(spec: Spec): Promise<Result> {
  const result: Result = {
    email: spec.email,
    role: spec.role,
    tier: spec.tier,
    password: spec.password,
    status: 'updated',
  }

  try {
    let userId: string

    const existing = await findUserByEmail(admin, spec.email)
    if (existing) {
      userId = existing.id
      // Ensure password matches when one is specified, and email is confirmed.
      if (spec.password) {
        await admin.auth.admin.updateUserById(userId, {
          password: spec.password,
          email_confirm: true,
          user_metadata: { full_name: spec.fullName },
        })
      } else {
        await admin.auth.admin.updateUserById(userId, {
          email_confirm: true,
          user_metadata: { full_name: spec.fullName },
        })
      }
      result.status = 'updated'
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: spec.email,
        password: spec.password ?? cryptoRandomPassword(),
        email_confirm: true,
        user_metadata: { full_name: spec.fullName },
      })
      if (error || !data.user) throw error ?? new Error('createUser failed')
      userId = data.user.id
      result.status = 'created'
    }

    // Upsert profile row with the canonical role/tier.
    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: userId,
          role: spec.role,
          tier: spec.tier,
          full_name: spec.fullName,
        },
        { onConflict: 'id' },
      )
    if (profileError) throw profileError

    // Reset link for non-password accounts. redirectTo lands the user on
    // the production site after they pick a new password.
    if (spec.resetLink) {
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: spec.email,
        options: { redirectTo: RECOVERY_REDIRECT },
      })
      if (error) throw error
      result.resetLink = data.properties?.action_link
    }
  } catch (e) {
    result.status = 'error'
    result.error = e instanceof Error ? e.message : String(e)
  }

  return result
}

function cryptoRandomPassword() {
  // 24 url-safe chars — used as a placeholder for accounts that will reset
  // their own password via the recovery link.
  return Array.from({ length: 24 }, () =>
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'.charAt(
      Math.floor(Math.random() * 64),
    ),
  ).join('')
}

async function main() {
  console.log('[setup:accounts] Provisioning Greenofig fixtures…\n')

  const results: Result[] = []
  for (const spec of SPECS) {
    process.stdout.write(`  • ${spec.email.padEnd(34)} `)
    const r = await provision(spec)
    results.push(r)
    if (r.status === 'error') {
      console.log(`ERROR — ${r.error}`)
    } else {
      console.log(`${r.status} — role=${r.role} tier=${r.tier}`)
    }
  }

  // Summary table
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY — Greenofig accounts')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const rows = results.map((r) => ({
    email: r.email,
    role: r.role,
    tier: r.tier,
    password: r.password ?? '(reset link)',
    status: r.status,
  }))
  console.table(rows)

  console.log('\n🔑  PASSWORD RESET LINKS')
  console.log('────────────────────────')
  for (const r of results) {
    if (r.resetLink) {
      console.log(`  ${r.email}`)
      console.log(`  → ${r.resetLink}\n`)
    }
  }

  // OAuth setup notes
  console.log('🛠  ACTION REQUIRED — Google OAuth (manual, one-time)')
  console.log('────────────────────────────────────────────────────')
  console.log('  1. supabase.com → project → Authentication → Providers → enable Google')
  console.log('  2. console.cloud.google.com → APIs & Services → Credentials → create OAuth 2.0 Client')
  console.log(`  3. Add Authorized redirect URI: ${SUPABASE_URL}/auth/v1/callback`)
  console.log('  4. Copy Client ID + Secret into the Supabase Google provider')
  console.log('  5. Authentication → URL Configuration:')
  console.log(`       Site URL:      ${APP_URL}`)
  console.log(`       Redirect URLs: ${APP_URL}/**`)
  console.log(`                      ${APP_URL}/auth/callback`)
  console.log(`                      ${APP_URL}/en/auth/callback`)
  console.log(`                      ${APP_URL}/ar/auth/callback`)

  const errored = results.filter((r) => r.status === 'error')
  if (errored.length) {
    console.log(`\n⚠️  ${errored.length} account(s) had errors — see above.`)
    process.exit(1)
  }
  console.log('\n✅  All accounts provisioned successfully.')
}

main().catch((e) => {
  console.error('[setup:accounts] Unhandled error:', e)
  process.exit(1)
})
