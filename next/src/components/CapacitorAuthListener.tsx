'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

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
          const supabase = getBrowserSupabase()
          if (!supabase) return

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
                return
              }
              await seedTierCache(supabase, data.session?.user.id)
              router.replace('/dashboard')
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
                return
              }
              await seedTierCache(supabase, data.session?.user.id)
              router.replace('/dashboard')
            }
          } catch (err) {
            console.error('[gf-cap] auth callback parse failed:', err)
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
  }, [router])

  return null
}
