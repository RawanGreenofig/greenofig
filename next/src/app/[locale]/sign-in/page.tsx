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
    const { error, data } = await supabase.auth.signInWithPassword(form)
    if (error) {
      setPending(false)
      setServerError(error.message || tErrors('general'))
      return
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()
    const role = (profileRow as { role?: string } | null)?.role ?? 'user'
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
