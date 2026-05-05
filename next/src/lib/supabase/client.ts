'use client'

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'
import type { Database } from './types'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Browser-side Supabase client. Returns null when env vars are missing.
 * Always check the result before calling — `client?.auth.signIn(...)`.
 */
export function getBrowserSupabase() {
  if (_client) return _client
  const env = getSupabaseEnv()
  if (!env) return null
  _client = createBrowserClient<Database>(env.url, env.anonKey)
  return _client
}
