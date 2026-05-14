'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { getBrowserSupabase } from '@/lib/supabase/client'

/** Per-step structured logging.
 *  Inspect via chrome://inspect or `adb logcat | grep gf-signin`.
 *  Each line includes elapsed-since-start so you can tell exactly
 *  which step is eating the time when sign-in feels slow. */
function flowLog(t0: number, step: string, extra?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`[gf-signin] +${Math.round(performance.now() - t0)}ms ${step}`, extra ?? '')
}

/** Race a promise against a timeout. Rejects with a "timeout" error
 *  if the deadline hits first so callers can surface a clear error
 *  instead of leaving the user staring at a spinner. */
// Accept any PromiseLike so we can race Supabase's PostgrestBuilder
// (a thenable that isn't a real Promise) the same way we race normal
// fetch promises.
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label}_timeout`)),
      ms,
    )
    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

// Hard ceiling for any single step in the sign-in flow. 8 seconds is
// long enough that a healthy connection never trips it (the exchange
// call typically resolves in 300–800ms over 4G), short enough that a
// stuck WebView surfaces a retry option instead of leaving the user
// staring at a spinner.
const SIGNIN_STEP_TIMEOUT_MS = 8_000

/** Pick the right destination for a freshly authenticated user. */
function destinationForRole(role: string | null | undefined): string {
  if (role === 'admin') return '/admin'
  if (role === 'nutritionist') return '/nutritionist'
  return '/dashboard'
}

/**
 * Mirror the localStorage-stored session into server-side cookies so
 * RSC pages and API routes that read getServerSupabase() see the
 * same user. Best-effort — a failure here doesn't block sign-in,
 * since the client already has a valid session.
 *
 * 3s timeout: long enough to absorb a slow request, short enough
 * that we don't add visible delay to the post-sign-in navigation.
 */
async function bridgeSessionToCookies(
  accessToken: string,
  refreshToken: string,
  t0: number,
): Promise<void> {
  try {
    flowLog(t0, 'cookie-bridge start')
    const res = await withTimeout(
      fetch('/api/auth/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
        }),
      }),
      3000,
      'bridge',
    )
    flowLog(t0, 'cookie-bridge done', { status: res.status })
  } catch (err) {
    // Non-fatal — client-side session still works. Server-rendered
    // surfaces will just render as unauthenticated until the next
    // sign-in or refresh attempt re-bridges.
    console.warn('[gf-signin] cookie bridge failed (non-fatal):', err)
  }
}

/** Seed local tier cache + resolve role-correct destination. The
 *  profile fetch is timeout-bounded so a stuck DB call can't trap
 *  the user on the splash. On any failure we still navigate — to
 *  /dashboard — because the user IS authenticated at this point and
 *  the dashboard's own loaders will handle missing data gracefully. */
async function seedAndResolveDest(
  supabase: SupabaseClient,
  userId: string,
  t0: number,
): Promise<string> {
  try {
    flowLog(t0, 'profile.fetch start')
    const { data } = await withTimeout(
      supabase
        .from('profiles')
        .select('role, tier, full_name')
        .eq('id', userId)
        .maybeSingle(),
      SIGNIN_STEP_TIMEOUT_MS,
      'profile_fetch',
    )
    flowLog(t0, 'profile.fetch done', data ? { hasRow: true } : { hasRow: false })

    if (!data) {
      flowLog(t0, 'profile.upsert (first-time)')
      const { data: userData } = await supabase.auth.getUser()
      const u = userData.user
      await withTimeout(
        supabase
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
          ),
        SIGNIN_STEP_TIMEOUT_MS,
        'profile_upsert',
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
    console.error('[gf-signin] seedAndResolveDest failed:', err)
    // Still let the user through — they're authenticated. /dashboard
    // will lazy-load the profile.
    return '/dashboard'
  }
}

type SigninStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'error'; label: string }

/**
 * Capacitor deep-link → Supabase session bridge AND the sole authority
 * for post-sign-in navigation inside the WebView.
 *
 * Two responsibilities:
 *
 *   1. Handle the OAuth deep link arriving at com.greenofig.app://.
 *      Exchange the code, seed caches, navigate.
 *
 *   2. On mount, if a session already exists in storage AND the user
 *      is sitting on the marketing homepage, navigate to the role-
 *      correct home (returning-user fast path).
 *
 * Every step is wrapped in a 8s timeout. If anything stalls the
 * splash overlay flips to an error state with a Retry button instead
 * of trapping the user.
 */
export function CapacitorAuthListener() {
  const [status, setStatus] = useState<SigninStatus>({ kind: 'idle' })

  // Effect 1 — returning-user auto-route. Runs once on mount.
  useEffect(() => {
    if (!isInsideCapacitor()) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    const t0 = performance.now()

    const maybeRedirect = async () => {
      const path = window.location.pathname
      const isMarketingHome = path === '/' || /^\/[a-z]{2}\/?$/.test(path)
      if (!isMarketingHome) return
      // Extract the locale from the current path so we can construct
      // the matching /<locale>/app-login URL. The file router only
      // serves the locale-prefixed form.
      const localeMatch = path.match(/^\/([a-z]{2})/)
      const locale = localeMatch?.[1] ?? 'en'
      flowLog(t0, 'mount-check getSession')
      try {
        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SIGNIN_STEP_TIMEOUT_MS,
          'getSession',
        )
        if (cancelled) return
        if (!data.session?.user) {
          // No session → punt the user to the dedicated app-login
          // page. This is the Capacitor-specific sign-in surface
          // which bypasses every cookie/SSR/middleware pathway the
          // regular /sign-in flow depends on.
          flowLog(t0, 'mount-check no session → /app-login')
          window.location.replace(`/${locale}/app-login`)
          return
        }
        flowLog(t0, 'mount-check session found, resolving dest')
        const [dest] = await Promise.all([
          seedAndResolveDest(supabase, data.session.user.id, t0),
          bridgeSessionToCookies(
            data.session.access_token,
            data.session.refresh_token,
            t0,
          ),
        ])
        if (cancelled) return
        flowLog(t0, 'mount-check navigate', { dest })
        window.location.replace(dest)
      } catch (err) {
        // getSession itself hung — push the user to app-login so
        // they have a way to recover.
        console.warn('[gf-signin] mount-check skipped:', err)
        if (!cancelled) {
          window.location.replace(`/${locale}/app-login`)
        }
      }
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
          const t0 = performance.now()
          flowLog(t0, 'appUrlOpen', { url })
          if (!url.startsWith('com.greenofig.app://')) {
            flowLog(t0, 'appUrlOpen ignored (wrong scheme)')
            return
          }
          // We came back from a Chrome Custom Tab (Google OAuth). Close
          // the tab so the user doesn't see the post-redirect blank
          // page lingering behind the splash. Fire-and-forget — if the
          // plugin isn't installed (web build) or the tab is already
          // gone, this is harmless. Don't block the exchange on it.
          void (async () => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const bmod: any = await import('@capacitor/browser')
              await bmod.Browser?.close?.()
            } catch {
              /* plugin missing or already closed — fine */
            }
          })()
          setStatus({ kind: 'pending' })
          const supabase = getBrowserSupabase()
          if (!supabase) {
            flowLog(t0, 'supabase client null — aborting')
            setStatus({ kind: 'error', label: 'client_unavailable' })
            return
          }

          try {
            const parsed = new URL(url)
            const code = parsed.searchParams.get('code')
            if (code) {
              flowLog(t0, 'exchange start')
              let userId: string | undefined
              let accessToken: string | undefined
              let refreshToken: string | undefined
              try {
                const result = await withTimeout(
                  supabase.auth.exchangeCodeForSession(code),
                  SIGNIN_STEP_TIMEOUT_MS,
                  'exchange',
                )
                flowLog(t0, 'exchange done', { hasError: !!result.error })
                if (result.error) {
                  console.error('[gf-signin] exchange returned error:', result.error)
                  setStatus({ kind: 'error', label: 'exchange_failed' })
                  return
                }
                userId = result.data.session?.user.id
                accessToken = result.data.session?.access_token
                refreshToken = result.data.session?.refresh_token
              } catch (err) {
                console.error('[gf-signin] exchange hung/threw:', err)
                setStatus({ kind: 'error', label: 'exchange_timeout' })
                return
              }
              if (!userId) {
                flowLog(t0, 'exchange returned no userId')
                setStatus({ kind: 'error', label: 'no_user' })
                return
              }
              // Bridge to cookies in parallel with the profile fetch —
              // they don't depend on each other and we want both done
              // before we navigate, so the dashboard's first render
              // has an authenticated server-side context.
              const bridgePromise = accessToken && refreshToken
                ? bridgeSessionToCookies(accessToken, refreshToken, t0)
                : Promise.resolve()
              flowLog(t0, 'seed+resolve dest start')
              const [dest] = await Promise.all([
                seedAndResolveDest(supabase, userId, t0),
                bridgePromise,
              ])
              flowLog(t0, 'navigating', { dest })
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
              flowLog(t0, 'setSession start (implicit flow)')
              let userId: string | undefined
              try {
                const result = await withTimeout(
                  supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  }),
                  SIGNIN_STEP_TIMEOUT_MS,
                  'setSession',
                )
                flowLog(t0, 'setSession done', { hasError: !!result.error })
                if (result.error) {
                  console.error('[gf-signin] setSession returned error:', result.error)
                  setStatus({ kind: 'error', label: 'set_session_failed' })
                  return
                }
                userId = result.data.session?.user.id
              } catch (err) {
                console.error('[gf-signin] setSession hung/threw:', err)
                setStatus({ kind: 'error', label: 'set_session_timeout' })
                return
              }
              if (!userId) {
                setStatus({ kind: 'error', label: 'no_user' })
                return
              }
              const [dest] = await Promise.all([
                seedAndResolveDest(supabase, userId, t0),
                bridgeSessionToCookies(accessToken, refreshToken, t0),
              ])
              flowLog(t0, 'navigating', { dest })
              window.location.replace(dest)
              return
            }
            flowLog(t0, 'deep link had neither code nor tokens')
            setStatus({ kind: 'idle' })
          } catch (err) {
            console.error('[gf-signin] callback parse failed:', err)
            setStatus({ kind: 'error', label: 'parse_failed' })
          }
        })
        cleanup = () => {
          try { handle.remove() } catch { /* listener already gone */ }
        }
      } catch (err) {
        console.error('[gf-signin] @capacitor/app import failed:', err)
      }
    })()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])

  if (status.kind === 'idle') return null
  const isError = status.kind === 'error'
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: '#0d1a12' }}
    >
      {!isError ? (
        <>
          <span
            aria-hidden
            className="w-8 h-8 rounded-full animate-spin"
            style={{
              border: '2px solid rgba(132,217,61,0.25)',
              borderTopColor: '#a3e635',
            }}
          />
          <p className="text-sm text-fg-2">Signing you in…</p>
        </>
      ) : (
        <>
          <p className="text-base font-semibold text-fg-1 text-center">
            Sign-in took too long
          </p>
          <p className="text-sm text-fg-2 text-center max-w-[18rem]">
            Check your internet connection and try again. Step that
            timed out: <span className="font-mono text-xs">{status.label}</span>
          </p>
          <button
            type="button"
            onClick={() => setStatus({ kind: 'idle' })}
            className="mt-2 px-5 py-2 rounded-pill text-sm font-semibold text-bg"
            style={{
              background: 'linear-gradient(180deg,#a3e635 0%,#84cc16 100%)',
              boxShadow: '0 6px 18px rgba(132,217,61,0.28)',
            }}
          >
            Try again
          </button>
        </>
      )}
    </div>
  )
}
