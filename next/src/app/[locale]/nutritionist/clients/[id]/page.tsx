'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Calendar as CalIcon,
  MessageSquare,
  ClipboardList,
  Lightbulb,
  Scale,
  StickyNote,
  CalendarDays,
  Files,
  TrendingDown,
  TrendingUp,
  Minus,
  Flame,
  Droplets,
  Pill,
  Clock,
  CheckCircle2,
  Plus,
  Upload,
  ArrowRight,
  Video,
  type LucideIcon,
} from '@/icons'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Link } from '@/i18n/navigation'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import type { Tier } from '@/lib/constants'

type Status = 'onTrack' | 'atRisk' | 'inactive'
type ClientTab =
  | 'overview'
  | 'plan'
  | 'logs'
  | 'progress'
  | 'notes'
  | 'bookings'
  | 'messages'
  | 'files'

interface ClientProfile {
  id: string
  name: string
  initials: string
  email: string
  phone: string
  joinedISO: string
  tier: Tier
  status: Status
  primaryGoal: string
  preferences: string[]
  allergies: string[]
  conditions: string[]
  startWeight: number
  currentWeight: number
  targetWeight: number
  lastLogHours: number
  adherencePct: number
  hasPlan: boolean
}

const TABS: { key: ClientTab; Icon: LucideIcon }[] = [
  { key: 'overview', Icon: ClipboardList },
  { key: 'plan',     Icon: Lightbulb },
  { key: 'logs',     Icon: Flame },
  { key: 'progress', Icon: Scale },
  { key: 'notes',    Icon: StickyNote },
  { key: 'bookings', Icon: CalendarDays },
  { key: 'messages', Icon: MessageSquare },
  { key: 'files',    Icon: Files },
]

const STATUS_META: Record<Status, { tint: string; bg: string }> = {
  onTrack:  { tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)' },
  atRisk:   { tint: '#e8912a', bg: 'rgb(232 145 42 / 0.14)' },
  inactive: { tint: '#9baf9f', bg: 'rgb(155 175 159 / 0.14)' },
}

const TIER_TINT: Record<Tier, string> = {
  free:    '#9baf9f',
  basic:   '#06b6d4',
  premium: '#a3e635',
  vip:     '#a855f7',
}

const SEED_PROFILE: ClientProfile = {
  id: 'c1',
  name: 'Layla Hijazi',
  initials: 'LH',
  email: 'layla@example.com',
  phone: '+962 79 555 1234',
  joinedISO: '2026-03-02',
  tier: 'vip',
  status: 'onTrack',
  primaryGoal: 'Lose 5 kg in 3 months',
  preferences: ['Mediterranean', 'High-protein', 'Halal'],
  allergies: ['Tree nuts'],
  conditions: ['PCOS'],
  startWeight: 78.4,
  currentWeight: 75.4,
  targetWeight: 73.0,
  lastLogHours: 3,
  adherencePct: 84,
  hasPlan: true,
}

function buildWeightSeries(start: number, days = 30) {
  const today = new Date()
  const series: { date: string; weight: number }[] = []
  let w = start
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    w = w - 0.04 + Math.sin(i / 5) * 0.18
    series.push({ date: d.toISOString().slice(5, 10), weight: +w.toFixed(1) })
  }
  return series
}

