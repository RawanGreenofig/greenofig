'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import {
  Users,
  UserPlus,
  Repeat,
  CalendarClock,
  Download,
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from '@/icons'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

type Period = '7d' | '30d' | '90d' | '1y'

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

interface Kpi {
  Icon: LucideIcon
  labelKey: 'totalClients' | 'newThisPeriod' | 'retention90d' | 'avgSessionsClient'
  value: string
  delta: number
  tint: string
}

const TIER_TINT: Record<string, string> = {
  free: '#9baf9f',
  basic: '#06b6d4',
  premium: '#a3e635',
  vip: '#a855f7',
}

const TOP_POSTS = [
  { title: 'Why protein at breakfast changes your day', views: 1842, likes: 312, comments: 47 },
  { title: 'The PCOS plate, simplified',                views: 2104, likes: 412, comments: 88 },
  { title: 'How to read a Greek yogurt label',          views: 1408, likes: 198, comments: 21 },
  { title: 'The best 20-min weeknight dinners',         views: 1124, likes: 175, comments: 18 },
]

function buildGrowthSeries(days: number): { date: string; clients: number }[] {
  const today = new Date()
  const out: { date: string; clients: number }[] = []
  // We aggregate per week
  const weeks = Math.max(2, Math.ceil(days / 7))
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i * 7)
    const added = 1 + Math.floor(Math.random() * 4)
    out.push({ date: d.toISOString().slice(5, 10), clients: added })
  }
  return out
}

function buildSessionsSeries(days: number): { date: string; sessions: number }[] {
  const today = new Date()
  const weeks = Math.max(2, Math.ceil(days / 7))
  return Array.from({ length: weeks }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (weeks - 1 - i) * 7)
    return {
      date: d.toISOString().slice(5, 10),
      sessions: 8 + Math.floor(Math.random() * 18),
    }
  })
}

const ADHERENCE = [
  { label: 'Wk -3', value: 76 },
  { label: 'Wk -2', value: 81 },
  { label: 'Wk -1', value: 84 },
  { label: 'This',  value: 88 },
]

const TIER_BREAKDOWN: { tier: 'free' | 'basic' | 'premium' | 'vip'; count: number }[] = [
  { tier: 'free',    count: 6 },
  { tier: 'basic',   count: 9 },
  { tier: 'premium', count: 8 },
  { tier: 'vip',     count: 5 },
]

