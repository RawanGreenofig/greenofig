'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  User as UserIcon,
  CreditCard,
  Activity,
  AlertTriangle,
  LogIn,
  KeyRound,
  Ban,
  Trash2,
  Check,
  Save,
  Coffee,
  Scale,
  Calendar as CalIcon,
  Sparkles,
  PenLine,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { TIERS, type Tier } from '@/lib/constants'

type Role = 'user' | 'nutritionist' | 'admin'
type Status = 'active' | 'suspended' | 'invited'
type AdminTab = 'profile' | 'subscription' | 'activity' | 'danger'

interface UserProfile {
  id: string
  fullName: string
  email: string
  phone: string
  role: Role
  tier: Tier
  status: Status
  joinedISO: string
  lastSeenISO: string
  preferredLocale: 'en' | 'ar'
  tierSinceISO: string
  renewsISO: string
  lifetimeValue: number
  initials: string
}

interface ActivityEvent {
  id: string
  hoursAgo: number
  kind:
    | 'signed_in'
    | 'logged_meal'
    | 'weight_logged'
    | 'booked_session'
    | 'tier_changed'
    | 'role_changed'
    | 'post_published'
  payload?: { tier?: string; role?: string }
}

const ROLE_TINT: Record<Role, string> = {
  user: '#9baf9f',
  nutritionist: '#a3e635',
  admin: '#a855f7',
}
const TIER_TINT: Record<Tier, string> = {
  free: '#9baf9f',
  basic: '#06b6d4',
  premium: '#a3e635',
  vip: '#a855f7',
}
const STATUS_META: Record<Status, { tint: string; bg: string }> = {
  active:    { tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)' },
  suspended: { tint: '#f43f5e', bg: 'rgb(244 63 94 / 0.14)' },
  invited:   { tint: '#06b6d4', bg: 'rgb(6 182 212 / 0.14)' },
}

const EVENT_ICON: Record<ActivityEvent['kind'], LucideIcon> = {
  signed_in:        LogIn,
  logged_meal:      Coffee,
  weight_logged:    Scale,
  booked_session:   CalIcon,
  tier_changed:     Sparkles,
  role_changed:     ShieldCheck,
  post_published:   PenLine,
}

const TABS: { key: AdminTab; Icon: LucideIcon }[] = [
  { key: 'profile',      Icon: UserIcon },
  { key: 'subscription', Icon: CreditCard },
  { key: 'activity',     Icon: Activity },
  { key: 'danger',       Icon: AlertTriangle },
]

const SEED_PROFILE: UserProfile = {
  id: 'u1',
  fullName: 'Layla Hijazi',
  email: 'layla@example.com',
  phone: '+962 79 555 1234',
  role: 'user',
  tier: 'vip',
  status: 'active',
  joinedISO: '2026-03-02',
  lastSeenISO: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  preferredLocale: 'ar',
  tierSinceISO: '2026-03-15',
  renewsISO: '2026-06-15',
  lifetimeValue: 240,
  initials: 'LH',
}

const ACTIVITY: ActivityEvent[] = [
  { id: 'a1', hoursAgo: 1,   kind: 'logged_meal' },
  { id: 'a2', hoursAgo: 3,   kind: 'signed_in' },
  { id: 'a3', hoursAgo: 26,  kind: 'weight_logged' },
  { id: 'a4', hoursAgo: 48,  kind: 'logged_meal' },
  { id: 'a5', hoursAgo: 72,  kind: 'booked_session' },
  { id: 'a6', hoursAgo: 168, kind: 'tier_changed', payload: { tier: 'VIP' } },
  { id: 'a7', hoursAgo: 200, kind: 'signed_in' },
  { id: 'a8', hoursAgo: 240, kind: 'post_published' },
]