export default function ClientDetailPage() {
  const t = useTranslations('nutritionist.client')
  const tStatus = useTranslations('nutritionist.clientStatus')
  const tTiers = useTranslations('tiers')
  const params = useParams<{ id: string }>()
  const [tab, setTab] = useState<ClientTab>('overview')

  const live = useSupabaseQuery<ClientProfile | null>(async (supabase) => {
    if (!params.id) return null
    type ProfileRow = {
      id: string
      full_name: string | null
      phone: string | null
      role: 'user' | 'nutritionist' | 'admin'
      tier: Tier
      created_at: string
      last_seen_at: string | null
      preferred_locale: 'en' | 'ar'
      weight_kg: number | null
      target_weight_kg: number | null
      primary_goal: string | null
      dietary_preferences: string[] | null
      allergies: string[] | null
      health_conditions: string[] | null
    }
    const { data: row } = await supabase
      .from('profiles')
      .select(
        'id, full_name, phone, role, tier, created_at, last_seen_at, preferred_locale,' +
          ' weight_kg, target_weight_kg, primary_goal, dietary_preferences, allergies, health_conditions',
      )
      .eq('id', params.id)
      .maybeSingle()
    const p = row as ProfileRow | null
    if (!p) return null

    // Earliest weight + last log time
    type EarliestWeight = { weight_kg: number | null }
    const { data: earliest } = await supabase
      .from('progress_entries')
      .select('weight_kg')
      .eq('user_id', p.id)
      .not('weight_kg', 'is', null)
      .order('recorded_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const startWeight = (earliest as EarliestWeight | null)?.weight_kg ?? p.weight_kg ?? 0

    type LastLogRow = { logged_at: string }
    const { data: lastLog } = await supabase
      .from('nutrition_logs')
      .select('logged_at')
      .eq('user_id', p.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const lastLogISO = (lastLog as LastLogRow | null)?.logged_at
    const lastLogHours = lastLogISO
      ? Math.max(0, (Date.now() - new Date(lastLogISO).getTime()) / 3_600_000)
      : 999
    const status: Status =
      lastLogHours > 30 * 24 ? 'inactive' :
      lastLogHours > 4  * 24 ? 'atRisk'   : 'onTrack'

    const { count: planCount } = await supabase
      .from('meal_plans')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', p.id)
      .eq('is_active', true)

    const name = p.full_name?.trim() || 'Unnamed client'
    return {
      id: p.id,
      name,
      initials: initialsOf(name),
      email: '',
      phone: p.phone ?? '',
      joinedISO: p.created_at,
      tier: p.tier,
      status,
      primaryGoal: p.primary_goal ?? '—',
      preferences: p.dietary_preferences ?? [],
      allergies: p.allergies ?? [],
      conditions: p.health_conditions ?? [],
      startWeight,
      currentWeight: p.weight_kg ?? startWeight,
      targetWeight: p.target_weight_kg ?? Math.max(60, startWeight - 5),
      lastLogHours,
      adherencePct: 0,
      hasPlan: (planCount ?? 0) > 0,
    }
  }, [params.id])

  const profile: ClientProfile = live.data ?? {
    ...SEED_PROFILE,
    id: params.id ?? SEED_PROFILE.id,
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/nutritionist/clients"
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
                color: 'var(--gf-fg-1)',
              }}
            >
              {profile.initials}
            </span>
            <div className="min-w-0">
              <h1
                className="font-display font-bold text-fg-1 tracking-tight"
                style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1 }}
              >
                {profile.name}
              </h1>
              <p className="mt-1 text-sm text-fg-3 font-mono truncate" dir="ltr">
                {profile.email} · {profile.phone}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
                  {tStatus(profile.status)}
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
              onClick={() => setTab('messages')}
            >
              <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('sendMessage')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
            >
              <CalIcon className="w-3.5 h-3.5" strokeWidth={2} />
              {t('scheduleSession')}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav
        aria-label="Client sections"
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
              {t(`tabs.${key}` as 'tabs.overview')}
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

      {/* Tab panes */}
      {tab === 'overview' && <OverviewPane t={t} profile={profile} />}
      {tab === 'plan'     && <PlanPane t={t} profile={profile} />}
      {tab === 'logs'     && <LogsPane t={t} profile={profile} />}
      {tab === 'progress' && <ProgressPane t={t} profile={profile} />}
      {tab === 'notes'    && <NotesPane t={t} />}
      {tab === 'bookings' && <BookingsPane t={t} />}
      {tab === 'messages' && <MessagesPane t={t} profile={profile} />}
      {tab === 'files'    && <FilesPane t={t} />}
    </div>
  )
}

/* ── Overview ───────────────────────────────────────────────────── */

