'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Link } from '@/i18n/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { AuthSplitShell } from '@/components/auth/AuthSplitShell'
import {
  Field,
  PrimarySubmit,
} from '@/components/auth/AuthControls'

const schema = z.object({ email: z.string().email() })
type Form = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const tErrors = useTranslations('errors')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email }: Form) => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      toast.error(tErrors('general'))
      return
    }
    setPending(true)
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    })
    setPending(false)
    if (error) {
      // Supabase rate-limits resetPasswordForEmail to ~4 per email per
      // hour (default). The raw message is technical — surface a
      // human one so the user knows to wait, not to keep clicking.
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('rate') || msg.includes('limit') || msg.includes('exceeded')) {
        toast.error(
          'Too many reset requests for this email. Please wait about an hour and try again.',
          { duration: 6000 },
        )
        return
      }
      toast.error(error.message || tErrors('general'))
      return
    }
    setSent(true)
    toast.success(t('resetSubtitle'))
  }

  return (
    <AuthSplitShell quoteKey="quoteForgotBody">
      <header className="mb-8">
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: '2rem', lineHeight: 1.15 }}
        >
          {t('resetTitle')}
        </h1>
        <p className="mt-2 text-sm text-fg-2">{t('resetSubtitle')}</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Field
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          error={errors.email ? tErrors('invalidEmail') : undefined}
          disabled={sent}
          {...register('email')}
        />

        <PrimarySubmit pending={pending}>
          {sent ? t('resetSubtitle') : t('resetCta')}
        </PrimarySubmit>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/sign-in"
          className="text-sm text-lime-400 hover:underline"
        >
          {t('backToSignIn')}
        </Link>
      </div>
    </AuthSplitShell>
  )
}
