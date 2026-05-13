'use client'

import { Suspense, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useRouter, Link } from '@/i18n/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { AuthSplitShell } from '@/components/auth/AuthSplitShell'
import {
  Field,
  PrimarySubmit,
  OrDivider,
} from '@/components/auth/AuthControls'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
type Form = z.infer<typeof schema>

/** Hard ceiling for any single step in the sign-in flow. Healthy
 *  connection: < 1s. Anything past 8s is hung — surface a retry. */
const SIGNIN_STEP_TIMEOUT_MS = 8_000

function flowLog(t0: number, step: string, extra?: unknown): void {
  // eslint-disable-next-line no-console
  console.log(`[gf-signin] +${Math.round(performance.now() - t0)}ms ${step}`, extra ?? '')
}

// PromiseLike so we can race the PostgrestBuilder (a thenable, not
// a real Promise) the same way we race signInWithPassword.
function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}_timeout`)), ms)
    p.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

export default function SignInPage() {
  const t = useTranslations('auth')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async (form: Form) => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setServerError(tErrors('general'))
      return
    }
    setServerError(null)
    setPending(true)
    const t0 = performance.now()
    flowLog(t0, 'signInWithPassword start')

    let signInResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>
    try {
      signInResult = await withTimeout(
        supabase.auth.signInWithPassword(form),
        SIGNIN_STEP_TIMEOUT_MS,
        'password',
      )
    } catch (err) {
      console.error('[gf-signin] password hung/threw:', err)
      setPending(false)
      setServerError(
        "Sign-in took too long. Check your connection and tap 'Sign in' again.",
      )
      return
    }
    flowLog(t0, 'signInWithPassword done', { hasError: !!signInResult.error })

    const { error, data } = signInResult
    if (error) {
      setPending(false)
      // "Invalid login credentials" is what Supabase returns both for a
      // genuinely wrong password AND for an account that exists but was
      // created via Google OAuth (so there's literally no password to
      // match). Surface a hint about Forgot password / Google sign-in
      // instead of just relaying the raw message — it's the single
      // biggest "I can't sign in" support cause.
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('invalid login credentials')) {
        setServerError(
          'Email or password is wrong. If you signed up with Google, use the Google button — or tap “Forgot your password?” below to set one.',
        )
      } else {
        setServerError(error.message || tErrors('general'))
      }
      return
    }

    flowLog(t0, 'profile.fetch start')
    let role: string = 'user'
    try {
      const { data: profileRow } = await withTimeout(
        supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle(),
        SIGNIN_STEP_TIMEOUT_MS,
        'profile_fetch',
      )
      role = (profileRow as { role?: string } | null)?.role ?? 'user'
      flowLog(t0, 'profile.fetch done', { role })
    } catch (err) {
      // Profile fetch hung — we still want to land the user somewhere
      // useful since they ARE signed in. Default to the user
      // dashboard; if their actual role is different, requireRole on
      // that page will route them correctly.
      console.warn('[gf-signin] profile fetch timed out, defaulting role:', err)
    }
    const dest =
      role === 'admin'
        ? '/admin'
        : role === 'nutritionist'
          ? '/nutritionist'
          : '/dashboard'
    // Wipe any cached tier from a previous account on this device. The
    // never-downgrade rule in AuthContext otherwise stamps a stale 'vip'
    // tier onto the new sign-in (e.g. admin signing in after a VIP demo
    // session would briefly chrome the dashboard as VIP).
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('gf_tier')
        window.localStorage.removeItem('gf_tier_ts')
      } catch {
        /* private mode — fine */
      }
    }
    // Inside Capacitor, the session is in localStorage and invisible
    // to the server. Bridge it to cookies so server-rendered pages
    // and API routes see the authenticated user on the very next
    // navigation. 3s timeout; non-fatal on failure.
    if (typeof window !== 'undefined' && data.session) {
      try {
        const { isInsideCapacitor } = await import('@/lib/is-capacitor')
        if (isInsideCapacitor()) {
          flowLog(t0, 'cookie-bridge start')
          await withTimeout(
            fetch('/api/auth/bridge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }),
            }),
            3000,
            'bridge',
          )
          flowLog(t0, 'cookie-bridge done')
        }
      } catch (err) {
        console.warn('[gf-signin] cookie bridge failed (non-fatal):', err)
      }
    }

    flowLog(t0, 'navigate', { dest })
    toast.success(t('signInTitle'))
    router.replace(dest)
  }

  return (
    <AuthSplitShell quoteKey="quoteSignInBody">
      <header className="mb-8">
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: '2rem', lineHeight: 1.15 }}
        >
          {t('signInTitle')}
        </h1>
        <p className="mt-2 text-sm text-fg-2">{t('signInSub')}</p>
      </header>

      <Suspense fallback={null}>
        <OAuthErrorBanner />
      </Suspense>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          error={errors.email ? tErrors('invalidEmail') : undefined}
          {...register('email')}
        />

        <Field
          label={t('password')}
          type="password"
          autoComplete="current-password"
          placeholder={t('passwordPlaceholder')}
          reveal
          trailing={
            <Link
              href="/forgot-password"
              className="text-lime-400 hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          }
          error={errors.password ? tErrors('required') : undefined}
          {...register('password')}
        />

        <PrimarySubmit pending={pending}>{t('signInCta')}</PrimarySubmit>

        {serverError && (
          <div
            role="alert"
            className="mt-3 rounded-[10px] p-3 text-sm text-red-400"
            style={{
              background: 'rgb(127 29 29 / 0.5)',
              border: '1px solid rgb(153 27 27 / 0.5)',
            }}
          >
            {serverError}
          </div>
        )}
      </form>

      <GoogleAuthButton />

      <OrDivider label={t('or')} />

      <Link
        href="/sign-up"
        className="block w-full text-center rounded-[10px] py-3.5 px-4 text-[15px] text-fg-1 transition-colors duration-fast ease-out hover:bg-fg-1/5"
        style={{ border: '1px solid rgb(255 255 255 / 0.12)' }}
      >
        {t('dontHaveAccount')}{' '}
        <span className="text-lime-400 font-medium">{t('signUpCta')}</span>
      </Link>
    </AuthSplitShell>
  )
}

const ERROR_LABELS: Record<string, { en: string; ar: string }> = {
  no_code: {
    en: 'Google sign-in was cancelled. Please try again.',
    ar: 'تم إلغاء تسجيل الدخول. حاول مرة أخرى.',
  },
  service_unavailable: {
    en: 'Sign-in service is temporarily unavailable. Please try again shortly.',
    ar: 'خدمة تسجيل الدخول غير متاحة حالياً. حاول لاحقاً.',
  },
  auth_error: {
    en: "We couldn't complete sign-in. Please try again or use email + password.",
    ar: 'تعذّر إكمال تسجيل الدخول. حاول مرة أخرى أو استخدم البريد وكلمة السر.',
  },
}

function OAuthErrorBanner() {
  const sp = useSearchParams()
  const locale = useLocale() as 'en' | 'ar'
  const error = sp?.get('error')
  if (!error) return null
  const meta = ERROR_LABELS[error] ?? ERROR_LABELS.auth_error
  return (
    <div
      role="alert"
      className="mb-6 rounded-[10px] p-3 text-sm text-red-400"
      style={{
        background: 'rgb(127 29 29 / 0.5)',
        border: '1px solid rgb(153 27 27 / 0.5)',
      }}
    >
      {meta[locale]}
    </div>
  )
}
