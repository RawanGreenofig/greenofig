'use client'


import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  User,
  Target,
  Bell,
  CreditCard,
  Shield,
  Camera,
  Check,
  Sparkles,
  Plus,
  X,
  Download,
  AlertTriangle,
  LogOut,
  KeyRound,
  Trash2,
  ArrowRight,
  Eye,
  type LucideIcon,
} from '@/icons'
import { useUser } from '@/lib/hooks/useUser'
import { useAuth } from '@/context/AuthContext'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import { useLocale } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { resolveDisplayName } from '@/lib/displayName'

type TabKey =
  | 'profile'
  | 'goals'
  | 'notifications'
  | 'subscription'
  | 'account'

type Channels = { email: boolean; push: boolean; sms: boolean }
type NotifTopic =
  | 'dailyReminders'
  | 'mealPlan'
  | 'bookings'
  | 'messages'
  | 'community'
  | 'marketing'

const NOTIF_TOPICS: NotifTopic[] = [
  'dailyReminders',
  'mealPlan',
  'bookings',
  'messages',
  'community',
  'marketing',
]

interface NotifPrefs {
  channels: Record<NotifTopic, Channels>
  quietHours: { enabled: boolean; from: string; to: string }
}

interface ProfileForm {
  fullName: string
  phone: string
  dob: string
  gender: 'female' | 'male' | 'preferNotToSay' | 'other' | ''
  heightCm: string
  weightKg: string
}

interface GoalsForm {
  primaryGoal: 'lose_weight' | 'build_muscle' | 'maintain' | 'energy' | 'medical' | ''
  targetWeightKg: string
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete' | ''
  preferences: Set<string>
  allergies: string[]
  conditions: string[]
}

const TABS: { key: TabKey; Icon: LucideIcon }[] = [
  { key: 'profile',       Icon: User },
  { key: 'goals',          Icon: Target },
  { key: 'notifications',  Icon: Bell },
  { key: 'subscription',   Icon: CreditCard },
  { key: 'account',        Icon: Shield },
]

const VALID_TABS: TabKey[] = [
  'profile',
  'goals',
  'notifications',
  'subscription',
  'account',
]

function isTabKey(v: string | null): v is TabKey {
  return !!v && (VALID_TABS as readonly string[]).includes(v)
}

/**
 * Open the Stripe billing portal. Wraps every step that can throw
 * (fetch, response.json, redirect) so a bad response can never
 * surface as an unhandled "Application error" on the client.
 */
async function openBillingPortal(): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/stripe/portal', { method: 'POST' })
  } catch {
    toast.error('Network error — please try again')
    return
  }
  // The portal route returns { url } on success or { error: { code,
  // message } } on failure (jsonError shape). Coerce any error variant
  // to a plain string for toast.
  let data: {
    url?: string
    error?: string | { code?: string; message?: string }
  } = {}
  try {
    data = await res.json()
  } catch {
    /* non-JSON body — fall through with empty `data` */
  }
  if (res.ok && data.url) {
    try {
      window.location.href = data.url
    } catch {
      toast.error('Could not open billing portal')
    }
    return
  }
  const message =
    typeof data.error === 'string'
      ? data.error
      : data.error?.message ?? `Could not open billing portal (${res.status})`
  toast.error(message)
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function SettingsPage() {
  // useSearchParams must live inside a Suspense boundary or Next 14
  // refuses to prerender the page. Wrapping the whole thing keeps
  // the implementation co-located while satisfying the contract.
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  )
}

