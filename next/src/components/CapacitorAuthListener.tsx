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
 * Fetch the user's profile and pre-populate localStorage with their
 * tier BEFORE we navigate to /dashboard. AuthContext reads this
 * cache on first render, so the dashboard never paints with `null`
 * tier → "Free" badge → upgrade prompt, even though the user is
 * actually VIP. Same keys AuthContext uses: gf_tier + gf_tier_ts.
 */
/**
 * Resolve as soon as a usable Supabase session is present — without
 * polling. The fast path is a single synchronous getSession() call
 * (returns immediately when exchangeCodeForSession has already
 * written to in-memory storage). The slow path subscribes to
 * onAuthStateChange and resolves on the next SIGNED_IN /
 * TOKEN_REFRESHED / INITIAL_SESSION event, or after the timeout —
 * whichever comes first.
 *
 * 2-second timeout is intentional: we'd rather navigate optimistically
 * than freeze the user on a splash. If middleware still hasn't seen
 * the cookie, the worst case is one fast-redirect round-trip; with
 * the event-driven wake-up that almost never happens in practice.
 */
async function waitForSession(
  supabase: SupabaseClient,
  timeoutMs = 2000,
): Promise<void> {
  // Fast path — session was written synchronously to storage.
  const { data: initial } = await supabase.auth.getSession()
  if (initial.session) return

  // Slow path — wait for an auth event or timeout.
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      try { sub.data.subscription.unsubscribe() } catch { /* listener already gone */ }
      clearTimeout(timer)
      resolve()
    }
    const sub = supabase.auth.onAuthStateChange((event, sess) => {
      if (sess && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        finish()
      }
    })
    const timer = setTimeout(finish, timeoutMs)
  })
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
  const [showCancel, setShowCancel] = useState(false)

  // Reveal a "Tap to cancel" escape after 8 seconds. The hard 15s
  // timeout inside the exchange will normally rescue the user first,
  // but if anything keeps the promise pending the user always has a
  // way out without killing the app.
  useEffect(() => {
    if (!signingIn) {
      setShowCancel(false)
      return
    }
    const t = setTimeout(() => setShowCancel(true), 8000)
    return () => clearTimeout(t)
  }, [signingIn])

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
              let data
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
                data = result.data
              } catch (err) {
                console.error('[gf-cap] exchange hung / errored:', err)
                toast.error('Sign-in is taking too long. Check your connection and try again.')
                setSigningIn(false)
                return
              }
              void seedTierCache(supabase, data.session?.user.id)
              await waitForSession(supabase)
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
              let data
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
                data = result.data
              } catch (err) {
                console.error('[gf-cap] setSession hung / errored:', err)
                toast.error('Sign-in is taking too long. Check your connection and try again.')
                setSigningIn(false)
                return
              }
              void seedTierCache(supabase, data.session?.user.id)
              await waitForSession(supabase)
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
