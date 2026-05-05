'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useRouter } from '@/i18n/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthSubmit } from '@/components/auth/AuthShell'

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  })
type Form = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password }: Form) => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      toast.error(tErrors('general'))
      return
    }
    setPending(true)
    const { error } = await supabase.auth.updateUser({ password })
    setPending(false)
    if (error) {
      toast.error(error.message || tErrors('general'))
      return
    }
    toast.success(t('newPasswordTitle'))
    router.replace('/sign-in')
  }

  return (
    <AuthShell title={t('newPasswordTitle')}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AuthField
          id="password"
          label={t('password')}
          type="password"
          autoComplete="new-password"
          required
          placeholder={t('passwordPlaceholder')}
          registerProps={register('password')}
          error={errors.password?.message ? tErrors('required') : undefined}
        />
        <AuthField
          id="confirmPassword"
          label={t('confirmPassword')}
          type="password"
          autoComplete="new-password"
          required
          registerProps={register('confirmPassword')}
          error={
            errors.confirmPassword?.message
              ? tErrors('validation')
              : undefined
          }
        />
        <AuthSubmit pending={pending}>
          {pending ? tCommon('loading') : t('newPasswordCta')}
        </AuthSubmit>
      </form>
    </AuthShell>
  )
}
