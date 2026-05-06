/* eslint-disable no-console */
/**
 * Reassign canonical roles for the two staff accounts:
 *   greenofig@gmail.com     → role=admin,        tier=vip, full_name=Greenofig Admin
 *   rawanothman21@gmail.com → role=nutritionist, tier=vip, full_name=Dr. Rawan Othman
 *
 * Idempotent. If either auth user is missing it gets created with
 * email_confirm:true so the recovery link can be used immediately.
 *
 * Usage:
 *   npm run fix:roles
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
const REDIRECT = `${APP_URL}/auth/callback?next=/reset-password`

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[fix:roles] Missing Supabase env in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface Spec {
  email: string
  role: 'admin' | 'nutritionist'
  fullName: string
  label: string
}

const SPECS: Spec[] = [
  {
    email: 'greenofig@gmail.com',
    role: 'admin',
    fullName: 'Greenofig Admin',
    label: 'Admin',
  },
  {
    email: 'rawanothman21@gmail.com',
    role: 'nutritionist',
    fullName: 'Dr. Rawan Othman',
    label: 'Nutritionist',
  },
]

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

async function provision(spec: Spec): Promise<string | null> {
  let userId = await findUserId(spec.email)

  if (!userId) {
    console.log(`  • ${spec.email.padEnd(34)} not found — creating…`)
    const { data, error } = await supabase.auth.admin.createUser({
      email: spec.email,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName },
    })
    if (error || !data.user) {
      console.error(
        `  ! createUser failed for ${spec.email}:`,
        error?.message,
      )
      return null
    }
    userId = data.user.id
    console.log(`  • ${spec.email.padEnd(34)} created`)
  } else {
    console.log(`  • ${spec.email.padEnd(34)} found`)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        role: spec.role,
        tier: 'vip',
        full_name: spec.fullName,
      },
      { onConflict: 'id' },
    )
  if (profileError) {
    console.error(
      `  ! profile upsert failed for ${spec.email}:`,
      profileError.message,
    )
    return null
  }

  console.log(`  • ${spec.email.padEnd(34)} → role=${spec.role}, tier=vip`)

  const { data: link, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: spec.email,
      options: { redirectTo: REDIRECT },
    })
  if (linkError) {
    console.error(`  ! generateLink failed for ${spec.email}:`, linkError.message)
    return null
  }
  return link.properties?.action_link ?? null
}

async function main() {
  console.log('[fix:roles] Reassigning staff roles…\n')

  const results: { spec: Spec; link: string | null }[] = []
  for (const spec of SPECS) {
    const link = await provision(spec)
    results.push({ spec, link })
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  for (const { spec } of results) {
    console.log(
      `✅  ${spec.email}  →  role: ${spec.role}, tier: vip`,
    )
  }

  console.log('\n🔑  Password reset links (one-time, ~1h TTL):')
  for (const { spec, link } of results) {
    console.log(`\n${spec.label}  (${spec.email})`)
    console.log(`  ${link ?? '— could not generate —'}`)
  }

  console.log('\nDone.')
}

main().catch((e) => {
  console.error('[fix:roles] Fatal:', e)
  process.exit(1)
})
