/* eslint-disable no-console */
/**
 * Promote greenofig@gmail.com to role=nutritionist, tier=vip.
 *
 * Idempotent — safe to re-run. If the user doesn't exist yet, this
 * creates them, sets the profile, and emits a password-recovery link.
 *
 * Usage:
 *   npm run set:nutritionist
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://greenofig.com'
const TARGET_EMAIL = 'greenofig@gmail.com'
const REDIRECT = `${APP_URL}/auth/callback?next=/reset-password`

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[set:nutritionist] Missing Supabase env in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserId(): Promise<string | null> {
  for (let page = 1; page < 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const hit = data.users.find(
      (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
    )
    if (hit) return hit.id
    if (data.users.length < 200) return null
  }
  return null
}

async function emitResetLink(): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: TARGET_EMAIL,
    options: { redirectTo: REDIRECT },
  })
  if (error) {
    console.error('[set:nutritionist] generateLink error:', error.message)
    return null
  }
  return data.properties?.action_link ?? null
}

async function main() {
  console.log(`[set:nutritionist] Targeting ${TARGET_EMAIL}\n`)

  let userId = await findUserId()

  if (!userId) {
    console.log('  • User not found — creating…')
    const { data, error } = await supabase.auth.admin.createUser({
      email: TARGET_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: 'Dr. Rawan Othman' },
    })
    if (error || !data.user) {
      console.error('  ! createUser failed:', error?.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log(`  • Created auth user: ${userId}`)
  } else {
    console.log(`  • Found existing auth user: ${userId}`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        role: 'nutritionist',
        tier: 'vip',
        full_name: 'Dr. Rawan Othman',
      },
      { onConflict: 'id' },
    )

  if (profileError) {
    console.error('  ! profile upsert failed:', profileError.message)
    process.exit(1)
  }

  console.log('  • profiles.role = nutritionist, tier = vip')

  const link = await emitResetLink()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅  ${TARGET_EMAIL}  →  role: nutritionist, tier: vip`)
  if (link) {
    console.log('\n🔑  Password reset link (one-time, ~1h TTL):')
    console.log(`    ${link}`)
  } else {
    console.log(
      '\n⚠️   Password reset link could not be generated — see error above.',
    )
  }
}

main().catch((e) => {
  console.error('[set:nutritionist] Fatal:', e)
  process.exit(1)
})
