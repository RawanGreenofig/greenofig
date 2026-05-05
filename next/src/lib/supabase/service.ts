import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from './env'
import type { Database } from './types'

/**
 * Service-role Supabase client — bypasses RLS. Use ONLY in server-side
 * code (route handlers, server actions, cron jobs) where the action is
 * either system-driven (Stripe webhooks, audit log writes) or has been
 * gated through `withAuth()`. Never expose this to a client.
 *
 * Returns null when env is missing so the rest of the app degrades
 * gracefully without throwing during static build.
 */
export function getServiceSupabase() {
  const env = getSupabaseEnv()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!env || !serviceKey) return null

  return createClient<Database>(env.url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const isServiceConfigured = () =>
  !!process.env.SUPABASE_SERVICE_ROLE_KEY && getSupabaseEnv() !== null
