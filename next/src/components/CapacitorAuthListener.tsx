'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { getBrowserSupabase } from '@/lib/supabase/client'

/** Race a promise against a timeout. Rejects with a "timeout" error
 *  if the deadline hits first so callers can surface a clear error
 *  instead of leaving the user staring at a spinner. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    )
    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

/**
 * Pick the right destination for a freshly authenticated user. We
 * route by role here (rather than always landing on /dashboard and
 * letting middleware bounce) so the redirect count is exactly one.
 */
function destinationForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin'
  if (role === 'nutritionist') return '/nutritionist'
  return '/dashboard'
}

/**
 * Single combined "seed local caches + decide destination" step.
 * Replaces the old seedTierCache + waitForSession + role-discovery
 * trio. One profile query, one navigation. If the user's profile
 * row doesn't exist yet (first-ever Capacitor sign-in), we upsert
 * with the OAuth provider's metadata first.
 *
 * Returns the destination path so the caller can navigate.
 */
async function seedAndResolveDest(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role, tier, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (!data) {
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
      window.localStorage.setItem('gf_tier', 'free')
      window.localStorage.setItem('gf_tier_ts', String(Date.now()))
      return '/dashboard'
    }

    const row = data as { role?: string; tier?: string }
    const tier = row.tier
    if (
      tier === 'free' ||
      tier === 'basic' ||
      tier === 'premium' ||
      tier === 'vip'
    ) {
      window.localStorage.setItem('gf_tier', tier)
      window.localStorage.setItem('gf_tier_ts', String(Date.now()))
    }
    return destinationForRole(row.role)
  } catch (err) {
    console.error('[gf-cap] seedAndResolveDest failed:', err)
    return '/dashboard'
  }
}

/**
 * Capacitor deep-link → Supabase session bridge AND the sole authority
 * for post-sign-in navigation inside the WebView.
 *
 * Two responsibilities:
 *
 *   1. Handle the OAuth deep link arriving at com.greenofig.app://.
 *      Exchange the code, seed caches, navigate. Splash + retry
 *      escape provide feedback while the network round-trip lands.
 *
 *   2. On mount, if a session already exists in storage AND the user
 *      is sitting on the marketing homepage (where there's nothing
 *      for an authenticated user to do), navigate to the role-correct
 *      home. This handles the "returning user reopens the app" case
 *      that CapacitorHomeGate used to handle separately.
 *
 * Anything else (signed-in user navigating freely inside the app)
 * we do NOT touch — they're already where they want to be.
 *
 * No `waitForSession` polling, no router.replace race, no double
 * navigation. After the exchange resolves, exactly one
 * window.location.replace fires.
 */
export function CapacitorAuthListener() {
  const [signingIn, setSigningIn] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  useEffect(() => {
    if (!signingIn) {
      setShowCancel(false)
      return
    }
    const t = setTimeout(() => setShowCancel(true), 8000)
    return () => clearTimeout(t)
  }, [signingIn])

  // Effect 1 — returning-user auto-route. Runs once on mount.
  useEffect(() => {
    if (!isInsideCapacitor()) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    const maybeRedirect = async () => {
      // Only auto-route from the marketing homepage. Anywhere else
      // (sign-in, dashboard, blog, etc.) leave the user alone.
      const path = window.location.pathname
      const isMarketingHome = path === '/' || /^\/[a-z]{2}\/?$/.test(path)
      if (!isMarketingHome) return

      const { data } = await supabase.auth.getSession()
      if (cancelled || !data.session?.user) return

      const dest = await seedAndResolveDest(supabase, data.session.user.id)
      if (cancelled) return
      window.location.replace(dest)
    }
    void maybeRedirect()

    return () => { cancelled = true }
  }, [])

  // Effect 2 — deep-link OAuth callback handler.
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
          setSigningIn(true)
          const supabase = getBrowserSupabase()
          if (!supabase) {
            setSigningIn(false)
            return
          }

          try {
            const parsed = new URL(url)
            const code = parsed.searchParams.get('code')
            if (code) {
              let userId: string | undefined
              try {
                const result = await withTimeout(
                  supabase.auth.exchangeCodeForSession(code),
                  15000,
                  'exchangeCodeForSession',
                )
                if (result.error) {
                  console.error('[gf-cap] exchangeCodeForSession failed:', result.error)
                  toast.error(result.error.message || 'Sign-in failed. Please try again.')
                  setSigningIn(false)
                  return
                }
                userId = result.data.session?.user.id
              } catch (err) {
                console.error('[gf-cap] exchange hung / errored:', err)
                toast.error('Sign-in is taking too long. Check your connection and try again.')
                setSigningIn(false)
                return
              }
              if (!userId) {
                toast.error('Sign-in returned no user. Please try again.')
                setSigningIn(false)
                return
              }
              const dest = await seedAndResolveDest(supabase, userId)
              window.location.replace(dest)
              return
            }
            const hash = parsed.hash.startsWith('#')
              ? parsed.hash.slice(1)
              : parsed.hash
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              let userId: string | undefined
              try {
                const result = await withTimeout(
                  supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  }),
                  15000,
                  'setSession',
                )
                if (result.error) {
                  console.error('[gf-cap] setSession failed:', result.error)
                  toast.error(result.error.message || 'Sign-in failed. Please try again.')
                  setSigningIn(false)
                  return
                }
                userId = result.data.session?.user.id
              } catch (err) {
                console.error('[gf-cap] setSession hung / errored:', err)
                toast.error('Sign-in is taking too long. Check your connection and try again.')
                setSigningIn(false)
                return
              }
              if (!userId) {
                toast.error('Sign-in returned no user. Please try again.')
                setSigningIn(false)
                return
              }
              const dest = await seedAndResolveDest(supabase, userId)
              window.location.replace(dest)
              return
            }
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
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
      style={{ background: '#0d1a12' }}
    >
      <span
        aria-hidden
        className="w-8 h-8 rounded-full animate-spin"
        style={{
          border: '2px solid rgba(132,217,61,0.25)',
          borderTopColor: '#a3e635',
        }}
      />
      <p className="text-sm text-fg-2">Signing you in…</p>
      {showCancel ? (
        <button
          type="button"
          onClick={() => setSigningIn(false)}
          className="mt-2 px-4 py-2 rounded-lg text-sm text-fg-2 border border-white/15 hover:bg-white/5 active:bg-white/10"
        >
          Taking too long? Tap to cancel
        </button>
      ) : null}
    </div>
  )
}