function SettingsPageInner() {
  const t = useTranslations('settings')
  const tNav = useTranslations('nav')
  const { profile, tier } = useUser()
  const { user, signOut } = useAuth()
  // Auth-derived strings (tier label, profile name, initials) flip
  // between SSR (no session → "free" / "Guest") and CSR (real
  // session → "vip" / "Demo VIP"). Gate the visible labels behind a
  // mount flag so the first client render matches the server, then
  // the real values fade in on the next paint.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // Honor `?tab=subscription` (or any other valid tab key) on first
  // render so deep links from upgrade flows / Stripe redirects land
  // on the right pane. Falls back to profile if the param is missing
  // or unknown.
  const initialSearchParams = useSearchParams()
  const initialTabParam = initialSearchParams?.get('tab') ?? null
  const [tab, setTab] = useState<TabKey>(
    isTabKey(initialTabParam) ? initialTabParam : 'profile',
  )

  // Keep the active tab in sync if the URL changes after mount —
  // e.g. the cancel link routes back here with ?tab=subscription.
  useEffect(() => {
    if (isTabKey(initialTabParam) && initialTabParam !== tab) {
      setTab(initialTabParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTabParam])
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Hydrate forms from `profile` once
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: '',
    phone: '',
    dob: '',
    gender: '',
    heightCm: '',
    weightKg: '',
  })
  const [goals, setGoals] = useState<GoalsForm>({
    primaryGoal: '',
    targetWeightKg: '',
    activityLevel: '',
    preferences: new Set(),
    allergies: [],
    conditions: [],
  })
  const [notif, setNotif] = useState<NotifPrefs>(() => ({
    channels: NOTIF_TOPICS.reduce(
      (acc, topic) => ({
        ...acc,
        [topic]: {
          email: topic !== 'marketing',
          push: ['dailyReminders', 'bookings', 'messages'].includes(topic),
          sms: false,
        },
      }),
      {} as Record<NotifTopic, Channels>,
    ),
    quietHours: { enabled: true, from: '22:00', to: '07:00' },
  }))

  useEffect(() => {
    if (!profile) return
    // Fall back to Google's user_metadata.full_name when profile.full_name
    // hasn't been set (Google sign-ups land here on first login).
    const metaFullName =
      typeof user?.user_metadata?.full_name === 'string'
        ? (user.user_metadata.full_name as string)
        : ''
    setProfileForm({
      fullName: profile.full_name ?? metaFullName ?? '',
      phone: profile.phone ?? '',
      dob: profile.date_of_birth ?? '',
      gender: (profile.gender as ProfileForm['gender']) ?? '',
      heightCm: profile.height_cm ? String(profile.height_cm) : '',
      weightKg: profile.weight_kg ? String(profile.weight_kg) : '',
    })
    setGoals({
      primaryGoal: (profile.primary_goal as GoalsForm['primaryGoal']) ?? '',
      targetWeightKg: profile.target_weight_kg
        ? String(profile.target_weight_kg)
        : '',
      activityLevel:
        (profile.activity_level as GoalsForm['activityLevel']) ?? '',
      preferences: new Set(profile.dietary_preferences ?? []),
      allergies: profile.allergies ?? [],
      conditions: profile.health_conditions ?? [],
    })
  }, [profile, user?.user_metadata])

  const markDirty = () => {
    if (!dirty) setDirty(true)
    if (saveState === 'saved') setSaveState('idle')
  }

  const save = () => {
    setSaveState('saving')

    void (async () => {
      const supabase = getBrowserSupabase()
      if (supabase && profile?.id) {
        const patch: Record<string, unknown> = {}
        // Profile pane fields
        if (tab === 'profile') {
          patch.full_name = profileForm.fullName
          patch.phone = profileForm.phone
          patch.date_of_birth = profileForm.dob || null
          patch.gender = profileForm.gender || null
          patch.height_cm = profileForm.heightCm ? Number(profileForm.heightCm) : null
          patch.weight_kg = profileForm.weightKg ? Number(profileForm.weightKg) : null
        }
        if (tab === 'goals') {
          patch.primary_goal = goals.primaryGoal || null
          patch.target_weight_kg = goals.targetWeightKg ? Number(goals.targetWeightKg) : null
          patch.activity_level = goals.activityLevel || null
          patch.dietary_preferences = Array.from(goals.preferences)
          patch.allergies = goals.allergies
          patch.health_conditions = goals.conditions
        }
        if (Object.keys(patch).length > 0) {
          await supabase
            .from('profiles')
            .update(patch as never)
            .eq('id', profile.id)
        }
      }
      setSaveState('saved')
      setDirty(false)
    })()
  }

  const displayName = resolveDisplayName(profile, user, 'Guest')
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  // Tier pill colours come from the [data-tier="..."] CSS vars set on
  // the dashboard root in globals.css. Using vars here means the
  // badge ALWAYS matches the live tier — no JS lookup that can race
  // with React's render cycle and end up gray when the text says
  // "vip" (which happened with the prior inline-style approach).

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Back to dashboard */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: '#666' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#4ade80')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#666')}
      >
        <ArrowRight className="w-3 h-3 rtl:rotate-0 rotate-180" strokeWidth={2} />
        <span>{t('title')}</span>
      </Link>

      {/* Profile summary */}
      <section className="glass-effect rounded-2xl p-5 flex flex-wrap items-center gap-5">
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--gf-primary-text)',
            flexShrink: 0,
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 24,
          }}
          suppressHydrationWarning
        >
          {mounted ? initials.slice(0, 2).toUpperCase() : ''}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className="text-xl font-bold"
              style={{ color: 'var(--gf-fg-1)', minHeight: 28 }}
              suppressHydrationWarning
            >
              {mounted ? displayName : ''}
            </p>
            <span
              className="tier-pill tier-pill-md"
              style={{
                opacity: mounted ? 1 : 0,
                minWidth: 40,
              }}
              suppressHydrationWarning
            >
              {mounted ? tier ?? 'free' : ''}
            </span>
          </div>
          {user?.email && (
            <p
              className="mt-1 text-sm truncate"
              style={{ color: 'var(--gf-fg-3)' }}
              dir="ltr"
            >
              {user.email}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 rounded-lg px-4 h-10 text-sm font-medium transition-colors"
          style={{
            background: 'var(--gf-card-hover)',
            border: '1px solid var(--gf-border)',
            color: 'var(--gf-fg-3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171'
            e.currentTarget.style.borderColor = '#f87171'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#888'
            e.currentTarget.style.borderColor = '#2a2a2a'
          }}
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          {tNav('signOut')}
        </button>
      </section>

      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          <span className="gradient-text">{t('title')}</span>
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar tabs (lg+) / horizontal scroll (sm) */}
        <nav
          aria-label="Settings tabs"
          className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto -mx-1 px-1 lg:overflow-visible lg:mx-0 lg:px-0 pb-1 lg:pb-0"
        >
          {TABS.map(({ key, Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`shrink-0 inline-flex items-center gap-3 rounded-[10px] px-4 py-[10px] text-[14px] font-medium transition-colors lg:w-full lg:text-start ${
                  active
                    ? 'bg-primary/15 text-lime-400'
                    : 'text-fg-2 hover:text-fg-1 hover:bg-surface'
                }`}
                style={{ minHeight: 44 }}
              >
                <Icon
                  className="flex-shrink-0"
                  strokeWidth={1.75}
                  style={{ width: 18, height: 18 }}
                />
                {t(`tabs.${key}` as 'tabs.profile')}
              </button>
            )
          })}
        </nav>

        {/* Content */}
        <div className="lg:col-span-9 space-y-6">
          {tab === 'profile' && (
            <ProfilePane
              t={t}
              email={user?.email ?? ''}
              form={profileForm}
              onChange={(f) => {
                setProfileForm(f)
                markDirty()
              }}
            />
          )}

          {tab === 'goals' && (
            <GoalsPane
              t={t}
              goals={goals}
              onChange={(g) => {
                setGoals(g)
                markDirty()
              }}
            />
          )}

          {tab === 'notifications' && (
            <NotifPane
              t={t}
              prefs={notif}
              onChange={(p) => {
                setNotif(p)
                markDirty()
              }}
              userId={user?.id ?? null}
            />
          )}

          {tab === 'subscription' && (
            <SubscriptionPane t={t} tier={tier ?? 'free'} />
          )}

          {tab === 'account' && (
            <AccountPane
              t={t}
              email={user?.email ?? ''}
            />
          )}
        </div>
      </div>

      {/* Sticky save bar */}
      {tab !== 'subscription' && tab !== 'account' && (
        <SaveBar
          t={t}
          dirty={dirty}
          state={saveState}
          onSave={save}
          onDiscard={() => {
            setDirty(false)
            setSaveState('idle')
          }}
        />
      )}
    </motion.div>
  )
}