function OverviewPane({
  t,
  profile,
}: {
  t: ReturnType<typeof useTranslations>
  profile: ClientProfile
}) {
  const series = useMemo(() => buildWeightSeries(profile.startWeight), [profile.startWeight])
  const delta = +(profile.currentWeight - profile.startWeight).toFixed(1)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* At-a-glance */}
      <article className="rounded-xl border border-border bg-surface p-5 lg:col-span-1 space-y-4">
        <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
          {t('overview.stats')}
        </p>
        <StatRow
          label={t('overview.currentWeight')}
          value={`${profile.currentWeight} kg`}
        />
        <StatRow
          label={t('overview.weightChange')}
          value={
            <DeltaInline kg={delta} />
          }
        />
        <StatRow
          label={t('overview.lastLog')}
          value={`${formatHours(profile.lastLogHours)} ago`}
        />
        <StatRow
          label={t('overview.adherence')}
          value={`${profile.adherencePct}%`}
        />
        <div className="pt-3 border-t border-border space-y-3">
          <KeyVal label={t('overview.primaryGoal')} value={profile.primaryGoal} />
          <KeyChips
            label={t('overview.preferences')}
            items={profile.preferences}
          />
          <KeyChips
            label={t('overview.allergies')}
            items={profile.allergies.length ? profile.allergies : []}
            empty={t('overview.noAllergies')}
            tint="#f43f5e"
          />
          <KeyChips
            label={t('overview.conditions')}
            items={profile.conditions.length ? profile.conditions : []}
            empty={t('overview.noConditions')}
            tint="#a855f7"
          />
        </div>
      </article>

      {/* Trend + summary */}
      <div className="lg:col-span-2 space-y-6">
        <article className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
            {t('overview.trendTitle')}
          </p>
          <div className="w-full h-[260px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cdWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#a3e635" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
                <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={36} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                  labelStyle={{ color: '#9baf9f' }}
                  formatter={(value) => [`${value} kg`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#a3e635"
                  strokeWidth={2}
                  fill="url(#cdWeight)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#a3e635', stroke: '#0d1a12' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
            {t('overview.summary')}
          </p>
          <p className="text-sm text-fg-2 leading-relaxed">
            {t('overview.summaryEmpty')}
          </p>
        </article>
      </div>
    </div>
  )
}

function StatRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </span>
      <span className="text-sm font-semibold text-fg-1 font-mono" dir="ltr">
        {value}
      </span>
    </div>
  )
}

function DeltaInline({ kg }: { kg: number }) {
  const Icon = kg < -0.05 ? TrendingDown : kg > 0.05 ? TrendingUp : Minus
  const tint = kg < -0.05 ? '#a3e635' : kg > 0.05 ? '#f43f5e' : '#9baf9f'
  const sign = kg < 0 ? '−' : kg > 0 ? '+' : ''
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{ color: tint }}
      dir="ltr"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {sign}
      {Math.abs(kg).toFixed(1)} kg
    </span>
  )
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </p>
      <p className="mt-1 text-sm text-fg-1">{value}</p>
    </div>
  )
}

