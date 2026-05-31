'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Check, Loader2, MessageCircle } from '@/icons'
import { useAuth } from '@/context/AuthContext'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Walk-in invite page (/clinic-link/<clinicClientId>). The coach shares
 * this link; the client signs in with Google, and we connect their
 * account to their clinic record so the coach can message them in-app.
 * If they're already signed in, we link immediately on mount.
 */
export default function ClinicLinkPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const locale = useLocale()
  const { user, isLoading } = useAuth()

  const [state, setState] = useState<'idle' | 'linking' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const tried = useRef(false)
  const ar = locale === 'ar'

  // Email/password fallback (in addition to Google).
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    if (authBusy) return
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setAuthError(ar ? 'حدث خطأ. حاول مرة أخرى.' : 'Something went wrong. Try again.')
      return
    }
    setAuthError(null)
    setConfirmMsg(null)
    setAuthBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (err) {
          setAuthError(err.message)
        } else if (!data.session) {
          // Email confirmation is required — they'll come back signed in.
          setConfirmMsg(
            ar
              ? 'تحقق من بريدك لتأكيد الحساب، ثم افتح هذا الرابط مرة أخرى للاتصال بمدربتك.'
              : 'Check your email to confirm your account, then open this link again to connect with your coach.',
          )
        }
        // If a session exists, AuthContext picks up `user` and the link effect runs.
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (err) setAuthError(err.message)
      }
    } finally {
      setAuthBusy(false)
    }
  }

  useEffect(() => {
    if (isLoading || !user || tried.current) return
    tried.current = true
    setState('linking')
    void (async () => {
      try {
        const res = await fetch(`/api/clinic-link/${id}`, { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok || !data.ok) {
          setError(data.error ?? `Could not connect (${res.status}).`)
          setState('error')
        } else {
          setState('done')
        }
      } catch {
        setError('Network error — please try again.')
        setState('error')
      }
    })()
  }, [id, user, isLoading])

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--gf-bg-deeper)' }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
        <h1 className="font-display font-bold text-fg-1" style={{ fontSize: 'clamp(22px,5vw,30px)', lineHeight: 1.1 }}>
          Connect with your coach
        </h1>

        {isLoading || state === 'linking' ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-sm text-fg-2">
            <Loader2 className="w-6 h-6 animate-spin text-lime-400" strokeWidth={1.75} />
            {state === 'linking' ? 'Connecting your account…' : 'Loading…'}
          </div>
        ) : state === 'done' ? (
          <div className="mt-6 space-y-4">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-400/15">
              <Check className="w-6 h-6 text-lime-400" strokeWidth={2.25} />
            </span>
            <p className="text-sm text-fg-2">
              You&rsquo;re connected! Your coach can now message you in the app.
            </p>
            <Link
              href="/dashboard/messages"
              className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2} />
              Open messages
            </Link>
          </div>
        ) : state === 'error' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            <Link href="/dashboard" className="text-sm text-lime-600 hover:underline">Go to dashboard</Link>
          </div>
        ) : (
          <div className="mt-4 text-start">
            <p className="text-sm text-fg-2 mb-4 text-center">
              {ar
                ? 'سجّلي الدخول لربط حسابك حتى تتواصل معك مدربتك وترسل خطتك ومدفوعاتك هنا.'
                : 'Sign in to connect your account so your coach can chat with you and send your plan and payments here.'}
            </p>

            <GoogleAuthButton withDivider={false} next={`/${locale}/clinic-link/${id}`} />

            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-eyebrow text-fg-3">{ar ? 'أو' : 'or'}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {confirmMsg ? (
              <p className="rounded-lg border border-lime-600/40 bg-lime-400/10 p-3 text-sm text-fg-1 text-center">{confirmMsg}</p>
            ) : (
              <form onSubmit={submitEmail} className="space-y-2.5" noValidate>
                {mode === 'signup' && (
                  <input
                    type="text" autoComplete="name" required value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={ar ? 'الاسم الكامل' : 'Full name'}
                    className="w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
                  />
                )}
                <input
                  type="email" autoComplete="email" required value={email} dir="ltr"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ar ? 'البريد الإلكتروني' : 'Email'}
                  className="w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
                />
                <input
                  type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} value={password} dir="ltr"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={ar ? 'كلمة المرور (٨ أحرف على الأقل)' : 'Password (min 8 characters)'}
                  className="w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
                />
                {authError && <p className="text-sm" style={{ color: '#fca5a5' }}>{authError}</p>}
                <button
                  type="submit" disabled={authBusy}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
                >
                  {authBusy && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
                  {mode === 'signup' ? (ar ? 'إنشاء حساب' : 'Create account') : ar ? 'تسجيل الدخول' : 'Sign in'}
                </button>
                <p className="text-center text-xs text-fg-3 pt-1">
                  {mode === 'signup'
                    ? ar ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '
                    : ar ? 'ليس لديك حساب؟ ' : 'No account yet? '}
                  <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setAuthError(null) }}
                    className="text-lime-500 font-semibold hover:underline">
                    {mode === 'signup' ? (ar ? 'تسجيل الدخول' : 'Sign in') : ar ? 'إنشاء حساب' : 'Create one'}
                  </button>
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