/* ── Tab panes ──────────────────────────────────────────────────── */

function ProfilePane({
  t,
  email,
  form,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  email: string
  form: ProfileForm
  onChange: (f: ProfileForm) => void
}) {
  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) =>
    onChange({ ...form, [k]: v })
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { user } = useAuth()

  const onPickFile = async (file: File | null) => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) {
      toast.error('Storage unavailable')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (upErr) {
        toast.error(upErr.message || 'Upload failed')
        return
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = pub.publicUrl
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url } as never)
        .eq('id', user.id)
      if (updErr) {
        toast.error('Saved file but could not update profile')
        return
      }
      toast.success('Photo uploaded — refresh to see it')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Section title={t('profile.sectionPhoto')}>
        <div className="flex flex-wrap items-center gap-5">
          <span
            aria-hidden
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4ade80, #65a30d)',
              color: '#0d1a12',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              textAlign: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {form.fullName ? initialsOf(form.fullName) : <Camera className="w-6 h-6" strokeWidth={1.5} />}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              {uploading ? 'Uploading…' : t('profile.uploadPhoto')}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!user) return
                const supabase = getBrowserSupabase()
                if (!supabase) return
                const { error: e } = await supabase
                  .from('profiles')
                  .update({ avatar_url: null } as never)
                  .eq('id', user.id)
                if (e) toast.error('Could not remove photo')
                else toast.success('Photo removed — refresh to see it')
              }}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-medium text-fg-2 hover:text-fg-1"
            >
              {t('profile.removePhoto')}
            </button>
          </div>
          <p className="text-xs text-fg-3 ms-auto">{t('profile.photoHint')}</p>
        </div>
      </Section>

      <Section title={t('profile.sectionPersonal')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('profile.fullName')}>
            <TextInput
              value={form.fullName}
              onChange={(v) => set('fullName', v)}
              placeholder={t('profile.fullNamePh')}
            />
          </Field>
          <Field label={t('profile.email')} hint={t('profile.emailReadOnly')}>
            <TextInput value={email} onChange={() => {}} readOnly />
          </Field>
          <Field label={t('profile.phone')}>
            <TextInput
              value={form.phone}
              onChange={(v) => set('phone', v)}
              placeholder={t('profile.phonePh')}
              ltr
            />
          </Field>
          <Field label={t('profile.dob')}>
            <TextInput
              type="date"
              value={form.dob}
              onChange={(v) => set('dob', v)}
              ltr
            />
          </Field>
          <Field label={t('profile.gender')}>
            <SelectInput
              value={form.gender}
              onChange={(v) => set('gender', v as ProfileForm['gender'])}
              options={[
                ['', '—'],
                ['female', t('profile.genderOptions.female')],
                ['male', t('profile.genderOptions.male')],
                ['preferNotToSay', t('profile.genderOptions.preferNotToSay')],
                ['other', t('profile.genderOptions.other')],
              ]}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('profile.sectionBody')}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('profile.height')}>
            <TextInput
              type="number"
              value={form.heightCm}
              onChange={(v) => set('heightCm', v)}
              ltr
              suffix="cm"
            />
          </Field>
          <Field label={t('profile.weight')}>
            <TextInput
              type="number"
              value={form.weightKg}
              onChange={(v) => set('weightKg', v)}
              ltr
              suffix="kg"
            />
          </Field>
        </div>
      </Section>
    </div>
  )
}

