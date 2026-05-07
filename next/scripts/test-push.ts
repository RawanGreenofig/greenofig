/* eslint-disable no-console */
/**
 * Send a test web-push notification to a real subscription so we can
 * confirm the VAPID keys + service worker round-trip works.
 *
 * Usage:
 *   npm run test:push                     # picks the most recent sub
 *   npm run test:push -- ahmed@example    # picks the most recent sub
 *                                           for that user
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 * from .env.local. Idempotent — does NOT write anything to the DB.
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:greenofig@gmail.com'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[test:push] Missing Supabase env in .env.local')
  process.exit(1)
}
if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error(
    '[test:push] Missing VAPID env: NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY',
  )
  process.exit(1)
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserIdByEmail(email: string): Promise<string | null> {
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

interface SubRow {
  endpoint: string
  p256dh: string
  auth: string
  user_id: string
  created_at: string
}

async function main() {
  const targetEmail = process.argv[2]?.trim()

  let q = supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1)

  if (targetEmail) {
    const userId = await findUserIdByEmail(targetEmail)
    if (!userId) {
      console.log(`❌ User ${targetEmail} not found`)
      process.exit(1)
    }
    q = q.eq('user_id', userId)
  }

  const { data, error } = await q
  if (error) {
    console.error('[test:push] subscription lookup failed:', error.message)
    process.exit(1)
  }
  const sub = (data as SubRow[] | null)?.[0]
  if (!sub) {
    console.log('❌ No push subscriptions found in database.')
    console.log(
      '   Go to /dashboard/settings → Notifications and click "Enable',
      'Push Notifications" first, then re-run this script.',
    )
    process.exit(1)
  }

  console.log(
    `[test:push] Sending to user_id=${sub.user_id} (created ${sub.created_at})`,
  )

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify({
        title: '🥗 Greenofig test',
        body: 'If you can read this, push notifications are working.',
        url: '/dashboard',
      }),
    )
    console.log('✅ Push delivered. Check the device now.')
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    console.error(
      `❌ webpush.sendNotification failed (status=${status ?? 'n/a'}):`,
      (e as Error).message,
    )
    if (status === 410 || status === 404) {
      console.log(
        '   Subscription is dead. The /api/notifications/send route',
        'will GC these automatically; for the test, ask the user to',
        'click Enable again to refresh the subscription.',
      )
    }
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('[test:push] Fatal:', e)
  process.exit(1)
})