function KeyChips({
  label,
  items,
  empty,
  tint,
}: {
  label: string
  items: string[]
  empty?: string
  tint?: string
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-fg-3 italic">{empty}</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span
              key={it}
              className="rounded-pill h-6 px-2.5 inline-flex items-center text-[11px] font-medium border"
              style={{
                background: tint ? `${tint}10` : 'var(--gf-surface-raised)',
                color: tint ?? 'var(--gf-fg-1)',
                borderColor: tint ? `${tint}40` : 'var(--gf-border)',
              }}
            >
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Plan ───────────────────────────────────────────────────────── */

function PlanPane({
  t,
  profile,
}: {
  t: ReturnType<typeof useTranslations>
  profile: ClientProfile
}) {
  if (!profile.hasPlan) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
        <Lightbulb
          className="w-9 h-9 mx-auto mb-3 text-fg-3"
          strokeWidth={1.5}
        />
        <p className="text-base font-semibold text-fg-1">{t('plan.noPlan')}</p>
        <p className="mt-1 text-sm text-fg-2 max-w-sm mx-auto">
          {t('plan.noPlanBody')}
        </p>
        <Link
          href="/nutritionist/meal-plans"
          className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          {t('plan.assignPlan')}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
        </Link>
      </div>
    )
  }

  const last7 = [78, 92, 84, 70, 88, 95, 82]
  const avg = Math.round(last7.reduce((a, b) => a + b, 0) / last7.length)

  return (
    <div className="space-y-6">
      <article className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-lime-400 font-semibold">
              {t('plan.active')}
            </p>
            <h2 className="mt-1 font-display text-xl md:text-2xl font-bold text-fg-1 tracking-tight">
              Mediterranean reset · Week 2 of 6
            </h2>
            <p className="mt-1 text-xs text-fg-3 font-mono" dir="ltr">
              Started 2026-04-20 · 7 days × 5 meals
            </p>
          </div>
          <Link
            href="/nutritionist/meal-plans"
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            {t('plan.openInBuilder')}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2} />
          </Link>
        </div>
      </article>

      <article className="rounded-xl border border-border bg-surface p-5">
        <header className="flex items-baseline justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-fg-1">
            {t('plan.complianceLast7')}
          </h3>
          <p className="font-mono text-2xl font-bold text-lime-400" dir="ltr">
            {avg}%
          </p>
        </header>
        <div className="grid grid-cols-7 gap-2 items-end h-32">
          {last7.map((v, i) => (
            <div key={i} className="flex flex-col items-center gap-2 h-full">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-lime-600 to-lime-400 transition-all"
                  style={{ height: `${v}%` }}
                />
              </div>
              <span className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
              </span>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

/* ── Logs ───────────────────────────────────────────────────────── */

function LogsPane({
  t,
  profile,
}: {
  t: ReturnType<typeof useTranslations>
  profile: ClientProfile
}) {
  const days = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return {
          iso: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString(undefined, { weekday: 'short' }),
          dayNum: d.getDate(),
          kcal: Math.round(1500 + Math.random() * 400),
          water: Math.round(5 + Math.random() * 4),
          meals: 3 + Math.round(Math.random()),
        }
      }),
    [],
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-2">
        {t('logs.subtitle', { name: profile.name })}
      </p>
      <ul className="rounded-xl border border-border bg-surface divide-y divide-border">
        {days.map((d) => (
          <li
            key={d.iso}
            className="flex items-center gap-4 px-5 py-3 hover:bg-surface-raised transition-colors"
          >
            <div className="shrink-0 w-12 text-center">
              <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {d.label}
              </p>
              <p className="font-mono text-base font-bold text-fg-1" dir="ltr">
                {d.dayNum}
              </p>
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-3 gap-3">
              <Metric Icon={Flame}    tint="#f97316" label={`${d.kcal} kcal`} />
              <Metric Icon={Droplets} tint="#06b6d4" label={`${d.water} glasses`} />
              <Metric Icon={Pill}     tint="#a855f7" label={`${d.meals} meals`} />
            </div>
            <ArrowRight
              className="w-3.5 h-3.5 text-fg-3 shrink-0 rtl:rotate-180"
              strokeWidth={1.75}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function Metric({
  Icon,
  tint,
  label,
}: {
  Icon: LucideIcon
  tint: string
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-mono text-fg-2" dir="ltr">
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: tint }} strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </span>
  )
}

/* ── Progress ───────────────────────────────────────────────────── */

function ProgressPane({
  t,
  profile,
}: {
  t: ReturnType<typeof useTranslations>
  profile: ClientProfile
}) {
  const series = useMemo(() => buildWeightSeries(profile.startWeight, 60), [profile.startWeight])
  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-2">{t('progress.subtitle')}</p>

      <article className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {t('progress.weeks', { count: 8 })}
        </p>
        <div className="w-full h-[260px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cdProg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#a3e635" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={32} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={36} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
                formatter={(value) => [`${value} kg`, '']}
              />
              <Area type="monotone" dataKey="weight" stroke="#a3e635" strokeWidth={2} fill="url(#cdProg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {t('tabs.progress')} · photos
        </p>
        <div className="rounded-lg border-2 border-dashed border-border bg-bg-deeper/40 aspect-[16/5] flex items-center justify-center text-sm text-fg-3">
          {t('progress.noPhotos')}
        </div>
      </article>
    </div>
  )
}

/* ── Notes ──────────────────────────────────────────────────────── */

interface ClinicalNote {
  id: string
  body: string
  createdISO: string
}

function NotesPane({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [notes, setNotes] = useState<ClinicalNote[]>([
    {
      id: 'n1',
      body:
        'Reports better afternoons since switching to lentils for lunch. Sleep 7-8h, energy steady. Continue plan.',
      createdISO: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    },
  ])
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    setSaving(true)
    window.setTimeout(() => {
      setNotes((curr) => [
        {
          id: `n-${Date.now()}`,
          body: draft.trim(),
          createdISO: new Date().toISOString(),
        },
        ...curr,
      ])
      setDraft('')
      setSaving(false)
    }, 350)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-2">{t('notes.subtitle')}</p>

      <form onSubmit={save} className="rounded-xl border border-border bg-surface p-5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={t('notes.placeholder')}
          className="w-full resize-none bg-transparent text-sm text-fg-1 placeholder-fg-3 focus:outline-none leading-relaxed"
        />
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={!draft.trim() || saving}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
            {saving ? '…' : t('notes.save')}
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-fg-3 text-center py-8">{t('notes.noNotes')}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="text-sm text-fg-1 leading-relaxed whitespace-pre-wrap">
                {n.body}
              </p>
              <p className="mt-3 text-[11px] text-fg-3 font-mono" dir="ltr">
                {t('notes.createdAt', {
                  date: new Date(n.createdISO).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Bookings ───────────────────────────────────────────────────── */

function BookingsPane({ t }: { t: ReturnType<typeof useTranslations> }) {
  const rows = [
    { id: 'b1', date: '2026-05-09', time: '15:30', type: 'Follow-up', status: 'upcoming', durationMin: 30 },
    { id: 'b2', date: '2026-04-25', time: '10:00', type: 'Follow-up', status: 'past',     durationMin: 30 },
    { id: 'b3', date: '2026-04-11', time: '16:00', type: 'Deep dive', status: 'past',     durationMin: 60 },
    { id: 'b4', date: '2026-03-28', time: '09:30', type: 'Intro',     status: 'past',     durationMin: 20 },
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-2">{t('bookings.subtitle')}</p>
      <ul className="rounded-xl border border-border bg-surface divide-y divide-border">
        {rows.map((b) => (
          <li
            key={b.id}
            className="flex items-center gap-4 px-5 py-3"
          >
            <CalIcon
              className="w-6 h-6 flex-shrink-0"
              strokeWidth={1.75}
              style={{
                color:
                  b.status === 'upcoming'
                    ? 'var(--gf-primary-text)'
                    : 'var(--gf-fg-3)',
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg-1">{b.type}</p>
              <p className="text-xs text-fg-3 font-mono" dir="ltr">
                {new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
                {b.time} · {b.durationMin}m
              </p>
            </div>
            {b.status === 'upcoming' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60"
              >
                <Video className="w-3.5 h-3.5" strokeWidth={2} />
                Join
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-3">
                <CheckCircle2 className="w-3 h-3" strokeWidth={1.75} />
                done
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Messages ───────────────────────────────────────────────────── */

function MessagesPane({
  t,
  profile,
}: {
  t: ReturnType<typeof useTranslations>
  profile: ClientProfile
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-fg-2 mb-3">{t('messages.subtitle')}</p>
      <ul className="space-y-3 mb-5 max-h-[280px] overflow-y-auto pe-1">
        <ChatBubble
          fromMe={false}
          name={profile.name}
          text="The afternoon plan is so much better. Thank you 🙏"
          ago="2d"
        />
        <ChatBubble
          fromMe
          name="You"
          text="Glad to hear it. Let's check in Thursday."
          ago="2d"
        />
        <ChatBubble
          fromMe={false}
          name={profile.name}
          text="Logged 6h sleep last night, feels related to dinner timing. Thoughts?"
          ago="3h"
        />
      </ul>
      <Link
        href="/nutritionist/messages"
        className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
      >
        {t('messages.openThread')}
        <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2} />
      </Link>
    </article>
  )
}

function ChatBubble({
  fromMe,
  name,
  text,
  ago,
}: {
  fromMe: boolean
  name: string
  text: string
  ago: string
}) {
  return (
    <li className={`flex flex-col ${fromMe ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
          fromMe
            ? 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg rounded-br-md'
            : 'bg-surface-raised text-fg-1 border border-border rounded-bl-md'
        }`}
      >
        {text}
      </div>
      <p className="mt-1 text-[10px] text-fg-3 font-mono" dir="ltr">
        {name} · <Clock className="inline w-2.5 h-2.5" strokeWidth={1.75} />{' '}
        {ago}
      </p>
    </li>
  )
}

/* ── Files ──────────────────────────────────────────────────────── */

function FilesPane({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-2">{t('files.subtitle')}</p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t('files.uploadCta')}
        </button>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
        <Files
          className="w-9 h-9 mx-auto mb-3 text-fg-3"
          strokeWidth={1.5}
        />
        <p className="text-base font-semibold text-fg-1">{t('files.noFiles')}</p>
        <p className="mt-1 text-sm text-fg-2 max-w-sm mx-auto leading-relaxed">
          {t('files.noFilesBody')}
        </p>
      </div>
    </div>
  )
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatHours(h: number): string {
  if (h < 1) return '< 1h'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
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