function GoalsPane({
  t,
  goals,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  goals: GoalsForm
  onChange: (g: GoalsForm) => void
}) {
  const togglePref = (key: string) => {
    const next = new Set(goals.preferences)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onChange({ ...goals, preferences: next })
  }

  const PRIMARY_GOALS: GoalsForm['primaryGoal'][] = [
    'lose_weight',
    'build_muscle',
    'maintain',
    'energy',
    'medical',
  ]

  const ACTIVITY: GoalsForm['activityLevel'][] = [
    'sedentary',
    'light',
    'moderate',
    'active',
    'athlete',
  ]

  const PREFS = [
    'vegan',
    'vegetarian',
    'pescatarian',
    'keto',
    'lowCarb',
    'glutenFree',
    'dairyFree',
    'halal',
    'mediterranean',
  ]

  return (
    <div className="space-y-6">
      <Section title={t('goals.sectionPrimary')}>
        <p className="text-sm text-fg-2 mb-3">{t('goals.primaryGoal')}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {PRIMARY_GOALS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onChange({ ...goals, primaryGoal: g })}
              className={`rounded-lg border p-3 text-start text-sm transition-colors ${
                goals.primaryGoal === g
                  ? 'border-primary/60 bg-primary/10 text-fg-1'
                  : 'border-border bg-surface text-fg-2 hover:border-primary/40 hover:text-fg-1'
              }`}
            >
              {t(`goals.primaryOptions.${g}` as 'goals.primaryOptions.lose_weight')}
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-xs">
          <Field label={t('goals.targetWeight')}>
            <TextInput
              type="number"
              value={goals.targetWeightKg}
              onChange={(v) => onChange({ ...goals, targetWeightKg: v })}
              ltr
              suffix="kg"
            />
          </Field>
        </div>
      </Section>

      <Section title={t('goals.sectionActivity')}>
        <p className="text-sm text-fg-2 mb-3">{t('goals.activityLevel')}</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {ACTIVITY.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onChange({ ...goals, activityLevel: a })}
              className={`rounded-lg border h-12 px-3 text-sm transition-colors ${
                goals.activityLevel === a
                  ? 'border-primary/60 bg-primary/10 text-fg-1'
                  : 'border-border bg-surface text-fg-2 hover:border-primary/40 hover:text-fg-1'
              }`}
            >
              {t(`goals.activityOptions.${a}` as 'goals.activityOptions.sedentary')}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('goals.sectionDiet')}>
        <p className="text-sm text-fg-2 mb-3">{t('goals.preferences')}</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {PREFS.map((p) => {
            const on = goals.preferences.has(p)
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePref(p)}
                className={
                  on
                    ? 'px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all border'
                    : 'px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all glass-effect border-border text-fg-3 hover:border-primary/30'
                }
                style={
                  on
                    ? {
                        background: 'rgba(132,204,22,0.12)',
                        borderColor: 'rgba(132,204,22,0.4)',
                        color: '#a3e635',
                      }
                    : undefined
                }
              >
                {t(`goals.preferenceOptions.${p}` as 'goals.preferenceOptions.vegan')}
              </button>
            )
          })}
        </div>

        <Field label={t('goals.allergies')}>
          <ChipInput
            values={goals.allergies}
            placeholder={t('goals.allergiesPh')}
            onChange={(v) => onChange({ ...goals, allergies: v })}
          />
        </Field>

        <div className="mt-4">
          <Field label={t('goals.conditions')}>
            <ChipInput
              values={goals.conditions}
              placeholder={t('goals.conditionsPh')}
              onChange={(v) => onChange({ ...goals, conditions: v })}
            />
          </Field>
        </div>
      </Section>
    </div>
  )
}