export default function AdminUserDetailPage() {
  const t = useTranslations('admin.userPage')
  const tStatus = useTranslations('admin.usersPage')
  const tTiers = useTranslations('tiers')
  const params = useParams<{ id: string }>()
  const [tab, setTab] = useState<AdminTab>('profile')

  const live = useSupabaseQuery<UserProfile | null>(async (supabase) => {
    if (!params.id) return null
    type ProfileRow = {
      id: string
      full_name: string | null
      phone: string | null
      role: Role
      tier: Tier
      is_active: boolean
      created_at: string
      last_seen_at: string | null
      preferred_locale: 'en' | 'ar'
    }
    const { data: pRow } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, tier, is_active, created_at, last_seen_at, preferred_locale')
      .eq('id', params.id)
      .maybeSingle()
    const p = pRow as ProfileRow | null
    if (!p) return null

    type SubRow = {
      tier: Tier
      status: string | null
      current_period_end: string | null
      created_at: string
    }
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end, created_at')
      .eq('user_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sub = subRow as SubRow | null

    type OrderRow = { total_jod: number | null }
    const { data: ordersRows } = await supabase
      .from('orders')
      .select('total_jod')
      .eq('user_id', p.id)
      .in('status', ['processing', 'shipped', 'delivered'])
    const lifetime = ((ordersRows as OrderRow[] | null) ?? [])
      .reduce((acc, o) => acc + (o.total_jod ?? 0), 0)

    const name = p.full_name?.trim() || 'Unnamed user'
    const status: Status =
      !p.is_active ? 'suspended' :
      !p.last_seen_at ? 'invited' : 'active'

    return {
      id: p.id,
      fullName: name,
      email: '',
      phone: p.phone ?? '',
      role: p.role,
      tier: p.tier,
      status,
      joinedISO: p.created_at,
      lastSeenISO: p.last_seen_at ?? new Date().toISOString(),
      preferredLocale: p.preferred_locale ?? 'en',
      tierSinceISO: sub?.created_at ?? p.created_at,
      renewsISO: sub?.current_period_end ?? p.created_at,
      lifetimeValue: lifetime,
      initials: name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
    }
  }, [params.id])

  const profile: UserProfile = live.data ?? { ...SEED_PROFILE, id: params.id ?? SEED_PROFILE.id }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-3 hover:text-fg-1"
      >
        <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.75} />
        {t('backToList')}
      </Link>

      {/* Header */}
      <header className="rounded-xl border border-border bg-surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span
              className="shrink-0 w-16 h-16 rounded-full inline-flex items-center justify-center font-display text-xl font-bold"
              style={{
                background: 'linear-gradient(135deg,#5c7262,#2c3e35)',
                color: '#f0ede6',
              }}
            >
              {profile.initials}
            </span>
            <div className="min-w-0">
              <h1
                className="font-display font-bold text-fg-1 tracking-tight"
                style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1 }}
              >
                {profile.fullName}
              </h1>
              <p className="mt-1 text-sm text-fg-3 font-mono truncate" dir="ltr">
                {profile.email} · {profile.phone}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                  style={{
                    background: `${ROLE_TINT[profile.role]}1a`,
                    color: ROLE_TINT[profile.role],
                  }}
                >
                  {tStatus(`roles.${profile.role}` as 'roles.user')}
                </span>
                <span
                  className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                  style={{
                    background: `${TIER_TINT[profile.tier]}1a`,
                    color: TIER_TINT[profile.tier],
                  }}
                >
                  {tTiers(`${profile.tier}.name`)}
                </span>
                <span
                  className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                  style={{
                    background: STATUS_META[profile.status].bg,
                    color: STATUS_META[profile.status].tint,
                  }}
                >
                  {tStatus(`status${profile.status.charAt(0).toUpperCase()}${profile.status.slice(1)}` as 'statusActive')}
                </span>
                <span className="text-[11px] text-fg-3 ms-1" dir="ltr">
                  {t('memberSince', {
                    date: new Date(profile.joinedISO).toLocaleDateString(undefined, {
                      month: 'short',
                      year: 'numeric',
                    }),
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
            >
              <KeyRound className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('actions.resetPassword')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-amber-500/15 h-10 px-4 text-xs font-semibold hover:bg-amber-500/25"
              style={{ color: '#e8912a' }}
            >
              <LogIn className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('actions.impersonate')}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav
        aria-label="Admin user tabs"
        className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1 border-b border-border"
      >
        {TABS.map(({ key, Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium transition-colors relative ${
                active ? 'text-fg-1' : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.75} />
              {t(`tabs.${key}` as 'tabs.profile')}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-0.5 bg-lime-400 rounded-pill"
                />
              )}
            </button>
          )
        })}
      </nav>

      {tab === 'profile'      && <ProfilePane t={t} profile={profile} />}
      {tab === 'subscription' && <SubPane     t={t} profile={profile} tTiers={tTiers} />}
      {tab === 'activity'     && <ActivityPane t={t} events={ACTIVITY} />}
      {tab === 'danger'       && <DangerPane  t={t} status={profile.status} />}
    </div>
  )
}

