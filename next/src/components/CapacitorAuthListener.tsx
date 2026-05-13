'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Fetch the user's profile and pre-populate localStorage with their
 * tier BEFORE we navigate to /dashboard. AuthContext reads this
 * cache on first render, so the dashboard never paints with `null`
 * tier → "Free" badge → upgrade prompt, even though the user is
 * actually VIP. Same keys AuthContext uses: gf_tier + gf_tier_ts.
 */
/**
 * Poll supabase.auth.getSession() until it returns a non-null session
 * or the timeout fires. The exchangeCodeForSession call writes the
 * session synchronously to its in-memory adapter, but @supabase/ssr's
 * cookie writes can lag a tick or two. Without this poll, our hard
 * navigation to /dashboard arrives at middleware BEFORE the cookies
 * are visible — middleware sees no auth, redirects to /sign-in, the
 * client-side sign-in page sees the local session, redirects back,
 * and we loop. The await here breaks the race.
 */
async function waitForSession(
  supabase: SupabaseClient,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession()
    if (data.session) return
    await new Promise((r) => setTimeout(r, 100))
  }
  console.warn('[gf-cap] waitForSession: timed out — navigating anyway')
}

async function seedTierCache(
  supabase: SupabaseClient,
  userId: string | undefined,
): Promise<void> {
  if (!userId) return
  try {
    // First read — does a profile row exist?
    const { data } = await supabase
      .from('profiles')
      .select('tier, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (!data) {
      // First-ever sign-in via the Capacitor path. The server-side
      // /auth/callback route handles this upsert for browser visitors;
      // we mirror it here so the user actually has a profile row.
      // ignoreDuplicates so a race never overwrites someone else's
      // record.
      const { data: userData } = await supabase.auth.getUser()
      const u = userData.user
      await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            full_name:
              (u?.user_metadata?.full_name as string | undefined) ?? '',
            avatar_url:
              (u?.user_metadata?.avatar_url as string | undefined) ?? '',
            role: 'user',
            tier: 'free',
          } as never,
          { onConflict: 'id', ignoreDuplicates: true },
        )
      // eslint-disable-next-line no-console
      console.log('[gf-cap] AuthListener created profile row for new user')
      // Newly-created row → tier is free.
      window.localStorage.setItem('gf_tier', 'free')
      window.localStorage.setItem('gf_tier_ts', String(Date.now()))
      return
    }

    const tier = (data as { tier?: string }).tier
    if (
      tier === 'free' ||
      tier === 'basic' ||
      tier === 'premium' ||
      tier === 'vip'
    ) {
      window.localStorage.setItem('gf_tier', tier)
      window.localStorage.setItem('gf_tier_ts', String(Date.now()))
      // eslint-disable-next-line no-console
      console.log('[gf-cap] AuthListener seeded tier=', tier)
    } else {
      // eslint-disable-next-line no-console
      console.log('[gf-cap] AuthListener: existing profile, null tier')
    }
  } catch (err) {
    console.error('[gf-cap] AuthListener seedTierCache failed:', err)
  }
}

/**
 * Capacitor deep-link → Supabase session bridge.
 *
 * Google OAuth round-trip flow inside the Android app:
 *
 *   1. User taps "Sign in with Google" in the WebView.
 *   2. signInWithOAuth({ redirectTo: 'com.greenofig.app://login-callback' })
 *      kicks off the Supabase flow → opens a Chrome Custom Tab.
 *   3. User authenticates with Google in the Custom Tab.
 *   4. Google redirects to com.greenofig.app://login-callback?code=...
 *   5. Android's intent system invokes the Greenofig app with that URL.
 *   6. THIS listener picks it up via @capacitor/app's appUrlOpen event
 *      and calls supabase.auth.exchangeCodeForSession(code) to finish
 *      the PKCE handshake.
 *   7. User lands signed-in inside the WebView.
 *
 * No-op in a regular browser — @capacitor/app's listener fires
 * nothing when there's no native bridge. Dynamic import keeps the
 * plugin out of the browser-side bundle until it's actually needed.
 */
export function CapacitorAuthListener() {
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!isInsideCapacitor()) return
    let cleanup: (() => void) | undefined
    let cancelled = false
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import('@capacitor/app')
        const App = mod.App
        if (!App || cancelled) return
        const handle = await App.addListener('appUrlOpen', async (event: { url: string }) => {
          const url = event?.url ?? ''
          // eslint-disable-next-line no-console
          console.log('[gf-cap] appUrlOpen:', url)
          if (!url.startsWith('com.greenofig.app://')) return
          // Show the splash IMMEDIATELY so the user gets feedback the
          // moment the deep link arrives — before we wait on the
          // Supabase code exchange.
          setSigningIn(true)
          const supabase = getBrowserSupabase()
          if (!supabase) {
            setSigningIn(false)
            return
          }

          // Supabase can deliver tokens in two shapes depending on
          // the OAuth flow:
          //   - PKCE  → ?code=... in the query string
          //   - implicit → #access_token=...&refresh_token=... in
          //     the hash fragment
          // Handle both.
          try {
            const parsed = new URL(url)
            const code = parsed.searchParams.get('code')
            if (code) {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code)
              if (error) {
                console.error('[gf-cap] exchangeCodeForSession failed:', error)
                setSigningIn(false)
                return
              }
              // Profile + tier seed in background.
              void seedTierCache(supabase, data.session?.user.id)
              // Wait until getSession() confirms the session has
              // propagated to the SSR cookie store before navigating.
              // Without this poll, the hard navigation fires before
              // cookies are flushed → middleware sees no auth →
              // redirects to /sign-in → sign-in sees the local
              // session → redirects to /dashboard → infinite loop.
              await waitForSession(supabase, 5000)
              window.location.replace('/dashboard')
              return
            }
            const hash = parsed.hash.startsWith('#')
              ? parsed.hash.slice(1)
              : parsed.hash
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              if (error) {
                console.error('[gf-cap] setSession failed:', error)
                setSigningIn(false)
                return
              }
              void seedTierCache(supabase, data.session?.user.id)
              await waitForSession(supabase, 5000)
              window.location.replace('/dashboard')
              return
            }
            // URL matched our scheme but had neither code nor tokens
            // — release the splash so the user isn't stuck.
            setSigningIn(false)
          } catch (err) {
            console.error('[gf-cap] auth callback parse failed:', err)
            setSigningIn(false)
          }
        })
        cleanup = () => {
          try { handle.remove() } catch { /* listener already gone */ }
        }
      } catch (err) {
        console.error('[gf-cap] @capacitor/app import failed:', err)
      }
    })()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  if (!signingIn) return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
      style={{ background: '#0d1a12' }}
    >
      <span
        className="w-8 h-8 rounded-full animate-spin"
        style={{
          border: '2px solid rgba(132,217,61,0.25)',
          borderTopColor: '#a3e635',
        }}
      />
      <p className="text-sm text-fg-2">Signing you in…</p>
    </div>
  )
}