function NotifPane({
  t,
  prefs,
  onChange,
  userId,
}: {
  t: ReturnType<typeof useTranslations>
  prefs: NotifPrefs
  onChange: (p: NotifPrefs) => void
  userId: string | null
}) {
  const { permission, enableNotifications, loading } =
    usePushNotifications(userId)
  const setChannel = (topic: NotifTopic, channel: keyof Channels, on: boolean) => {
    onChange({
      ...prefs,
      channels: {
        ...prefs.channels,
        [topic]: { ...prefs.channels[topic], [channel]: on },
      },
    })
  }
  return (
    <div className="space-y-6">
      {/* Push notifications opt-in card */}
      <div
        style={{
          background: 'var(--gf-surface-raised)',
          border: '1px solid var(--gf-border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--gf-fg-1)',
            marginBottom: 8,
          }}
        >
          Push Notifications
        </h3>
        <p
          style={{
            fontSize: 14,
            color: 'var(--gf-fg-2)',
            marginBottom: 16,
            lineHeight: 1.6,
          }}
        >
          Get notified on your phone when Nutritionist Coach Rawan sends you a message,
          assigns a meal plan, or posts in the community — even when the app
          is closed.
        </p>
        {permission === 'granted' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#a3e635',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            ✓ Push notifications are enabled
          </div>
        ) : permission === 'denied' ? (
          <p style={{ color: '#f87171', fontSize: 13 }}>
            Notifications blocked. Enable them in your browser/phone settings
            then refresh.
          </p>
        ) : permission === 'unsupported' ? (
          <p style={{ color: 'var(--gf-fg-3)', fontSize: 13 }}>
            This device doesn&apos;t support web push notifications.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void enableNotifications()}
            disabled={loading}
            className="btn-primary"
            style={{ height: 44, padding: '0 24px', fontSize: 14 }}
          >
            {loading ? 'Setting up…' : '🔔 Enable Push Notifications'}
          </button>
        )}
      </div>

      <Section title={t('notif.sectionEmail')}>
        <ul className="dash-card-lift rounded-xl border border-border bg-surface divide-y divide-border">
          {NOTIF_TOPICS.map((topic) => {
            const ch = prefs.channels[topic]
            return (
              <li
                key={topic}
                className="flex items-center gap-4 px-5 py-4 w-full overflow-hidden"
                style={{ minWidth: 0 }}
              >
                <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
                  <p className="text-sm font-medium text-fg-1">
                    {t(`notif.topics.${topic}` as 'notif.topics.dailyReminders')}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
                    {t(
                      `notif.topics.${topic}Body` as 'notif.topics.dailyRemindersBody',
                    )}
                  </p>
                </div>
                <div
                  className="flex items-center shrink-0"
                  style={{ gap: 20, marginInlineStart: 16 }}
                >
                  <div className="flex flex-col items-center" style={{ gap: 6 }}>
                    <span
                      className="text-[10px] uppercase text-fg-3 font-medium"
                      style={{
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('notif.channelEmail')}
                    </span>
                    <Toggle
                      enabled={ch.email}
                      onChange={(v) => setChannel(topic, 'email', v)}
                    />
                  </div>
                  <div className="flex flex-col items-center" style={{ gap: 6 }}>
                    <span
                      className="text-[10px] uppercase text-fg-3 font-medium"
                      style={{
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('notif.channelPush')}
                    </span>
                    <Toggle
                      enabled={ch.push}
                      onChange={(v) => setChannel(topic, 'push', v)}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title={t('notif.quietHours')}>
        <div className="dash-card-lift rounded-xl border border-border bg-surface p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg-1">
              {t('notif.quietHours')}
            </p>
            <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
              {t('notif.quietHoursBody')}
            </p>
          </div>
          <Toggle
            enabled={prefs.quietHours.enabled}
            onChange={(v) =>
              onChange({
                ...prefs,
                quietHours: { ...prefs.quietHours, enabled: v },
              })
            }
          />
          {prefs.quietHours.enabled && (
            <div className="w-full flex items-center gap-3">
              <Field label={t('notif.from')} className="flex-1">
                <TextInput
                  type="time"
                  value={prefs.quietHours.from}
                  onChange={(v) =>
                    onChange({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, from: v },
                    })
                  }
                  ltr
                />
              </Field>
              <Field label={t('notif.to')} className="flex-1">
                <TextInput
                  type="time"
                  value={prefs.quietHours.to}
                  onChange={(v) =>
                    onChange({
                      ...prefs,
                      quietHours: { ...prefs.quietHours, to: v },
                    })
                  }
                  ltr
                />
              </Field>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}

function UpgradeSuccessBanner() {
  const sp = useSearchParams()
  if (sp?.get('upgrade') !== 'success') return null
  const tier = sp?.get('tier') ?? ''
  const niceTier = tier.charAt(0).toUpperCase() + tier.slice(1)
  return (
    <div
      role="status"
      className="rounded-xl p-4 border"
      style={{
        background: 'rgb(132 204 22 / 0.12)',
        borderColor: 'rgb(132 204 22 / 0.4)',
        color: '#f0ede6',
      }}
    >
      🎉 Welcome to {niceTier}! Your plan has been upgraded.
    </div>
  )
}

type TierKey = 'free' | 'basic' | 'premium' | 'vip'

const TIER_CONFIG: Record<TierKey, {
  name: string
  color: string
  badge: string
  price: string
  currency: string
  features: string
}> = {
  free: {
    name: 'Free',
    color: '#6b7280',
    badge: '#1f2937',
    price: '0',
    currency: '',
    features:
      '3 food scans/day · Community read access · Basic tracking',
  },
  basic: {
    name: 'Basic',
    color: '#60a5fa',
    badge: '#1e3a5f',
    price: '9',
    currency: 'USD/mo',
    features:
      'Unlimited scans · Full community · Progress charts · Recipe library',
  },
  premium: {
    name: 'Premium',
    color: '#a3e635',
    badge: '#1a2e0a',
    price: '19',
    currency: 'USD/mo',
    features:
      'Everything in Basic · Direct messaging · Custom meal plans · AI assistant',
  },
  vip: {
    name: 'VIP',
    color: '#fbbf24',
    badge: '#2d1f00',
    price: '39',
    currency: 'USD/mo',
    features:
      'Everything in Premium · Monthly consultation · Priority support · Exclusive products',
  },
}

const TIER_ORDER: TierKey[] = ['free', 'basic', 'premium', 'vip']

interface ComparisonRow {
  feature: string
  values: Record<TierKey, string | true | false>
}

const COMPARISON: ComparisonRow[] = [
  { feature: 'Food scans/day',  values: { free: '3',    basic: '∞',    premium: '∞',    vip: '∞'    } },
  { feature: 'Meal tracking',   values: { free: true,   basic: true,   premium: true,   vip: true   } },
  { feature: 'Community',       values: { free: 'Read', basic: 'Full', premium: 'Full', vip: 'Full' } },
  { feature: 'Recipe library',  values: { free: false,  basic: true,   premium: true,   vip: true   } },
  { feature: 'Direct messaging',values: { free: false,  basic: false,  premium: true,   vip: true   } },
  { feature: 'Custom meal plan',values: { free: false,  basic: false,  premium: true,   vip: true   } },
  { feature: 'Monthly consult', values: { free: false,  basic: false,  premium: false,  vip: true   } },
  { feature: 'Priority support',values: { free: false,  basic: false,  premium: false,  vip: true   } },
]

function SubscriptionPane({
  t,
  tier,
}: {
  t: ReturnType<typeof useTranslations>
  tier: string
}) {
  const safeTier = (TIER_ORDER as readonly string[]).includes(tier)
    ? (tier as TierKey)
    : 'free'
  const cfg = TIER_CONFIG[safeTier]
  const isFree = safeTier === 'free'
  const isVip = safeTier === 'vip'
  const renewISO = '2026-06-03'
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  const startUpgrade = async (target: TierKey) => {
    if (upgrading || target === safeTier) return
    setUpgrading(true)
    try {
      // If the user already has a paid subscription, switching tiers
      // (premium → vip, basic → premium, etc.) belongs in the billing
      // portal so Stripe handles proration and never creates a duplicate
      // subscription. Free → paid is the only flow that goes through
      // Checkout.
      const isUpgradeOnExistingSub =
        safeTier === 'basic' || safeTier === 'premium' || safeTier === 'vip'
      if (isUpgradeOnExistingSub) {
        await openBillingPortal()
        return
      }

      const origin = window.location.origin
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'subscription',
          tier: target,
          cycle: 'monthly',
          successUrl: `${origin}/dashboard?upgraded=1`,
          cancelUrl: `${origin}/dashboard/settings?tab=subscription`,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { url?: string }
        | null
      if (data?.url) {
        window.location.href = data.url
        return
      }
      alert("Couldn't start checkout. Please try again.")
    } catch (e) {
      console.error('Checkout error:', e)
      alert('Something went wrong. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <UpgradeSuccessBanner />
      </Suspense>

      {/* ── Big current-plan card ─────────────────────────── */}
      <article
        className="rounded-3xl"
        style={{
          background: 'var(--gf-surface-raised)',
          border: `2px solid ${cfg.color}`,
          boxShadow: `0 0 24px ${cfg.color}22`,
          padding: 28,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <span
            className="inline-flex items-center"
            style={{
              background: cfg.badge,
              color: cfg.color,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 20px',
              borderRadius: 999,
            }}
          >
            {cfg.name}
          </span>
          <p className="font-mono" dir="ltr">
            <span
              style={{ fontSize: 32, fontWeight: 700, color: 'var(--gf-fg-1)' }}
            >
              {cfg.price}
            </span>
            {cfg.currency && (
              <span
                className="ms-1"
                style={{ fontSize: 16, color: 'var(--gf-fg-3)' }}
              >
                {cfg.currency}
              </span>
            )}
          </p>
        </div>

        <p
          className="mt-4"
          style={{ fontSize: 18, fontWeight: 600, color: 'var(--gf-fg-1)' }}
        >
          You are on the {cfg.name} plan
        </p>
        <p className="mt-2" style={{ fontSize: 14, color: 'var(--gf-fg-3)' }}>
          {cfg.features}
        </p>

        {!isFree && (
          <p
            className="mt-2 font-mono"
            style={{ fontSize: 12, color: 'var(--gf-fg-3)' }}
            dir="ltr"
          >
            {t('sub.renewsOn', {
              date: new Date(renewISO).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
            })}
          </p>
        )}

        {/* Action row */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isVip ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void openBillingPortal()
                }}
                className="btn-secondary"
              >
                Manage billing
              </button>
              <span style={{ fontSize: 14, color: 'var(--gf-fg-2)' }}>
                You&apos;re on our best plan! 🎉
              </span>
            </>
          ) : safeTier === 'premium' ? (
            <>
              <button
                type="button"
                onClick={() => startUpgrade('vip')}
                disabled={upgrading}
                className="inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-transform hover:-translate-y-px disabled:cursor-wait disabled:opacity-70"
                style={{
                  background:
                    'linear-gradient(to bottom, #fbbf24, #d97706)',
                  color: '#0d1a12',
                  border: '1px solid rgba(217, 119, 6, 0.6)',
                  height: 40,
                  padding: '0 20px',
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                }}
              >
                {upgrading ? (
                  <>
                    <span
                      aria-hidden
                      className="w-4 h-4 rounded-full border-2 animate-spin"
                      style={{
                        borderColor: 'rgba(13,26,18,0.2)',
                        borderTopColor: '#0d1a12',
                      }}
                    />
                    Redirecting…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                    Upgrade to VIP →
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  void openBillingPortal()
                }}
                className="btn-secondary"
              >
                Manage billing
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => startUpgrade('premium')}
              disabled={upgrading}
              className="btn-primary disabled:cursor-wait disabled:opacity-70"
            >
              {upgrading ? (
                <>
                  <span
                    aria-hidden
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{
                      borderColor: 'rgba(13,26,18,0.2)',
                      borderTopColor: '#0d1a12',
                    }}
                  />
                  Redirecting…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                  Upgrade to Premium →
                </>
              )}
            </button>
          )}
        </div>
      </article>

      {/* ── Plan comparison table ───────────────────────── */}
      <article
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--gf-surface-raised)',
          border: '1px solid var(--gf-border)',
        }}
      >
        <header
          className="px-5 py-4"
          style={{ borderBottom: '1px solid var(--gf-border)' }}
        >
          <p
            className="text-xs uppercase font-semibold"
            style={{ letterSpacing: '0.15em', color: 'var(--gf-fg-3)' }}
          >
            Plan comparison
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--gf-border)' }}>
                <th className="text-start px-5 py-3" style={{ color: 'var(--gf-fg-3)' }}>
                  Feature
                </th>
                {TIER_ORDER.map((k) => {
                  const isCurr = k === safeTier
                  const c = TIER_CONFIG[k]
                  return (
                    <th
                      key={k}
                      className="px-3 py-3 text-center"
                      style={{
                        color: isCurr ? c.color : 'var(--gf-fg-2)',
                        background: isCurr ? `${c.color}1a` : 'transparent',
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {c.name}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--gf-border)',
                  }}
                >
                  <td
                    className="px-5 py-3"
                    style={{ color: 'var(--gf-fg-2)' }}
                  >
                    {row.feature}
                  </td>
                  {TIER_ORDER.map((k) => {
                    const v = row.values[k]
                    const isCurr = k === safeTier
                    const c = TIER_CONFIG[k]
                    return (
                      <td
                        key={k}
                        className="px-3 py-3 text-center"
                        style={{
                          background: isCurr ? `${c.color}0d` : 'transparent',
                        }}
                      >
                        {v === true ? (
                          <Check
                            className="inline w-4 h-4"
                            strokeWidth={2.5}
                            style={{ color: c.color }}
                          />
                        ) : v === false ? (
                          <X
                            className="inline w-4 h-4"
                            strokeWidth={2}
                            style={{ color: 'var(--gf-fg-4, #94a3b8)' }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isCurr ? c.color : 'var(--gf-fg-1)',
                            }}
                          >
                            {v}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {/* Subtle cancel link — funnels users to the Stripe billing portal
       * which handles cancellation. Hidden on free tier where there's
       * nothing to cancel. */}
      {!isFree && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="transition-colors hover:underline"
            style={{
              fontSize: 12,
              color: 'var(--gf-fg-4, #94a3b8)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t('sub.cancelPlan')}
          </button>
        </div>
      )}

      <Section title={t('sub.paymentMethod')}>
        {isFree ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-fg-3">
            {t('sub.noPaymentMethod')}
          </div>
        ) : (
          <div className="dash-card-lift rounded-xl border border-border bg-surface p-5 flex items-center gap-4">
            <span
              className="w-12 h-9 rounded-md bg-gradient-to-br from-fg-2/20 to-bg-deeper border border-border inline-flex items-center justify-center font-mono text-[10px] uppercase tracking-eyebrow text-fg-3 font-bold"
              aria-hidden
            >
              VISA
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-fg-1" dir="ltr">
                •••• •••• •••• 4242
              </p>
              <p className="text-xs text-fg-3 mt-0.5" dir="ltr">
                Exp 04 / 28
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
            >
              {t('sub.updateCard')}
            </button>
          </div>
        )}
      </Section>

      <Section title={t('sub.invoices')}>
        {isFree ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-fg-3">
            {t('sub.noInvoices')}
          </div>
        ) : (
          <ul className="dash-card-lift rounded-xl border border-border bg-surface divide-y divide-border">
            {[
              { id: 'INV-20480', date: '2026-05-03', amount: 15 },
              { id: 'INV-20422', date: '2026-04-03', amount: 15 },
              { id: 'INV-20371', date: '2026-03-03', amount: 15 },
            ].map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-mono text-fg-1" dir="ltr">
                    {inv.id}
                  </p>
                  <p className="text-xs text-fg-3 font-mono" dir="ltr">
                    {new Date(inv.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="font-mono text-sm text-fg-1" dir="ltr">
                  {inv.amount} USD
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t('sub.viewInvoice')}
                    className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
                  >
                    <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label={t('sub.downloadAll')}
                    className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {confirmCancel && (
        <ConfirmDialog
          title={t('sub.cancelConfirm')}
          body={t('sub.cancelConfirmBody')}
          cancelLabel={t('sub.keepPlan')}
          confirmLabel={t('sub.yesCancel')}
          confirmTone="warn"
          onCancel={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false)
            void openBillingPortal()
          }}
        />
      )}
    </div>
  )
}

function AccountPane({
  t,
  email,
}: {
  t: ReturnType<typeof useTranslations>
  email: string
}) {
  const [twoFa, setTwoFa] = useState(false)
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const switchLocale = (next: Locale) => {
    if (next === locale) return
    try {
      window.localStorage.setItem('greenofig.locale', next)
    } catch {
      /* fine */
    }
    document.cookie = `NEXT_LOCALE=${next}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
    router.replace(pathname, { locale: next })
  }
  const [confirmDel, setConfirmDel] = useState(false)
  const [delEmail, setDelEmail] = useState('')
  const canDelete = delEmail.trim().toLowerCase() === email.toLowerCase()

  return (
    <div className="space-y-6">
      <Section title={t('account.sectionLanguage')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={t('account.language')}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => switchLocale('en')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  locale === 'en'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'glass-effect border-border text-fg-3'
                }`}
              >
                {t('account.languageEn')}
              </button>
              <button
                type="button"
                onClick={() => switchLocale('ar')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  locale === 'ar'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'glass-effect border-border text-fg-3'
                }`}
              >
                {t('account.languageAr')}
              </button>
            </div>
          </Field>
          <Field label={t('account.units')}>
            <SelectInput
              value={units}
              onChange={(v) => setUnits(v as 'metric' | 'imperial')}
              options={[
                ['metric', t('account.metric')],
                ['imperial', t('account.imperial')],
              ]}
            />
          </Field>
          <Field label={t('account.timezone')}>
            <TextInput
              value="(GMT+03) Amman"
              onChange={() => {}}
              readOnly
            />
          </Field>
        </div>
      </Section>

      <Section title={t('account.sectionSecurity')}>
        <div className="dash-card-lift rounded-xl border border-border bg-surface p-5 space-y-5">
          <div>
            <p className="text-sm font-medium text-fg-1 mb-3 inline-flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-fg-3" strokeWidth={1.75} />
              {t('account.changePassword')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <PasswordInput placeholder={t('account.currentPassword')} />
              <PasswordInput placeholder={t('account.newPassword')} />
              <PasswordInput placeholder={t('account.confirmPassword')} />
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
              <p className="text-sm font-medium text-fg-1">
                {t('account.twoFa')}
              </p>
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

          <div className="pt-5 border-t border-border">
            <p className="text-sm font-medium text-fg-1 mb-3">
              {t('account.sessions')}
            </p>
            <div className="rounded-lg bg-bg-deeper/50 border border-border p-3 flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full bg-lime-400 shrink-0"
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg-1">{t('account.currentSession')}</p>
                <p className="text-xs text-fg-3 font-mono" dir="ltr">
                  Chrome · Windows · Amman
                </p>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-medium text-fg-2 hover:text-fg-1"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('account.signOutAll')}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t('account.sectionData')}>
        <div className="dash-card-lift rounded-xl border border-border bg-surface p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg-1">
              {t('account.exportData')}
            </p>
            <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
              {t('account.exportDataBody')}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('account.exportDataCta')}
          </button>
        </div>
      </Section>

      <Section title={t('account.sectionDanger')} tone="danger">
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 flex flex-wrap items-start gap-4">
          <span className="shrink-0 inline-flex">
            <AlertTriangle className="w-6 h-6 text-rose-500" strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-fg-1">
              {t('account.deleteAccount')}
            </p>
            <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
              {t('account.deleteAccountBody')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('account.deleteAccountCta')}
          </button>
        </div>
      </Section>

      {confirmDel && (
        <ConfirmDialog
          title={t('account.deleteConfirmTitle')}
          body={t('account.deleteConfirmBody')}
          cancelLabel={t('account.deleteCancel')}
          confirmLabel={t('account.deleteConfirmCta')}
          confirmTone="danger"
          confirmDisabled={!canDelete}
          onCancel={() => {
            setConfirmDel(false)
            setDelEmail('')
          }}
          onConfirm={() => {
            setConfirmDel(false)
            setDelEmail('')
          }}
        >
          <input
            type="email"
            value={delEmail}
            onChange={(e) => setDelEmail(e.target.value)}
            placeholder={t('account.deleteConfirmInputPh')}
            autoFocus
            className="mt-4 w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-rose-500 font-mono"
            dir="ltr"
          />
        </ConfirmDialog>
      )}
    </div>
  )
}

/* ── Reusable bits ──────────────────────────────────────────────── */

function Section({
  title,
  tone,
  children,
}: {
  title: string
  tone?: 'danger'
  children: React.ReactNode
}) {
  return (
    <section>
      <h2
        className={`text-xs uppercase tracking-eyebrow font-semibold mb-3 ${
          tone === 'danger' ? 'text-rose-400' : 'text-fg-3'
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
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
  type = 'text',
  ltr,
  readOnly,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  ltr?: boolean
  readOnly?: boolean
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        dir={ltr ? 'ltr' : undefined}
        className={`w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary ${
          readOnly ? 'cursor-not-allowed opacity-70' : ''
        } ${suffix ? 'pe-10' : ''}`}
      />
      {suffix && (
        <span
          className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono"
          aria-hidden
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

function PasswordInput({ placeholder }: { placeholder: string }) {
  return (
    <input
      type="password"
      placeholder={placeholder}
      className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
    />
  )
}

function SelectInput({
  value,
  onChange,
  options,
  leftIcon: LeftIcon,
}: {
  value: string
  onChange: (v: string) => void
  options: [string, string][]
  leftIcon?: LucideIcon
}) {
  return (
    <div className="relative">
      {LeftIcon && (
        <LeftIcon
          className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3"
          strokeWidth={1.75}
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-10 rounded-md bg-bg-deeper border border-border ${
          LeftIcon ? 'ps-9' : 'ps-3'
        } pe-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none`}
      >
        {options.map(([v, label]) => (
          <option key={v} value={v} className="bg-surface text-fg-1">
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ChipInput({
  values,
  placeholder,
  onChange,
}: {
  values: string[]
  placeholder: string
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (values.includes(v)) {
      setDraft('')
      return
    }
    onChange([...values, v])
    setDraft('')
  }
  const remove = (v: string) => onChange(values.filter((x) => x !== v))
  // Match the canonical dashboard input style — same geometry,
  // background and border as a regular <input> elsewhere in the
  // dashboard (var(--gf-input-bg) on var(--gf-border), 10px radius,
  // h-10). Chips inline on the same baseline as the live input;
  // overflow wraps and the container grows. Focus ring lives on
  // the .chip-input-field class via :focus-within.
  return (
    <div className="chip-input-field">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-pill bg-surface-raised border border-border text-fg-1 text-xs h-7 ps-3 pe-1"
        >
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            aria-label="Remove"
            className="w-5 h-5 rounded-full inline-flex items-center justify-center text-fg-3 hover:text-rose-400"
          >
            <X className="w-3 h-3" strokeWidth={2} />
          </button>
        </span>
      ))}
      {/* The bare-text input look (no second border, no inner bg, no
       * focus ring) is enforced by the `.chip-input-field input` rule
       * in globals.css using `!important` — needed to defeat the
       * dashboard-scope input block which is itself `!important`. */}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !draft && values.length > 0) {
            onChange(values.slice(0, -1))
          }
        }}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-sm text-fg-1 placeholder-fg-3 h-8"
      />
    </div>
  )
}

/**
 * Toggle — div-based switch for the notification preference rows.
 *
 * Uses inline styles + a div root rather than the Tailwind <button>-based
 * <Switch> because flex-shrink interactions in tightly-packed parent rows
 * were collapsing button-based switches to a 1px width on some viewports.
 * The div has minWidth:44 to make collapsing impossible.
 */
function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      role="switch"
      aria-checked={enabled}
      tabIndex={0}
      onClick={() => onChange(!enabled)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!enabled)
        }
      }}
      style={{
        width: 44,
        minWidth: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: enabled ? '#84cc16' : 'rgba(255,255,255,0.12)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 200ms',
        flexShrink: 0,
        display: 'inline-block',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: 'white',
          position: 'absolute',
          top: 3,
          left: enabled ? 23 : 3,
          transition: 'left 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}

function SaveBar({
  t,
  dirty,
  state,
  onSave,
  onDiscard,
}: {
  t: ReturnType<typeof useTranslations>
  dirty: boolean
  state: 'idle' | 'saving' | 'saved'
  onSave: () => void
  onDiscard: () => void
}) {
  const visible = dirty || state === 'saved'
  if (!visible) return null
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
          <span
            className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
            aria-hidden
            style={{ background: '#e8912a' }}
          />
        )}
        <p className="text-sm text-fg-1 flex-1">
          {state === 'saved' ? t('saved') : t('changesUnsaved')}
        </p>
        {state !== 'saved' && (
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-medium text-fg-2 hover:text-fg-1"
          >
            {t('changesUnsaved')}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={state === 'saving' || state === 'saved'}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-5 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {state === 'saving'
            ? t('saving')
            : state === 'saved'
              ? t('saved')
              : t('saveChanges')}
        </button>
      </div>
    </div>
  )
}

function ConfirmDialog({
  title,
  body,
  cancelLabel,
  confirmLabel,
  confirmTone = 'warn',
  confirmDisabled,
  onCancel,
  onConfirm,
  children,
}: {
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  confirmTone?: 'warn' | 'danger'
  confirmDisabled?: boolean
  onCancel: () => void
  onConfirm: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl p-6">
        <h3 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
          <AlertTriangle
            className={`w-4 h-4 ${
              confirmTone === 'danger' ? 'text-rose-400' : 'text-amber-400'
            }`}
            strokeWidth={1.75}
            style={confirmTone !== 'danger' ? { color: '#e8912a' } : undefined}
          />
          {title}
        </h3>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{body}</p>
        {children}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-sm font-medium text-fg-1 hover:border-primary/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`inline-flex items-center gap-1.5 rounded-pill h-10 px-5 text-sm font-semibold transition-colors disabled:opacity-40 ${
              confirmTone === 'danger'
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30'
            }`}
            style={
              confirmTone !== 'danger'
                ? { color: '#e8912a' }
                : undefined
            }
          >
            {confirmLabel}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2.25} />
          </button>
        </div>
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
