'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
