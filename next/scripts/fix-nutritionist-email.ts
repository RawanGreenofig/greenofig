/* eslint-disable no-console */
/**
 * Migrate the nutritionist account from the wrong email to the correct one:
 *   rawanothman21@gmail.com  →  othmanrawan21@gmail.com
 *
 * If the wrong email exists: update its auth user record to the new email.
 * If the new email exists already: skip the rename and just reassert role.
 * If neither exists: create the new auth user from scratch.
 *
 * Either way, ends with:
 *   - profiles.role = nutritionist, tier = vip, full_name = Dr. Rawan Othman
 *   - a fresh single-use password recovery link printed to stdout
 *
 * Usage:
 *   npm run fix:nutritionist-email
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
const OLD_EMAIL = 'rawanothman21@gmail.com'
const NEW_EMAIL = 'othmanrawan21@gmail.com'
const REDIRECT = `${APP_URL}/auth/callback?next=/reset-password`

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[fix:nutritionist-email] Missing Supabase env in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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
  console.log('[fix:nutritionist-email] Starting…\n')

  const oldId = await findUserId(OLD_EMAIL)
  const newId = await findUserId(NEW_EMAIL)

  let userId: string

  if (newId) {
    // The correct email already exists — keep it. If the old one ALSO
    // exists, leave it alone (we don't want to silently delete an auth
    // record); just log it.
    if (oldId) {
      console.log(
        `  • Both addresses exist. Keeping ${NEW_EMAIL} (${newId}); the\n    old ${OLD_EMAIL} (${oldId}) record is left in place — delete\n    via the Supabase dashboard if you don't need it.`,
      )
    } else {
      console.log(`  • ${NEW_EMAIL} found (${newId})`)
    }
    userId = newId
  } else if (oldId) {
    // The wrong email exists, the correct one doesn't — rename in place.
    const { error } = await supabase.auth.admin.updateUserById(oldId, {
      email: NEW_EMAIL,
    })
    if (error) {
      console.error('  ! updateUserById failed:', error.message)
      process.exit(1)
    }
    console.log(`  • Renamed: ${OLD_EMAIL}  →  ${NEW_EMAIL}`)
    userId = oldId
  } else {
    // Neither exists — create the correct one from scratch.
    const { data, error } = await supabase.auth.admin.createUser({
      email: NEW_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: 'Dr. Rawan Othman' },
    })
    if (error || !data.user) {
      console.error('  ! createUser failed:', error?.message)
      process.exit(1)
    }
    userId = data.user.id
    console.log(`  • Created ${NEW_EMAIL} (${userId})`)
  }

  // Reassert the canonical profile row.
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
  console.log(`  • profiles → role=nutritionist, tier=vip`)

  // Fresh single-use recovery link.
  const { data: link, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: NEW_EMAIL,
      options: { redirectTo: REDIRECT },
    })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('SUMMARY')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅  ${NEW_EMAIL}  →  role: nutritionist, tier: vip`)
  if (linkError) {
    console.log(
      `\n⚠️   generateLink error: ${linkError.message}`,
    )
  } else if (link?.properties?.action_link) {
    console.log('\n🔑  Password reset link (one-time, ~1h TTL):')
    console.log(`    ${link.properties.action_link}`)
  }
}

main().catch((e) => {
  console.error('[fix:nutritionist-email] Fatal:', e)
  process.exit(1)
})
