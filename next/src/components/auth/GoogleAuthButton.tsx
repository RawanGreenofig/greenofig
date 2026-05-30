'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'

interface Props {
  /** When omitted, defaults to the localized "Continue with Google" copy. */
  label?: string
  /** Pre-styled "or" divider above the button. Defaults to true. */
  withDivider?: boolean
  /** Safe in-app path to return to after sign-in (e.g. a walk-in invite page). */
  next?: string
}

/**
 * Google OAuth button shared by sign-in and sign-up pages.
 * Triggers Supabase OAuth flow with redirectTo = /<locale>/auth/callback.
 */
export function GoogleAuthButton({ label, withDivider = true, next }: Props) {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Capacitor v0.0.5+ ships the com.greenofig.app:// AndroidManifest
  // intent filter, so the deep-link OAuth round-trip can complete.
  // Google never sees the custom scheme — Supabase bounces the user
  // from its own HTTPS callback (which Google does accept) to the
  // custom scheme that the APK claims. CapacitorAuthListener picks
  // it up and completes the session.

  const handleClick = async () => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setError(
        isAr
          ? 'تعذّر الاتصال بخدمة المصادقة.'
          : 'Could not connect to the auth service.',
      )
      return
    }
    setError(null)
    setPending(true)
    // Inside the Capacitor Android app, Google sign-in opens a Chrome
    // Custom Tab — when Google finishes, it needs to bounce back into
    // OUR app, not greenofig.com on the system browser. Use the
    // custom URL scheme registered in AndroidManifest.xml; the
    // CapacitorAuthListener picks the callback up and completes the
    // Supabase session inside the WebView.
    //
    // In a regular browser, redirect back to greenofig.com/<locale>/
    // auth/callback as before.
    const { isInsideCapacitor } = await import('@/lib/is-capacitor')
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      window.location.origin
    const redirectTo = isInsideCapacitor()
      ? 'com.greenofig.app://login-callback'
      : `${baseUrl}/${locale}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (oauthError) {
      console.error('Google sign in error:', oauthError)
      setError(
        oauthError.message ||
          (isAr
            ? 'تعذّر تسجيل الدخول. حاول مرة أخرى.'
            : "Couldn't start Google sign-in. Please try again."),
      )
      setPending(false)
    }
    // On success the browser is redirected by Supabase — no further action.
  }

  const buttonLabel =
    label ?? (isAr ? 'تسجيل الدخول بـ Google' : 'Continue with Google')

  return (
    <>
      {withDivider && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '20px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--gf-border)' }} />
          <span
            style={{
              fontSize: '12px',
              color: 'var(--gf-fg-3)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {isAr ? 'أو' : 'or'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--gf-border)' }} />
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={pending}
        type="button"
        aria-busy={pending}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '12px',
          background: 'var(--gf-surface-raised)',
          border: '1px solid var(--gf-border)',
          borderRadius: '12px',
          color: 'var(--gf-fg-1)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.7 : 1,
          transition: 'background-color 0.2s ease, border-color 0.2s ease',
        }}
        onMouseOver={(e) => {
          if (!pending) e.currentTarget.style.background = 'var(--gf-bg-deeper)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'var(--gf-surface-raised)'
        }}
      >
        {pending ? (
          <span
            aria-hidden
            style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(240,237,230,0.3)',
              borderTopColor: '#a3e635',
              borderRadius: '50%',
              animation: 'gauth-spin 0.7s linear infinite',
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
        {pending ? (isAr ? 'جارٍ التوجيه…' : 'Redirecting…') : buttonLabel}
      </button>
      <style jsx>{`
        @keyframes gauth-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 12,
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
    </>
  )
}
