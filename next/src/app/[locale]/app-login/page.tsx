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
      storage: window.localStorage,
    },
  })
  return _client
}

export default function AppLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
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
