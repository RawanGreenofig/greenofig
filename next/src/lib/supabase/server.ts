import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'
import type { Database } from './types'

/**
 * Server-side Supabase client (RSCs, server actions, route handlers).
 * Returns null when env vars are missing.
 *
 * Cookie methods are wrapped in try/catch because RSCs cannot mutate
 * cookies — only Server Actions and Route Handlers can.
 */
export function getServerSupabase() {
  const env = getSupabaseEnv()
  if (!env) return null

  const cookieStore = cookies()

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          /* RSC: cookies are read-only here. The session is refreshed
             by the middleware, which has write access. */
        }
      },
    },
  })
}
