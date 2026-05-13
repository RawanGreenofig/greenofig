'use client'

/**
 * /auth/capacitor-complete — landing page for the Capacitor Google
 * sign-in flow.
 *
 * The Google Console rejected the custom `com.greenofig.app://` URL
 * scheme, so the WebView-side Google flow has to round-trip through
 * an HTTPS URL on greenofig.com. Supabase redirects the browser to
 * `/<locale>/auth/callback?code=...`; that route detects the Capacitor
 * UA and 302's here, where we finish the PKCE handshake client-side
 * using the verifier stored in localStorage during signInWithOAuth.
 *
 * Cannot use the server-side exchange the regular browser flow uses,
 * because the verifier lives in the WebView's localStorage — the
 * server has no way to read it. So the WebView has to do the swap
 * itself.
 *
 * Path is under /auth/* so middleware skips it (see middleware.ts
 * matcher) — no locale rewrite, no auth gate, no cookie inspection.
 */

import { useEffect, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let _client: SupabaseClient | null = null
function getClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (_client) return _client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  // Same auth config as /app-login so the PKCE verifier written there
  // is readable here — both clients point at window.localStorage.
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storage: window.localStorage,
    },
  })
  return _client
}

export default function CapacitorAuthCompletePage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const sb = getClient()
      if (!sb) {
        setError('Auth service is not configured.')
        return
      }
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errParam = params.get('error_description') || params.get('error')
      if (errParam) {
        setError(errParam)
        return
      }
      if (!code) {
        setError('Sign-in returned no code. Please try again.')
        return
      }
      const t0 = performance.now()
      // eslint-disable-next-line no-console
      console.log('[gf-cap-complete] exchangeCodeForSession start')
      try {
        const { data, error: xErr } = await sb.auth.exchangeCodeForSession(code)
        // eslint-disable-next-line no-console
        console.log(
          `[gf-cap-complete] exchange done +${Math.round(performance.now() - t0)}ms`,
          { hasError: !!xErr, hasSession: !!data?.session },
        )
        if (xErr) {
          setError(xErr.message || 'Sign-in failed. Please try again.')
          return
        }
        if (!data.session) {
          setError('Sign-in returned no session.')
          return
        }
        // Session is now in localStorage. Hard-navigate so the
        // dashboard bootstraps from scratch.
        window.location.replace('/dashboard')
      } catch (caught) {
        // eslint-disable-next-line no-console
        console.error('[gf-cap-complete] threw:', caught)
        setError(
          caught instanceof Error
            ? caught.message
            : 'Sign-in failed. Please try again.',
        )
      }
    }
    void run()
  }, [])

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
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        {!error ? (
          <>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 32,
                height: 32,
                border: '2px solid rgba(132,217,61,0.25)',
                borderTopColor: '#a3e635',
                borderRadius: '50%',
                animation: 'gf-cap-spin 0.7s linear infinite',
              }}
            />
            <p style={{ marginTop: 16, fontSize: 14, color: '#a8b5a8' }}>
              Finishing sign-in…
            </p>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#f0ede6',
                marginBottom: 8,
              }}
            >
              Sign-in failed
            </p>
            <p style={{ fontSize: 13, color: '#a8b5a8', marginBottom: 20 }}>
              {error}
            </p>
            <a
              href="/en/app-login"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                borderRadius: 12,
                background: 'linear-gradient(180deg,#a3e635 0%,#84cc16 100%)',
                color: '#0d1a12',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to sign-in
            </a>
          </>
        )}
      </div>
      <style>{`
        @keyframes gf-cap-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
