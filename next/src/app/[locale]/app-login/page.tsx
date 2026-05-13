'use client'

/**
 * /app-login — dedicated, isolated sign-in surface for the Capacitor
 * Android WebView.
 *
 * Architecture: zero dependencies on the SSR/cookie/middleware
 * pipeline the rest of the app uses.
 *
 *   - Imports createClient from @supabase/supabase-js directly, not
 *     through the shared lib/supabase/client.ts wrapper. The wrapper
 *     branches on isInsideCapacitor; this page is unconditionally
 *     localStorage-backed regardless of where it runs.
 *
 *   - 'use client' — no server component, no RSC payload that could
 *     hang on a missing cookie. The form is hydrated from a static
 *     HTML shell and never round-trips to the server until the user
 *     hits submit (which calls Supabase directly, not our /api).
 *
 *   - middleware is configured to skip this path (see middleware.ts
 *     matcher) so neither next-intl rewrites nor the auth gate run
 *     on it.
 *
 *   - No AuthContext, no useUser, no useRouter — sign-in success
 *     navigates via window.location.href so React isn't involved in
 *     the transition. Cleanest possible handoff.
 *
 * After signInWithPassword resolves, the session is persisted in
 * localStorage by the Supabase client (storage: window.localStorage,
 * persistSession: true). The rest of the app's getBrowserSupabase()
 * reads from the same localStorage key when inside Capacitor, so the
 * dashboard recognises the user on the very next page load.
 */

import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Single client per page load. createClient inside the module body
 *  would error during SSR (window undefined); the singleton is
 *  initialised lazily in the browser only. */
let _client: SupabaseClient | null = null
function getClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (_client) return _client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // PKCE is required for the Google round-trip: signInWithOAuth
      // writes the verifier to localStorage, then /auth/capacitor-
      // complete reads it back to finish exchangeCodeForSession.
      flowType: 'pkce',
      storage: window.localStorage,
    },
  })
  return _client
}

