'use client'

import { createBrowserClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from './env'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import type { Database } from './types'

let _client: SupabaseClient<Database> | null = null

/**
 * Browser-side Supabase client.
 *
 * Two clients in one. Detected at first call:
 *
 *   - Inside the Capacitor Android WebView, sessions live in
 *     localStorage. `@supabase/ssr`'s createBrowserClient uses
 *     document.cookie as its storage backend so the auth state can
 *     be read from the server — but the WebView's cookie surface is
 *     unreliable for the post-OAuth handoff (cookies written by JS
 *     during exchangeCodeForSession aren't always readable on the
 *     very next call), which produced the "sign-in doesn't stick"
 *     behaviour. The localStorage-backed plain client side-steps
 *     that entirely.
 *
 *     The trade-off: the server can no longer see the session
 *     (cookies aren't set, localStorage is client-only). That's
 *     accepted — middleware already bypasses auth gating for
 *     Capacitor (UA detection), requireRole has a matching bypass,
 *     and actual data access is gated by Supabase Row-Level
 *     Security on the database side regardless of any client
 *     spoofing.
 *
 *   - Outside Capacitor (regular browsers, dev, prerendering), the
 *     existing @supabase/ssr browser client is used. Sessions live
 *     in cookies; the server reads them; SSR works as before.
 *
 * Returns null when env vars are missing — callers must check.
 */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (_client) return _client
  const env = getSupabaseEnv()
  if (!env) return null

  if (isInsideCapacitor()) {
    _client = createClient<Database>(env.url, env.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth deep link arrives via @capacitor/app's
        // appUrlOpen event, NOT in window.location. We pass the
        // code into exchangeCodeForSession ourselves, so the
        // client should not also try to auto-detect the URL on
        // every navigation (that path doesn't apply here).
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage:
          typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
    return _client
  }

  _client = createBrowserClient<Database>(
    env.url,
    env.anonKey,
  ) as unknown as SupabaseClient<Database>
  return _client
}
