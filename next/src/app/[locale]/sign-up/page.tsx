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
  Checkbox,
} from '@/components/auth/AuthControls'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

const schema = z
  .object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    accept: z.boolean().refine((v) => v, { message: 'must accept' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  })
type Form = z.infer<typeof schema>

const PLAN_LABELS: Record<string, { en: string; ar: string }> = {
  basic:   { en: 'Basic',   ar: 'أساسي' },
  premium: { en: 'Premium', ar: 'مميز' },
  vip:     { en: 'VIP',     ar: 'VIP' },
}

function PlanBanner() {
  const tPricing = useTranslations('pricing')
  const locale = useLocale() as 'en' | 'ar'
  const searchParams = useSearchParams()
  const planParam = searchParams?.get('plan') ?? 'free'
  const planMeta = PLAN_LABELS[planParam]
  if (!planMeta) return null
  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-surface-raised border border-primary/40 px-4 py-3">
      <p className="text-sm text-fg-2">
        {tPricing('signingUpFor')}:{' '}
        <span className="text-lime-400 font-semibold">{planMeta[locale]}</span>
      </p>
      <Link
        href="/pricing"
        className="text-xs text-fg-3 hover:text-lime-400 transition-colors"
      >
        {tPricing('changePlan')}
      </Link>
    </div>
  )
}

export default function SignUpPage() {
  const t = useTranslations('auth')
  const tErrors = useTranslations('errors')
  const locale = useLocale() as 'en' | 'ar'
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { accept: false },
  })

  const accepted = watch('accept')

  const onSubmit = async (form: Form) => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setServerError(tErrors('general'))
      return
    }
    setServerError(null)
    setPending(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })
    if (error) {
      setPending(false)
      setServerError(error.message || tErrors('general'))
      return
    }
    toast.success(t('signUpTitle'))
    router.replace('/onboarding')
  }

  return (
    <AuthSplitShell quoteKey="quoteSignUpBody">
      <header className="mb-8">
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: '2rem', lineHeight: 1.15 }}
        >
          {t('signUpTitle')}
        </h1>
        <p className="mt-2 text-sm text-fg-2">{t('signUpSub')}</p>
      </header>

      <Suspense fallback={null}>
        <PlanBanner />
      </Suspense>

      <GoogleAuthButton
        withDivider={false}
        label={locale === 'ar' ? 'إنشاء حساب بـ Google' : 'Sign up with Google'}
      />
      <OrDivider label={t('or')} />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label={t('fullName')}
          autoComplete="name"
          placeholder={t('fullNamePlaceholder')}
          error={errors.fullName ? tErrors('required') : undefined}
          {...register('fullName')}
        />

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
          autoComplete="new-password"
          placeholder={t('passwordPlaceholder')}
          reveal
          error={errors.password ? tErrors('required') : undefined}
          {...register('password')}
        />

        <Field
          label={t('confirmPassword')}
          type="password"
          autoComplete="new-password"
          reveal
          error={
            errors.confirmPassword ? tErrors('validation') : undefined
          }
          {...register('confirmPassword')}
        />

        <div className="my-5">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(v) => setValue('accept', v)}
          >
            {t.rich('agreeToTerms', {
              terms: (chunks) => (
                <Link
                  href="/#"
                  className="text-lime-400 underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/#"
                  className="text-lime-400 underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </Checkbox>
          {errors.accept && (
            <p className="mt-1.5 text-xs text-red-400">
              {tErrors('required')}
            </p>
          )}
        </div>

        <PrimarySubmit pending={pending}>{t('signUpCta')}</PrimarySubmit>

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

      <OrDivider label={t('or')} />

      <Link
        href="/sign-in"
        className="block w-full text-center rounded-[10px] py-3.5 px-4 text-[15px] text-fg-1 transition-colors duration-fast ease-out hover:bg-fg-1/5"
        style={{ border: '1px solid rgb(255 255 255 / 0.12)' }}
      >
        {t('alreadyHaveAccount')}{' '}
        <span className="text-lime-400 font-medium">{t('signInCta')}</span>
      </Link>
    </AuthSplitShell>
  )
}
