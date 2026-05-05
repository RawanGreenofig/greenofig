'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, type UseFormRegister } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useRouter } from '@/i18n/navigation'
import { useAuth } from '@/context/AuthContext'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { AuthShell, AuthField, AuthSubmit } from '@/components/auth/AuthShell'

// All fields are kept as strings (number inputs return strings); we parse
// numerics ourselves in the submit handler to avoid resolver-generic mismatch.
const schema = z.object({
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  height_cm: z.string().optional(),
  weight_kg: z.string().optional(),
  target_weight_kg: z.string().optional(),
  primary_goal: z.string().optional(),
  dietary_preferences: z.string().optional(),
  allergies: z.string().optional(),
  activity_level: z.string().optional(),
  health_conditions: z.string().optional(),
})
type Form = z.infer<typeof schema>

const toNumber = (s: string | undefined): number | null => {
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const t = useTranslations('auth')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const router = useRouter()
  const { user, refresh } = useAuth()

  const [step, setStep] = useState(1)
  const [pending, setPending] = useState(false)

  const { register, handleSubmit, getValues } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  const back = () => setStep((s) => Math.max(1, s - 1))

  const finish = async () => {
    if (!user) {
      toast.error(tErrors('unauthorized'))
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) {
      toast.error(tErrors('general'))
      return
    }
    setPending(true)
    const v = getValues()
    const splitCsv = (s?: string) =>
      s ? s.split(',').map((p) => p.trim()).filter(Boolean) : []

    const update = {
      date_of_birth: v.date_of_birth || null,
      gender: v.gender || null,
      phone: v.phone || null,
      height_cm: toNumber(v.height_cm),
      weight_kg: toNumber(v.weight_kg),
      target_weight_kg: toNumber(v.target_weight_kg),
      primary_goal: v.primary_goal || null,
      dietary_preferences: splitCsv(v.dietary_preferences),
      allergies: splitCsv(v.allergies),
      activity_level: v.activity_level || null,
      health_conditions: splitCsv(v.health_conditions),
    }
    const { error } = await supabase
      .from('profiles')
      // Partial profile typing collides with supabase-js's strict `never`
      // inference on Update; the shape above matches the schema exactly.
      .update(update as never)
      .eq('id', user.id)

    setPending(false)
    if (error) {
      toast.error(error.message || tErrors('general'))
      return
    }
    await refresh()
    router.replace('/dashboard')
  }

  return (
    <AuthShell
      title={t('signUpTitle')}
      subtitle={`${t('signUpSub')} — ${step} / ${TOTAL_STEPS}`}
    >
      {/* Progress bar */}
      <div className="mb-6 h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
        <div
          className="h-full rounded-pill bg-gradient-to-r from-lime-500 to-lime-400 transition-all duration-normal ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <form onSubmit={handleSubmit(finish)} className="space-y-4">
        {step === 1 && <Step1 register={register} />}
        {step === 2 && <Step2 register={register} />}
        {step === 3 && <Step3 register={register} />}
        {step === 4 && <Step4 register={register} />}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={back}
              className="text-sm text-fg-2 hover:text-fg-1 transition-colors"
            >
              {tCommon('back')}
            </button>
          ) : (
            <span />
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={next}
              className="rounded-md bg-surface-raised text-fg-1 px-5 py-2.5 text-sm font-medium hover:bg-surface-raised/80 transition-colors"
            >
              {tCommon('next')}
            </button>
          ) : (
            <AuthSubmit pending={pending}>
              {pending ? tCommon('loading') : tCommon('save')}
            </AuthSubmit>
          )}
        </div>
        {step === 4 && (
          <button
            type="button"
            onClick={finish}
            className="mx-auto block text-xs text-fg-3 hover:text-fg-2 underline"
          >
            {tCommon('next')} / Skip
          </button>
        )}
      </form>
    </AuthShell>
  )
}

function Step1({ register }: { register: UseFormRegister<Form> }) {
  return (
    <>
      <AuthField id="date_of_birth" label="Date of birth" type="date" registerProps={register('date_of_birth')} />
      <AuthField id="gender" label="Gender" registerProps={register('gender')} placeholder="optional" />
      <AuthField id="phone" label="Phone" type="tel" registerProps={register('phone')} />
    </>
  )
}

function Step2({ register }: { register: UseFormRegister<Form> }) {
  return (
    <>
      <AuthField id="height_cm" label="Height (cm)" type="number" registerProps={register('height_cm')} />
      <AuthField id="weight_kg" label="Weight (kg)" type="number" registerProps={register('weight_kg')} />
      <AuthField id="target_weight_kg" label="Target weight (kg)" type="number" registerProps={register('target_weight_kg')} />
    </>
  )
}

function Step3({ register }: { register: UseFormRegister<Form> }) {
  return (
    <>
      <AuthField id="primary_goal" label="Primary goal" registerProps={register('primary_goal')} placeholder="e.g. weight loss, more energy" />
      <AuthField id="dietary_preferences" label="Dietary preferences (comma separated)" registerProps={register('dietary_preferences')} placeholder="halal, mediterranean…" />
      <AuthField id="allergies" label="Allergies (comma separated)" registerProps={register('allergies')} />
      <AuthField id="activity_level" label="Activity level" registerProps={register('activity_level')} placeholder="sedentary, light, moderate, active" />
    </>
  )
}

function Step4({ register }: { register: UseFormRegister<Form> }) {
  return (
    <AuthField
      id="health_conditions"
      label="Health conditions (comma separated, optional)"
      registerProps={register('health_conditions')}
    />
  )
}