/* ── Panes ──────────────────────────────────────────────────────── */

function ProfilePane({
  t,
  profile,
}: {
  t: ReturnType<typeof useTranslations>
  profile: UserProfile
}) {
  const [form, setForm] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    role: profile.role as Role,
    tier: profile.tier as Tier,
    preferredLocale: profile.preferredLocale,
  })
  const [saved, setSaved] = useState(false)
  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((c) => ({ ...c, [k]: v }))
    setSaved(false)
  }
  const save = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }
  return (
    <article className="rounded-xl border border-border bg-surface p-5 md:p-6 space-y-5">
      <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
        {t('profile.section')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={t('profile.fullName')}>
          <TextInput value={form.fullName} onChange={(v) => update('fullName', v)} />
        </Field>
        <Field label={t('profile.email')}>
          <TextInput value={profile.email} onChange={() => {}} readOnly />
        </Field>
        <Field label={t('profile.phone')}>
          <TextInput value={form.phone} onChange={(v) => update('phone', v)} ltr />
        </Field>
        <Field label={t('profile.role')}>
          <Select
            value={form.role}
            onChange={(v) => update('role', v as Role)}
            options={[
              ['user', 'User'],
              ['nutritionist', 'Nutritionist'],
              ['admin', 'Admin'],
            ]}
          />
        </Field>
        <Field label={t('profile.tier')}>
          <Select
            value={form.tier}
            onChange={(v) => update('tier', v as Tier)}
            options={TIERS.map((tier) => [tier, tier.toUpperCase()])}
          />
        </Field>
        <Field label={t('profile.preferredLocale')}>
          <Select
            value={form.preferredLocale}
            onChange={(v) => update('preferredLocale', v as 'en' | 'ar')}
            options={[
              ['en', 'English'],
              ['ar', 'العربية'],
            ]}
          />
        </Field>
        <Field label={t('profile.joined')}>
          <TextInput
            value={new Date(profile.joinedISO).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            onChange={() => {}}
            readOnly
            ltr
          />
        </Field>
        <Field label={t('profile.lastSeen')}>
          <TextInput
            value={new Date(profile.lastSeenISO).toLocaleString()}
            onChange={() => {}}
            readOnly
            ltr
          />
        </Field>
      </div>
      <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={save}
          className={`inline-flex items-center gap-1.5 rounded-pill h-10 px-4 text-xs font-semibold transition-all ${
            saved
              ? 'bg-primary/20 text-lime-400'
              : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
              {t('profile.saved')}
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" strokeWidth={2} />
              {t('profile.save')}
            </>
          )}
        </button>
      </div>
    </article>
  )
}

function SubPane({
  t,
  profile,
  tTiers,
}: {
  t: ReturnType<typeof useTranslations>
  profile: UserProfile
  tTiers: ReturnType<typeof useTranslations>
}) {
  if (profile.tier === 'free') {
    return (
      <article className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
        <p className="text-base font-semibold text-fg-1">
          {t('subscription.noSubscription')}
        </p>
        <p className="mt-1 text-sm text-fg-2">{t('subscription.noSubBody')}</p>
      </article>
    )
  }
  return (
    <article className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-5 md:p-6 space-y-4">
      <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
        {t('subscription.section')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label={t('subscription.currentTier')}
          value={tTiers(`${profile.tier}.name`)}
          tint={TIER_TINT[profile.tier]}
        />
        <Stat
          label={t('subscription.lifetimeValue')}
          value={`${profile.lifetimeValue} JOD`}
          mono
        />
        <Stat
          label={t('subscription.renewsOn', {
            date: new Date(profile.renewsISO).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            }),
          })}
          value={t('subscription.since', {
            date: new Date(profile.tierSinceISO).toLocaleDateString(undefined, {
              month: 'short',
              year: 'numeric',
            }),
          })}
        />
      </div>
      <div className="pt-4 border-t border-primary/20 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          {t('subscription.switchTier')}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-10 px-4 text-xs font-semibold hover:bg-rose-500/25"
        >
          {t('subscription.cancelSubscription')}
        </button>
      </div>
    </article>
  )
}

function ActivityPane({
  t,
  events,
}: {
  t: ReturnType<typeof useTranslations>
  events: ActivityEvent[]
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-4">
        {t('activity.section')}
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-fg-3 text-center py-6">
          {t('activity.noActivity')}
        </p>
      ) : (
        <ol className="relative ms-3 border-s-2 border-border space-y-4">
          {events.map((e) => {
            const Icon = EVENT_ICON[e.kind]
            const label =
              e.kind === 'tier_changed'
                ? t('activity.events.tier_changed', { tier: e.payload?.tier ?? '' })
                : e.kind === 'role_changed'
                  ? t('activity.events.role_changed', { role: e.payload?.role ?? '' })
                  : t(`activity.events.${e.kind}` as 'activity.events.signed_in')
            return (
              <li key={e.id} className="relative ps-5">
                <span
                  className="absolute -start-3 w-5 h-5 rounded-full bg-surface border border-border inline-flex items-center justify-center"
                  aria-hidden
                >
                  <Icon className="w-3 h-3 text-lime-400" strokeWidth={1.75} />
                </span>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm text-fg-1">{label}</p>
                  <p className="text-[11px] text-fg-3 font-mono shrink-0" dir="ltr">
                    {formatHours(e.hoursAgo)}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}

function DangerPane({
  t,
  status,
}: {
  t: ReturnType<typeof useTranslations>
  status: Status
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs uppercase tracking-eyebrow text-rose-400 font-semibold">
        {t('danger.section')}
      </h2>

      <article className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-wrap items-start gap-4">
        <Ban
          className="w-6 h-6 text-yellow-500 flex-shrink-0"
          strokeWidth={1.75}
        />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-fg-1">
            {status === 'suspended'
              ? t('actions.unsuspend')
              : t('actions.suspend')}
          </p>
          <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
            {t('danger.suspendBody')}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-amber-500/15 h-9 px-4 text-xs font-semibold hover:bg-amber-500/25"
          style={{ color: '#e8912a' }}
        >
          {status === 'suspended'
            ? t('actions.unsuspend')
            : t('actions.suspend')}
        </button>
      </article>

      <article className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5 flex flex-wrap items-start gap-4">
        <Trash2
          className="w-6 h-6 text-rose-500 flex-shrink-0"
          strokeWidth={1.75}
        />
        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-medium text-fg-1">
            {t('actions.deleteAccount')}
          </p>
          <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
            {t('danger.deleteBody')}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t('actions.deleteAccount')}
        </button>
      </article>
    </div>
  )
}

/* ── Reusables ──────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  readOnly,
  ltr,
}: {
  value: string
  onChange: (v: string) => void
  readOnly?: boolean
  ltr?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      dir={ltr ? 'ltr' : undefined}
      className={`w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary ${
        readOnly ? 'cursor-not-allowed opacity-70' : ''
      }`}
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v} className="bg-surface">
          {l}
        </option>
      ))}
    </select>
  )
}

function Stat({
  label,
  value,
  tint,
  mono,
}: {
  label: string
  value: string
  tint?: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg bg-bg-deeper/40 border border-border px-4 py-3">
      <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: tint ?? 'var(--gf-fg-1)' }}
        dir={mono ? 'ltr' : undefined}
      >
        {value}
      </p>
    </div>
  )
}

function formatHours(h: number): string {
  if (h < 1) return 'now'
  if (h < 24) return `${Math.round(h)}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.round(d / 7)}w ago`
}
