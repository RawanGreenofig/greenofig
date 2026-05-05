import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import { getSupabaseEnv } from './env'
import type { Database } from './types'

/**
 * Build a Supabase client that reads cookies from the incoming request and
 * writes refreshed-session cookies to the outgoing response.
 *
 * Returns null when env is missing — caller should treat as "no auth".
 */
export function getMiddlewareSupabase(
  request: NextRequest,
  response: NextResponse,
) {
  const env = getSupabaseEnv()
  if (!env) return null

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options })
        })
      },
    },
  })
}
