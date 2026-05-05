'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  User,
  Calendar,
  Video,
  Shield,
  Camera,
  Plus,
  X,
  Check,
  KeyRound,
  type LucideIcon,
} from 'lucide-react'

type TabKey = 'profile' | 'availability' | 'sessions' | 'account'
type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

interface DaySchedule {
  open: boolean
  from: string
  to: string
}

interface ProfileForm {
  displayName: string
  title: string
  bio: string
  credentials: string[]
  languages: string
  specialties: string[]
}

interface SessionPricing {
  introCall:  { durationMin: number; priceJod: number; free: boolean }
  followUp:   { durationMin: number; priceJod: number }
  deepDive:   { durationMin: number; priceJod: number }
}

const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

const TABS: { key: TabKey; Icon: LucideIcon }[] = [
  { key: 'profile',      Icon: User },
  { key: 'availability', Icon: Calendar },
  { key: 'sessions',     Icon: Video },
  { key: 'account',      Icon: Shield },
]

function useCurrentUserId() {
  const { profile } = useUser()
  return profile?.id ?? null
}

export default function NutritionistSettingsPage() {
  const currentUserId = useCurrentUserId()
  const t = useTranslations('nutritionist.profileSettings')
  const tNut = useTranslations('nutritionist')
  const [tab, setTab] = useState<TabKey>('profile')
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const [profile, setProfile] = useState<ProfileForm>({
    displayName: 'Dr. Rawan Othman',
    title: 'Clinical Nutritionist · MSc, RD',
    bio:
      "I help women in the Levant rebuild their relationship with food. Mediterranean-rooted, evidence-led, no shame. Five years in clinic, four in private practice.",
    credentials: [
      'MSc Clinical Nutrition — University of Jordan',
      'Registered Dietitian — Jordanian MoH',
      'Certified Functional Nutrition Practitioner',
    ],
    languages: 'Arabic, English',
    specialties: ['PCOS', 'Insulin resistance', 'Mediterranean nutrition', 'Women\'s health'],
  })

  const [schedule, setSchedule] = useState<Record<Day, DaySchedule>>({
    mon: { open: true,  from: '09:00', to: '17:00' },
    tue: { open: true,  from: '09:00', to: '17:00' },
    wed: { open: true,  from: '09:00', to: '17:00' },
    thu: { open: true,  from: '09:00', to: '17:00' },
    fri: { open: false, from: '09:00', to: '17:00' },
    sat: { open: true,  from: '10:00', to: '14:00' },
    sun: { open: false, from: '09:00', to: '17:00' },
  })
  const [vacation, setVacation] = useState(false)
  const [bufferMin, setBufferMin] = useState(15)

  const [pricing, setPricing] = useState<SessionPricing>({
    introCall: { durationMin: 20, priceJod: 0,  free: true },
    followUp:  { durationMin: 30, priceJod: 15, },
    deepDive:  { durationMin: 60, priceJod: 35, },
  })

  const markDirty = () => {
    if (!dirty) setDirty(true)
    if (saveState === 'saved') setSaveState('idle')
  }

  const save = () => {
    setSaveState('saving')

    void (async () => {
      const supabase = getBrowserSupabase()
      if (supabase && currentUserId) {
        const patch: Record<string, unknown> = {}
        if (tab === 'profile') {
          patch.full_name = profile.displayName
          // Bio + role-title + credentials are surfaced in `medical_notes`
          // until we add dedicated columns; serialise as JSON.
          patch.medical_notes = JSON.stringify({
            title: profile.title,
            bio: profile.bio,
            credentials: profile.credentials,
            languages: profile.languages,
            specialties: profile.specialties,
          })
        }
        if (tab === 'availability') {
          patch.medical_notes = JSON.stringify({
            availability: schedule,
            vacation,
            bufferMin,
          })
        }
        if (tab === 'sessions') {
          patch.medical_notes = JSON.stringify({ pricing })
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from('profiles').update(patch as never).eq('id', currentUserId)
        }
      }
      setSaveState('saved')
      setDirty(false)
    })()
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {tNut('settings')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <nav
          aria-label="Settings tabs"
          className="lg:col-span-3 flex lg:flex-col gap-1 overflow-x-auto -mx-1 px-1 lg:overflow-visible lg:mx-0 lg:px-0 pb-1 lg:pb-0"
        >
          {TABS.map(({ key, Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`shrink-0 inline-flex items-center gap-2.5 rounded-lg h-10 px-3 text-sm font-medium transition-colors lg:w-full lg:text-start ${
                  active
                    ? 'bg-primary/15 text-lime-400'
                    : 'text-fg-2 hover:text-fg-1 hover:bg-surface'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {t(`tabs.${key}` as 'tabs.profile')}
              </button>
            )
          })}
        </nav>

        <div className="lg:col-span-9 space-y-6">
          {tab === 'profile' && (
            <ProfilePane
              t={t}
              form={profile}
              onChange={(f) => {
                setProfile(f)
                markDirty()
              }}
            />
          )}

          {tab === 'availability' && (
            <AvailabilityPane
              t={t}
              schedule={schedule}
              vacation={vacation}
              bufferMin={bufferMin}
              onSchedule={(s) => {
                setSchedule(s)
                markDirty()
              }}
              onVacation={(v) => {
                setVacation(v)
                markDirty()
              }}
              onBuffer={(n) => {
                setBufferMin(n)
                markDirty()
              }}
            />
          )}

          {tab === 'sessions' && (
            <SessionsPane
              t={t}
              pricing={pricing}
              onChange={(p) => {
                setPricing(p)
                markDirty()
              }}
            />
          )}

          {tab === 'account' && <AccountPane t={t} />}
        </div>
      </div>

      {tab !== 'account' && (dirty || saveState === 'saved') && (
        <SaveBar t={t} state={saveState} onSave={save} />
      )}
    </div>
  )
}

/* ── Profile pane ──────────────────────────────────────────────── */

function ProfilePane({
  t,
  form,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  form: ProfileForm
  onChange: (f: ProfileForm) => void
}) {
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    onChange({ ...form, [k]: v })

  const addSpecialty = (v: string) => {
    const t = v.trim()
    if (!t || form.specialties.includes(t)) return
    set('specialties', [...form.specialties, t])
  }
  const removeSpecialty = (v: string) =>
    set('specialties', form.specialties.filter((x) => x !== v))

  return (
    <div className="space-y-6">
      <Section title={t('profile.sectionPhoto')}>
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="w-24 h-24 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 text-bg inline-flex items-center justify-center font-display text-3xl font-bold"
          >
            {initialsOf(form.displayName)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
            >
              <Camera className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('profile.uploadPhoto')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-medium text-fg-2 hover:text-fg-1"
            >
              {t('profile.removePhoto')}
            </button>
          </div>
          <p className="text-xs text-fg-3 ms-auto">{t('profile.photoHint')}</p>
        </div>
      </Section>

      <Section title={t('profile.sectionPublic')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('profile.displayName')}>
            <TextInput
              value={form.displayName}
              onChange={(v) => set('displayName', v)}
              placeholder={t('profile.displayNamePh')}
            />
          </Field>
          <Field label={t('profile.title')}>
            <TextInput
              value={form.title}
              onChange={(v) => set('title', v)}
              placeholder={t('profile.titlePh')}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={t('profile.bio')}>
            <textarea
              value={form.bio}
              onChange={(e) => set('bio', e.target.value)}
              rows={5}
              placeholder={t('profile.bioPh')}
              maxLength={600}
              className="w-full resize-y rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
            />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label={t('profile.credentials')}
            hint={t('profile.credentialsHint')}
          >
            <textarea
              value={form.credentials.join('\n')}
              onChange={(e) =>
                set(
                  'credentials',
                  e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 3),
                )
              }
              rows={3}
              className="w-full resize-y rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm font-mono text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
            />
          </Field>
          <Field label={t('profile.languages')}>
            <TextInput
              value={form.languages}
              onChange={(v) => set('languages', v)}
              placeholder={t('profile.languagesPh')}
            />
          </Field>
        </div>
        <div className="mt-4">
          <Field label={t('profile.specialties')}>
            <SpecialtyInput
              values={form.specialties}
              onAdd={addSpecialty}
              onRemove={removeSpecialty}
              addLabel={t('profile.addSpecialty')}
            />
          </Field>
        </div>
      </Section>
    </div>
  )
}

/* ── Availability pane ─────────────────────────────────────────── */

function AvailabilityPane({
  t,
  schedule,
  vacation,
  bufferMin,
  onSchedule,
  onVacation,
  onBuffer,
}: {
  t: ReturnType<typeof useTranslations>
  schedule: Record<Day, DaySchedule>
  vacation: boolean
  bufferMin: number
  onSchedule: (s: Record<Day, DaySchedule>) => void
  onVacation: (v: boolean) => void
  onBuffer: (n: number) => void
}) {
  const update = (day: Day, patch: Partial<DaySchedule>) =>
    onSchedule({ ...schedule, [day]: { ...schedule[day], ...patch } })

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-2">{t('availability.subtitle')}</p>

      <article className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
        {DAYS.map((d) => {
          const cfg = schedule[d]
          return (
            <div
              key={d}
              className="flex flex-wrap items-center gap-4 px-5 py-4"
            >
              <div className="w-32 shrink-0">
                <p className="text-sm font-semibold text-fg-1">
                  {t(`availability.days.${d}` as 'availability.days.mon')}
                </p>
              </div>
              <Switch
                on={cfg.open}
                onChange={(v) => update(d, { open: v })}
              />
              <span className={`text-xs font-semibold w-14 ${cfg.open ? 'text-lime-400' : 'text-fg-3'}`}>
                {cfg.open ? t('availability.open') : t('availability.closed')}
              </span>

              <div className={`flex items-center gap-2 ms-auto ${cfg.open ? '' : 'opacity-40 pointer-events-none'}`}>
                <TimeInput
                  value={cfg.from}
                  onChange={(v) => update(d, { from: v })}
                />
                <span className="text-xs text-fg-3">—</span>
                <TimeInput
                  value={cfg.to}
                  onChange={(v) => update(d, { to: v })}
                />
              </div>
            </div>
          )
        })}
      </article>

      <article className="rounded-xl border border-border bg-surface p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-fg-1">
            {t('availability.vacation')}
          </p>
          <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
            {t('availability.vacationBody')}
          </p>
        </div>
        <Switch on={vacation} onChange={onVacation} />
      </article>

      <article className="rounded-xl border border-border bg-surface p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-fg-1">{t('availability.buffer')}</p>
          <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
            {t('availability.bufferBody')}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-pill bg-bg-deeper border border-border p-1">
          {[0, 5, 15, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onBuffer(n)}
              className={`px-3 h-8 rounded-pill text-xs font-semibold transition-colors ${
                bufferMin === n
                  ? 'bg-primary/20 text-lime-400'
                  : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              {t('availability.minutes', { count: n })}
            </button>
          ))}
        </div>
      </article>
    </div>
  )
}

/* ── Sessions pane ─────────────────────────────────────────────── */

function SessionsPane({
  t,
  pricing,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  pricing: SessionPricing
  onChange: (p: SessionPricing) => void
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-2">{t('sessions.subtitle')}</p>

      <article className="rounded-xl border border-border bg-surface p-5">
        <SessionRow
          t={t}
          name={t('sessions.introCall')}
          tint="#a3e635"
          duration={pricing.introCall.durationMin}
          price={pricing.introCall.priceJod}
          free={pricing.introCall.free}
          onDuration={(n) =>
            onChange({ ...pricing, introCall: { ...pricing.introCall, durationMin: n } })
          }
          onPrice={(n) =>
            onChange({ ...pricing, introCall: { ...pricing.introCall, priceJod: n, free: n === 0 } })
          }
          onFree={(v) =>
            onChange({
              ...pricing,
              introCall: { ...pricing.introCall, free: v, priceJod: v ? 0 : pricing.introCall.priceJod || 10 },
            })
          }
          showFreeToggle
        />
      </article>

      <article className="rounded-xl border border-border bg-surface p-5">
        <SessionRow
          t={t}
          name={t('sessions.followUp')}
          tint="#06b6d4"
          duration={pricing.followUp.durationMin}
          price={pricing.followUp.priceJod}
          onDuration={(n) =>
            onChange({ ...pricing, followUp: { durationMin: n, priceJod: pricing.followUp.priceJod } })
          }
          onPrice={(n) =>
            onChange({ ...pricing, followUp: { ...pricing.followUp, priceJod: n } })
          }
        />
      </article>

      <article className="rounded-xl border border-border bg-surface p-5">
        <SessionRow
          t={t}
          name={t('sessions.deepDive')}
          tint="#a855f7"
          duration={pricing.deepDive.durationMin}
          price={pricing.deepDive.priceJod}
          onDuration={(n) =>
            onChange({ ...pricing, deepDive: { durationMin: n, priceJod: pricing.deepDive.priceJod } })
          }
          onPrice={(n) =>
            onChange({ ...pricing, deepDive: { ...pricing.deepDive, priceJod: n } })
          }
        />
      </article>
    </div>
  )
}

function SessionRow({
  t,
  name,
  tint,
  duration,
  price,
  free,
  showFreeToggle,
  onDuration,
  onPrice,
  onFree,
}: {
  t: ReturnType<typeof useTranslations>
  name: string
  tint: string
  duration: number
  price: number
  free?: boolean
  showFreeToggle?: boolean
  onDuration: (n: number) => void
  onPrice: (n: number) => void
  onFree?: (v: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span
        className="shrink-0 w-10 h-10 rounded-lg inline-flex items-center justify-center"
        style={{ background: `${tint}1a`, color: tint }}
      >
        <Video className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-semibold text-fg-1 flex-1 min-w-0">{name}</p>
      <div className="flex items-center gap-2 ms-auto">
        <Field label={t('sessions.duration')} compact>
          <NumInput
            value={duration}
            onChange={onDuration}
            suffix={t('sessions.minutes')}
          />
        </Field>
        <Field label={t('sessions.price')} compact>
          <div className={free ? 'opacity-40 pointer-events-none' : ''}>
            <NumInput value={price} onChange={onPrice} suffix="JOD" />
          </div>
        </Field>
      </div>
      {showFreeToggle && onFree && (
        <div className="w-full flex items-center gap-3 mt-2 pt-2 border-t border-border">
          <Switch on={!!free} onChange={onFree} />
          <span className="text-xs text-fg-2">{t('sessions.freeIntro')}</span>
        </div>
      )}
    </div>
  )
}

/* ── Account pane ──────────────────────────────────────────────── */

function AccountPane({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [twoFa, setTwoFa] = useState(true)
  const [language, setLanguage] = useState<'en' | 'ar'>('en')

  return (
    <div className="space-y-6">
      <Section title={t('account.language')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('account.language')}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
            >
              <option value="en" className="bg-surface">English</option>
              <option value="ar" className="bg-surface">العربية</option>
            </select>
          </Field>
          <Field label={t('account.timezone')}>
            <TextInput value="(GMT+03) Amman" onChange={() => {}} readOnly />
          </Field>
        </div>
      </Section>

      <Section title={t('account.changePassword')}>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-fg-1 mb-3 inline-flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-fg-3" strokeWidth={1.75} />
              {t('account.changePassword')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="password"
                placeholder={t('account.currentPassword')}
                className="h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
              />
              <input
                type="password"
                placeholder={t('account.newPassword')}
                className="h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
              />
              <input
                type="password"
                placeholder={t('account.confirmPassword')}
                className="h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
            >
              {t('account.changePassword')}
            </button>
          </div>

          <div className="pt-5 border-t border-border flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg-1">{t('account.twoFa')}</p>
              <p className="mt-0.5 text-xs text-fg-3">
                {twoFa ? t('account.twoFaOn') : t('account.twoFaOff')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTwoFa((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
                twoFa
                  ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                  : 'bg-primary/15 text-lime-400 hover:bg-primary/25'
              }`}
            >
              {twoFa ? t('account.twoFaDisable') : t('account.twoFaEnable')}
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ── Reusables ──────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  compact,
  children,
}: {
  label: string
  hint?: string
  compact?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={compact ? 'inline-block' : ''}>
      <label
        className={`block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 ${
          compact ? 'text-end' : ''
        }`}
      >
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-fg-3">{hint}</p>}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  readOnly?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary ${
        readOnly ? 'cursor-not-allowed opacity-70' : ''
      }`}
    />
  )
}

function NumInput({
  value,
  onChange,
  suffix,
}: {
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={`w-24 h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary ${
          suffix ? 'pe-12' : ''
        }`}
        dir="ltr"
      />
      {suffix && (
        <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[11px] text-fg-3 font-mono" aria-hidden>
          {suffix}
        </span>
      )}
    </div>
  )
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md bg-bg-deeper border border-border px-2 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
      dir="ltr"
    />
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`shrink-0 relative w-10 h-6 rounded-full transition-colors ${
        on ? 'bg-lime-400' : 'bg-bg-deeper border border-border'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-bg shadow transition-all ${
          on ? 'start-[18px]' : 'start-0.5'
        }`}
      />
    </button>
  )
}

function SpecialtyInput({
  values,
  addLabel,
  onAdd,
  onRemove,
}: {
  values: string[]
  addLabel: string
  onAdd: (v: string) => void
  onRemove: (v: string) => void
}) {
  const [draft, setDraft] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    onAdd(draft)
    setDraft('')
  }
  return (
    <div className="rounded-md bg-bg-deeper border border-border p-2">
      <ul className="flex flex-wrap items-center gap-1.5 mb-2">
        {values.map((v) => (
          <li key={v}>
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface-raised border border-border text-fg-1 text-xs h-7 ps-3 pe-1">
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                aria-label="Remove"
                className="w-5 h-5 rounded-full inline-flex items-center justify-center text-fg-3 hover:text-rose-400"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={addLabel}
          className="flex-1 h-9 rounded-md bg-bg border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-primary/15 text-lime-400 hover:bg-primary/25"
          aria-label={addLabel}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
        </button>
      </form>
    </div>
  )
}

function SaveBar({
  t,
  state,
  onSave,
}: {
  t: ReturnType<typeof useTranslations>
  state: 'idle' | 'saving' | 'saved'
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-screen-md">
      <div
        className={`rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 px-4 py-3 ${
          state === 'saved'
            ? 'border-primary/40 bg-primary/10'
            : 'border-border bg-surface/95'
        }`}
      >
        {state === 'saved' ? (
          <Check className="w-4 h-4 text-lime-400" strokeWidth={2.5} />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#e8912a' }} />
        )}
        <p className="text-sm text-fg-1 flex-1">
          {state === 'saved' ? t('saved') : 'Unsaved changes'}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={state === 'saving' || state === 'saved'}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-5 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {state === 'saving' ? t('saving') : state === 'saved' ? t('saved') : t('saveChanges')}
        </button>
      </div>
    </div>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
