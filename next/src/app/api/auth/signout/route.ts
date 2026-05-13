import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/signout
 *
 * Server-side sign-out. The browser/Capacitor signOut in AuthContext
 * can only clear the client-side cookies it has access to via
 * document.cookie — it CAN'T clear cookies that the @supabase/ssr
 * server client sets with attributes like HttpOnly / Secure /
 * SameSite=Lax, because document.cookie doesn't see them.
 *
 * This endpoint uses the SSR client, which has full access to the
 * Next.js cookies() store, so calling its signOut() emits proper
 * Set-Cookie response headers that expire every sb-* cookie. After
 * this returns the cookies are genuinely gone — no more silent
 * session restoration on the next page load.
 *
 * Idempotent: succeeds even if there's no session to clear.
 */
export async function POST() {
  const supabase = getServerSupabase()
  if (!supabase) {
    return NextResponse.json({ ok: true, note: 'no-supabase' })
  }
  try {
    await supabase.auth.signOut({ scope: 'global' })
  } catch (err) {
    console.error('[api/auth/signout] signOut error:', err)
  }
  return NextResponse.json({ ok: true })
}