export default function AnalyticsPage() {
  const t = useTranslations('nutritionist.analyticsPage')
  const tNut = useTranslations('nutritionist')
  const tTiers = useTranslations('tiers')
  const [period, setPeriod] = useState<Period>('30d')

  // Real growth (new users per week) and sessions (bookings per week)
  // for the active period. Falls back to the synthetic builder when
  // the DB has nothing yet so the chart isn't blank.
  interface SeriesRes {
    growth: { date: string; clients: number }[]
    sessions: { date: string; sessions: number }[]
    topPosts: { title: string; views: number; likes: number; comments: number }[]
  }
  const seriesRes = useSupabaseQuery<SeriesRes>(async (supabase) => {
    const days = PERIOD_DAYS[period]
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceISO = since.toISOString()

    const [profileRes, bookingRes, postRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('created_at')
        .eq('role', 'user')
        .gte('created_at', sinceISO),
      supabase
        .from('bookings')
        .select('scheduled_at')
        .gte('scheduled_at', sinceISO),
      supabase
        .from('posts')
        .select('title, views, reactions')
        .eq('is_published', true)
        .order('views', { ascending: false })
        .limit(4),
    ])

    const weeks = Math.max(2, Math.ceil(days / 7))
    const buckets: { date: string; clients: number; sessions: number }[] = []
    const today = new Date()
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i * 7)
      buckets.push({ date: d.toISOString().slice(5, 10), clients: 0, sessions: 0 })
    }
    const bucketIndex = (iso: string): number => {
      const ms = new Date(iso).getTime()
      const ageDays = Math.max(0, (today.getTime() - ms) / 86_400_000)
      const idx = weeks - 1 - Math.floor(ageDays / 7)
      return Math.max(0, Math.min(weeks - 1, idx))
    }
    type DatedRow = { created_at?: string; scheduled_at?: string }
    for (const p of (profileRes.data as DatedRow[] | null) ?? []) {
      if (p.created_at) buckets[bucketIndex(p.created_at)]!.clients += 1
    }
    for (const b of (bookingRes.data as DatedRow[] | null) ?? []) {
      if (b.scheduled_at) buckets[bucketIndex(b.scheduled_at)]!.sessions += 1
    }

    type PostRow = {
      title: string
      views: number | null
      reactions: { likes?: number; comments?: number } | null
    }
    const topPosts = ((postRes.data as PostRow[] | null) ?? []).map((r) => ({
      title: r.title,
      views: r.views ?? 0,
      likes: r.reactions?.likes ?? 0,
      comments: r.reactions?.comments ?? 0,
    }))

    return {
      growth: buckets.map(({ date, clients }) => ({ date, clients })),
      sessions: buckets.map(({ date, sessions }) => ({ date, sessions })),
      topPosts,
    }
  }, [period])

  const growth = useMemo(() => {
    if (seriesRes.data && seriesRes.data.growth.some((r) => r.clients > 0)) {
      return seriesRes.data.growth
    }
    return buildGrowthSeries(PERIOD_DAYS[period])
  }, [period, seriesRes.data])
  const sessions = useMemo(() => {
    if (seriesRes.data && seriesRes.data.sessions.some((r) => r.sessions > 0)) {
      return seriesRes.data.sessions
    }
    return buildSessionsSeries(PERIOD_DAYS[period])
  }, [period, seriesRes.data])
  const topPosts =
    seriesRes.data && seriesRes.data.topPosts.length > 0
      ? seriesRes.data.topPosts
      : TOP_POSTS

  // Live aggregates: total clients + new-this-period from profiles, tier breakdown
  interface AggregatesRes {
    totalClients: number
    newThisPeriod: number
    tierBreakdown: { tier: 'free' | 'basic' | 'premium' | 'vip'; count: number }[]
  }
  const live = useSupabaseQuery<AggregatesRes>(async (supabase) => {
    const since = new Date()
    since.setDate(since.getDate() - PERIOD_DAYS[period])

    const [totalRes, newRes, tierRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', since.toISOString()),
      supabase
        .from('profiles')
        .select('tier')
        .eq('role', 'user'),
    ])

    type TierRow = { tier: 'free' | 'basic' | 'premium' | 'vip' }
    const tiers = (tierRes.data as TierRow[] | null) ?? []
    const counts: Record<string, number> = {}
    for (const r of tiers) counts[r.tier] = (counts[r.tier] ?? 0) + 1

    return {
      totalClients: totalRes.count ?? 0,
      newThisPeriod: newRes.count ?? 0,
      tierBreakdown: (['free','basic','premium','vip'] as const).map((tier) => ({
        tier,
        count: counts[tier] ?? 0,
      })),
    }
  }, [period])

  const totalClients = live.data?.totalClients
    ?? TIER_BREAKDOWN.reduce((acc, t) => acc + t.count, 0)
  const newThisPeriod = live.data?.newThisPeriod
    ?? growth.reduce((acc, p) => acc + p.clients, 0)
  const tierBreakdown = (live.data?.tierBreakdown && live.data.tierBreakdown.some((r) => r.count > 0))
    ? live.data.tierBreakdown
    : TIER_BREAKDOWN

  const kpis: Kpi[] = [
    { Icon: Users,          labelKey: 'totalClients',       value: String(totalClients),       delta: 8,  tint: '#a3e635' },
    { Icon: UserPlus,       labelKey: 'newThisPeriod',      value: String(newThisPeriod),      delta: 22, tint: '#06b6d4' },
    { Icon: Repeat,         labelKey: 'retention90d',       value: '82%',                      delta: 4,  tint: '#e8912a' },
    { Icon: CalendarClock,  labelKey: 'avgSessionsClient',  value: '3.4',                      delta: -1, tint: '#a855f7' },
  ]

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {tNut('analytics')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodToggle period={period} onChange={setPeriod} t={t} />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('exportCsv')}
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.labelKey} t={t} kpi={k} />
        ))}
      </section>

      {/* Growth + Sessions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={t('growth')}
          body={t('growthBody')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="anaGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#a3e635" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
              />
              <Area type="monotone" dataKey="clients" stroke="#a3e635" strokeWidth={2} fill="url(#anaGrowth)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t('sessions')}
          body={t('sessionsBody')}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessions} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
              />
              <Bar dataKey="sessions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Tier breakdown + adherence */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="rounded-xl border border-border bg-surface p-5 lg:col-span-1">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-fg-1">
              {t('tierBreakdown')}
            </h2>
            <p className="text-xs text-fg-3 mt-0.5">{t('tierBreakdownBody')}</p>
          </header>
          <ul className="space-y-3">
            {tierBreakdown.map((row) => {
              const pct = totalClients > 0 ? (row.count / totalClients) * 100 : 0
              return (
                <li key={row.tier}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-xs uppercase tracking-eyebrow font-semibold" style={{ color: TIER_TINT[row.tier] }}>
                      {tTiers(`${row.tier}.name`)}
                    </span>
                    <span className="font-mono text-xs text-fg-1" dir="ltr">
                      {row.count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all"
                      style={{ width: `${pct}%`, background: TIER_TINT[row.tier] }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-fg-1">
              {t('adherence')}
            </h2>
            <p className="text-xs text-fg-3 mt-0.5">{t('adherenceBody')}</p>
          </header>
          <div className="grid grid-cols-4 gap-3 items-end h-40">
            {ADHERENCE.map((d) => (
              <div key={d.label} className="flex flex-col items-center gap-2 h-full">
                <span className="font-mono text-sm text-fg-1" dir="ltr">
                  {d.value}%
                </span>
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-lime-600 to-lime-400 transition-all"
                    style={{ height: `${d.value}%` }}
                  />
                </div>
                <span className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Top content */}
      <article className="rounded-xl border border-border bg-surface overflow-hidden">
        <header className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-fg-1">{t('topContent')}</h2>
          <p className="text-xs text-fg-3 mt-0.5">{t('topContentBody')}</p>
        </header>
        <ul className="divide-y divide-border">
          {topPosts.map((p, i) => (
            <li
              key={p.title}
              className="grid grid-cols-[36px_1fr_auto] gap-3 items-center px-5 py-3"
            >
              <span
                className="font-mono text-base font-bold text-fg-3 text-center"
                dir="ltr"
              >
                #{i + 1}
              </span>
              <p className="text-sm text-fg-1 truncate">{p.title}</p>
              <div className="flex items-center gap-3 font-mono text-xs text-fg-3" dir="ltr">
                <Stat Icon={Eye}            value={p.views} />
                <Stat Icon={Heart}          value={p.likes} />
                <Stat Icon={MessageCircle}  value={p.comments} />
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function KpiCard({
  t,
  kpi,
}: {
  t: ReturnType<typeof useTranslations>
  kpi: Kpi
}) {
  const DeltaIcon =
    kpi.delta > 0 ? TrendingUp : kpi.delta < 0 ? TrendingDown : Minus
  const deltaTint =
    kpi.delta > 0 ? '#a3e635' : kpi.delta < 0 ? '#f43f5e' : '#9baf9f'
  // Bare brand-coloured icon next to the label — same sidebar-style
  // pattern used on Store Curation, Clients table, Research library.
  // The kpi tile chrome (w-9 h-9 rounded-lg) was a colour mismatch:
  // the wrapper had teal/blue/orange backgrounds but the icon
  // inside always rendered in lime because @/icons forces its
  // brand colour by default. Now the icon's own colour is the cue.
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <kpi.Icon
          className="w-5 h-5 shrink-0"
          strokeWidth={1.75}
          color={kpi.tint}
        />
        <span
          className="text-[11px] uppercase font-semibold"
          style={{ letterSpacing: '0.1em', color: 'var(--gf-fg-3)' }}
        >
          {t(`kpis.${kpi.labelKey}` as 'kpis.totalClients')}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <p
          className="text-3xl font-bold"
          style={{ color: 'var(--gf-fg-1)', letterSpacing: '-0.02em' }}
          dir="ltr"
        >
          {kpi.value}
        </p>
        <span
          className="inline-flex items-center gap-0.5 text-xs font-semibold font-mono"
          style={{ color: deltaTint }}
          dir="ltr"
        >
          <DeltaIcon
            className="w-3 h-3"
            strokeWidth={2.25}
            color="currentColor"
          />
          {Math.abs(kpi.delta)}%
        </span>
      </div>
    </article>
  )
}

function ChartCard({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-fg-1">{title}</h2>
        <p className="text-xs text-fg-3 mt-0.5">{body}</p>
      </header>
      <div className="w-full h-[220px]" dir="ltr">{children}</div>
    </article>
  )
}

function Stat({ Icon, value }: { Icon: LucideIcon; value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="w-3 h-3" strokeWidth={1.75} />
      {value.toLocaleString()}
    </span>
  )
}

function PeriodToggle({
  period,
  onChange,
  t,
}: {
  period: Period
  onChange: (p: Period) => void
  t: ReturnType<typeof useTranslations>
}) {
  const items: Period[] = ['7d', '30d', '90d', '1y']
  return (
    <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-1">
      {items.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 h-8 rounded-pill text-xs font-semibold transition-colors ${
            period === p ? 'bg-primary/20 text-lime-400' : 'text-fg-3 hover:text-fg-1'
          }`}
        >
          {t(`period${p}` as 'period7d')}
        </button>
      ))}
    </div>
  )
}