export default function AppLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // If a session already exists in localStorage (returning user
  // landed here by accident), skip straight to the dashboard.
  useEffect(() => {
    const sb = getClient()
    if (!sb) return
    void sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        // eslint-disable-next-line no-console
        console.log('[gf-app-login] existing session → /dashboard')
        window.location.href = '/dashboard'
      }
    })
  }, [])

  const onGoogle = async () => {
    if (googlePending || pending) return
    setError(null)
    const sb = getClient()
    if (!sb) {
      setError('Auth service is not configured. Please try again later.')
      return
    }
    setGooglePending(true)
    // Custom URL scheme com.greenofig.app:// was rejected by Google
    // Console, so the round-trip has to land on a real HTTPS URL we
    // control. Use the canonical greenofig.com /<locale>/auth/callback;
    // the route detects the Capacitor UA and bounces to
    // /auth/capacitor-complete which finishes the PKCE swap in the
    // same WebView's localStorage.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      'https://greenofig.com'
    const localeFromPath =
      typeof window !== 'undefined'
        ? window.location.pathname.match(/^\/([a-z]{2})\b/)?.[1] ?? 'en'
        : 'en'
    const redirectTo = `${baseUrl}/${localeFromPath}/auth/callback`
    // eslint-disable-next-line no-console
    console.log('[gf-app-login] signInWithOAuth google start', { redirectTo })
    try {
      const { error: oErr } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // Stay inside the WebView — never break out to an external
          // browser. Supabase will set window.location to Google's URL.
          skipBrowserRedirect: false,
        },
      })
      if (oErr) {
        // eslint-disable-next-line no-console
        console.error('[gf-app-login] signInWithOAuth error:', oErr)
        setError(oErr.message || 'Could not start Google sign-in.')
        setGooglePending(false)
      }
      // On success Supabase redirects the WebView to Google — no
      // further code runs here.
    } catch (caught) {
      // eslint-disable-next-line no-console
      console.error('[gf-app-login] google threw:', caught)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Could not start Google sign-in.',
      )
      setGooglePending(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)

    const sb = getClient()
    if (!sb) {
      setError('Auth service is not configured. Please try again later.')
      return
    }
    setPending(true)
    const t0 = performance.now()
    // eslint-disable-next-line no-console
    console.log('[gf-app-login] signInWithPassword start')

    try {
      const { error: signInErr, data } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      // eslint-disable-next-line no-console
      console.log(
        `[gf-app-login] signInWithPassword done +${Math.round(performance.now() - t0)}ms`,
        { hasError: !!signInErr, hasSession: !!data?.session },
      )
      if (signInErr) {
        const msg = (signInErr.message || '').toLowerCase()
        if (msg.includes('invalid login credentials')) {
          setError(
            'Email or password is wrong. If you signed up with Google, you need to set a password first from the regular sign-in page.',
          )
        } else {
          setError(signInErr.message || 'Sign-in failed. Please try again.')
        }
        setPending(false)
        return
      }
      if (!data.session) {
        setError('Sign-in returned no session. Please try again.')
        setPending(false)
        return
      }
      // localStorage is now populated. Hard-navigate so the dashboard
      // fully unmounts this page and bootstraps from scratch.
      window.location.href = '/dashboard'
    } catch (caught) {
      // eslint-disable-next-line no-console
      console.error('[gf-app-login] threw:', caught)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Sign-in failed. Please try again.',
      )
      setPending(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1a12',
        color: '#f0ede6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 6,
            color: '#f0ede6',
          }}
        >
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: '#a8b5a8', marginBottom: 28 }}>
          Sign in to your Greenofig account.
        </p>

        <button
          type="button"
          onClick={onGoogle}
          disabled={googlePending || pending}
          aria-busy={googlePending}
          style={{
            width: '100%',
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: '#ffffff',
            color: '#1f1f1f',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: googlePending ? 'wait' : 'pointer',
            opacity: googlePending || pending ? 0.7 : 1,
            touchAction: 'manipulation',
            fontFamily: 'inherit',
          }}
        >
          {googlePending ? (
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(0,0,0,0.2)',
                borderTopColor: '#1f1f1f',
                borderRadius: '50%',
                animation: 'gf-spin 0.7s linear infinite',
              }}
            />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                fill="#4285F4"
                d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
              />
              <path
                fill="#34A853"
                d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"
              />
              <path
                fill="#FBBC05"
                d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"
              />
              <path
                fill="#EA4335"
                d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"
              />
            </svg>
          )}
          {googlePending ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            margin: '20px 0',
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'rgba(255,255,255,0.08)',
            }}
          />
          <span style={{ fontSize: 12, color: '#5c7262' }}>or</span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'rgba(255,255,255,0.08)',
            }}
          />
        </div>

        <style>{`@keyframes gf-spin { to { transform: rotate(360deg); } }`}</style>

        <form onSubmit={onSubmit} noValidate>
          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#a8b5a8',
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            required
            disabled={pending}
            style={inputStyle}
          />

          <label
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: '#a8b5a8',
              marginTop: 16,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={pending}
              style={{ ...inputStyle, paddingInlineEnd: 60 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              style={{
                position: 'absolute',
                insetInlineEnd: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#a8b5a8',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                touchAction: 'manipulation',
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgb(127 29 29 / 0.5)',
                border: '1px solid rgb(153 27 27 / 0.5)',
                color: '#f87171',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !email || !password}
            style={{
              width: '100%',
              marginTop: 24,
              height: 48,
              borderRadius: 12,
              background: pending
                ? 'rgba(132,217,61,0.4)'
                : 'linear-gradient(180deg,#a3e635 0%,#84cc16 100%)',
              color: '#0d1a12',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              cursor: pending ? 'wait' : 'pointer',
              opacity: !email || !password ? 0.6 : 1,
              touchAction: 'manipulation',
              boxShadow: pending
                ? 'none'
                : '0 8px 22px rgba(132,217,61,0.3)',
            }}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p
          style={{
            marginTop: 24,
            fontSize: 13,
            color: '#a8b5a8',
            textAlign: 'center',
          }}
        >
          Don&apos;t have an account?{' '}
          <a
            href="/sign-up"
            style={{ color: '#a3e635', fontWeight: 600, textDecoration: 'none' }}
          >
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 48,
  padding: '0 14px',
  background: '#162b1e',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  color: '#f0ede6',
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  touchAction: 'manipulation',
}
