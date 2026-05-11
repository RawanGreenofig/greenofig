'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Link, useRouter } from '@/i18n/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { AuthSplitShell } from '@/components/auth/AuthSplitShell'
import { Field, PrimarySubmit } from '@/components/auth/AuthControls'

const schema = z
  .object({
    password: z.string().min(8, 'tooShort'),
    confirmPassword: z.string().min(8, 'tooShort'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  })
type Form = z.infer<typeof schema>

type Stage =
  | 'waiting'   // not yet sure if we have a recovery session
  | 'ready'    // session established, form usable
  | 'expired'  // link bad or expired
  | 'done'     // password updated

/**
 * /reset-password — final step of the forgot-password flow.
 *
 * Two paths Supabase uses to deliver the recovery session:
 *   1. PKCE flow → URL contains ?code=...  We exchange it for a
 *      session here.
 *   2. Implicit flow → URL hash carries tokens + Supabase fires a
 *      PASSWORD_RECOVERY auth-state event.
 *
 * We handle both, then unlock the new-password form once we have a
 * session. updateUser otherwise fails with "Auth session missing!"
 * which is what looked like a "processing forever" hang.
 */
export default function ResetPasswordPage() {
  const t = useTranslations('auth')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('waiting')
  const [pending, setPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) })

  // Establish the recovery session on mount.
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setStage('expired')
      return
    }
    let unmounted = false

    // Path A — PKCE: ?code=... in the search params.
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (unmounted) return
        if (error) {
          console.error('[reset-password] exchangeCodeForSession failed:', error)
          setStage('expired')
        } else {
          setStage('ready')
          // Clean the URL so a refresh doesn't try to re-exchange.
          window.history.replaceState(null, '', window.location.pathname)
        }
      })
    }

    // Path B — implicit: Supabase fires PASSWORD_RECOVERY when it
    // picks up the access_token from the URL hash on init.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (unmounted) return
      if (event === 'PASSWORD_RECOVERY') {
        setStage('ready')
      }
    })

    // Fallback — user already has a valid session (e.g. they're logged
    // in and chose to change their password from settings via this URL).
    void supabase.auth.getSession().then(({ data }) => {
      if (unmounted) return
      if (data.session && stage === 'waiting') setStage('ready')
    })

    // Safety timeout: if neither path resolved within 4 seconds, the
    // link is almost certainly expired or malformed. Stop spinning.
    const timeout = window.setTimeout(() => {
      if (!unmounted && stage === 'waiting') setStage('expired')
    }, 4000)

    return () => {
      unmounted = true
      window.clearTimeout(timeout)
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    setStage('done')
    toast.success(t('newPasswordTitle'))
    window.setTimeout(() => router.replace('/sign-in'), 1200)
  }

  return (
    <AuthSplitShell quoteKey="quoteForgotBody">
      <header className="mb-8">
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: '2rem', lineHeight: 1.15 }}
        >
          {t('newPasswordTitle')}
        </h1>
        <p className="mt-2 text-sm text-fg-2">
          {stage === 'expired'
            ? 'This link has expired or isn’t valid. Request a fresh password reset and try again.'
            : 'Pick a new password to finish resetting your account.'}
        </p>
      </header>

      {stage === 'waiting' && (
        <div className="rounded-xl border border-border bg-surface px-4 py-5 flex items-center gap-3 text-sm text-fg-2">
          <span
            className="w-4 h-4 rounded-full animate-spin shrink-0"
            style={{
              border: '2px solid rgba(132,217,61,0.25)',
              borderTopColor: '#a3e635',
            }}
            aria-hidden
          />
          Verifying your reset link…
        </div>
      )}

      {stage === 'expired' && (
        <div className="space-y-4">
          <div
            className="rounded-xl border px-4 py-4 text-sm"
            style={{
              background: 'rgba(192,57,43,0.08)',
              borderColor: 'rgba(192,57,43,0.35)',
              color: '#fda4af',
            }}
          >
            The reset link is expired or invalid. Start the flow again
            from “Forgot your password?”.
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full h-11 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold text-sm border border-lime-600/60"
          >
            Request new reset link
          </Link>
        </div>
      )}

      {stage === 'done' && (
        <div className="rounded-xl border border-border bg-surface px-4 py-5 text-sm text-fg-1">
          Password updated. Redirecting to sign-in…
        </div>
      )}

      {stage === 'ready' && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field
            label={t('password')}
            type="password"
            autoComplete="new-password"
            placeholder={t('passwordPlaceholder')}
            error={errors.password ? tErrors('validation') : undefined}
            {...register('password')}
          />
          <Field
            label={t('confirmPassword')}
            type="password"
            autoComplete="new-password"
            error={
              errors.confirmPassword?.message === 'mismatch'
                ? 'Passwords don’t match.'
                : errors.confirmPassword
                  ? tErrors('validation')
                  : undefined
            }
            {...register('confirmPassword')}
          />
          <PrimarySubmit pending={pending}>
            {pending ? 'Saving…' : t('newPasswordCta')}
          </PrimarySubmit>
        </form>
      )}

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
