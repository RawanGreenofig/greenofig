'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  CreditCard,
  Users,
  Activity,
  TrendingDown,
  TrendingUp,
  Download,
  Globe,
  type LucideIcon,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { AIUsageTodaySection } from '@/components/admin/AIUsageTodaySection'
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

type Period = '30d' | '90d' | '1y' | 'all'

interface KpiSpec {
  Icon: LucideIcon
  labelKey: 'mrr' | 'newUsers' | 'activeUsers' | 'churn'
  value: string
  delta: number
  tint: string
}

const TIER_TINT: Record<string, string> = {
  free:    '#9baf9f',
  basic:   '#06b6d4',
  premium: '#a3e635',
  vip:     '#a855f7',
}

const TIER_MIX = [
  { tier: 'free',    count: 240 },
  { tier: 'basic',   count: 92 },
  { tier: 'premium', count: 56 },
  { tier: 'vip',     count: 24 },
]

const COUNTRIES = [
  { code: 'JO', name: 'Jordan',          users: 184 },
  { code: 'PS', name: 'Palestine',       users: 76 },
  { code: 'LB', name: 'Lebanon',         users: 54 },
  { code: 'AE', name: 'UAE',             users: 41 },
  { code: 'SA', name: 'Saudi Arabia',    users: 28 },
  { code: 'EG', name: 'Egypt',           users: 19 },
  { code: 'CA', name: 'Canada',          users: 10 },
]

const FUNNEL = [
  { key: 'visitors', count: 12_400, tint: '#9baf9f' },
  { key: 'signups',  count: 1_180,  tint: '#06b6d4' },
  { key: 'trials',   count: 540,    tint: '#e8912a' },
  { key: 'paid',     count: 172,    tint: '#a3e635' },
] as const

function buildUserGrowth(): { week: string; users: number }[] {
  const today = new Date()
  return Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (11 - i) * 7)
    return {
      week: d.toISOString().slice(5, 10),
      users: 8 + Math.round(Math.sin(i / 2) * 5) + i * 3,
    }
  })
}

const REVENUE = [
  { month: 'Dec', subs: 4200, sessions: 980,  store: 410 },
  { month: 'Jan', subs: 4640, sessions: 1080, store: 510 },
  { month: 'Feb', subs: 4920, sessions: 1140, store: 480 },
  { month: 'Mar', subs: 5280, sessions: 1180, store: 612 },
  { month: 'Apr', subs: 5740, sessions: 1240, store: 580 },
  { month: 'May', subs: 6180, sessions: 1240, store: 624 },
]

export default function AdminAnalyticsPage() {
  const t = useTranslations('admin')
  const tA = useTranslations('admin.analyticsPage')
  const tTiers = useTranslations('tiers')

  const [period, setPeriod] = useState<Period>('90d')
  const series = useMemo(buildUserGrowth, [])

  const [liveTiers, setLiveTiers] = useState<{ tier: string; count: number }[] | null>(null)
  const [liveKpis, setLiveKpis] = useState<{
    mrr: number
    newUsers: number
    activeUsers: number
  } | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      type ProfileLite = { tier: string | null; created_at: string | null }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('tier, created_at')
        .limit(5000)
      const list = (profiles as ProfileLite[] | null) ?? []
      if (cancelled || list.length === 0) return

      const tiers = ['free', 'basic', 'premium', 'vip'] as const
      const counts: Record<string, number> = { free: 0, basic: 0, premium: 0, vip: 0 }
      for (const p of list) {
        const t = (p.tier ?? 'free') as string
        if (tiers.includes(t as typeof tiers[number])) counts[t] += 1
      }
      const tierRows = tiers.map((t) => ({ tier: t, count: counts[t] }))

      const since30 = Date.now() - 30 * 86400 * 1000
      const newUsers = list.filter(
        (p) => p.created_at && new Date(p.created_at).getTime() >= since30,
      ).length

      type SubRow = { status: string | null; price_jod: number | null }
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('status, price_jod')
      const activeSubs = ((subs as SubRow[] | null) ?? []).filter(
        (s) => s.status === 'active' || s.status === 'trialing',
      )
      const mrr = activeSubs.reduce((acc, s) => acc + (s.price_jod ?? 0), 0)

      if (cancelled) return
      setLiveTiers(tierRows)
      setLiveKpis({
        mrr,
        newUsers,
        activeUsers: counts.basic + counts.premium + counts.vip,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tierData = liveTiers && liveTiers.some((r) => r.count > 0) ? liveTiers : TIER_MIX
  const totalActive = tierData.reduce((acc, r) => acc + r.count, 0)
  const totalCountryUsers = COUNTRIES.reduce((acc, c) => acc + c.users, 0)

  const kpis: KpiSpec[] = [
    {
      Icon: CreditCard,
      labelKey: 'mrr',
      value: liveKpis ? `${liveKpis.mrr.toLocaleString()} JOD` : '6,180 JOD',
      delta: 9,
      tint: '#a3e635',
    },
    {
      Icon: Users,
      labelKey: 'newUsers',
      value: liveKpis ? String(liveKpis.newUsers) : '142',
      delta: 14,
      tint: '#06b6d4',
    },
    {
      Icon: Activity,
      labelKey: 'activeUsers',
      value: liveKpis ? String(liveKpis.activeUsers) : '301',
      delta: 6,
      tint: '#e8912a',
    },
    { Icon: TrendingDown, labelKey: 'churn', value: '3.2%', delta: -1, tint: '#a855f7' },
  ]

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('analytics')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tA('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodToggle period={period} onChange={setPeriod} tA={tA} />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            {tA('exportCsv')}
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Kpi key={k.labelKey} kpi={k} tA={tA} />
        ))}
      </section>

      {/* Growth + Revenue */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title={tA('userGrowth')} body={tA('userGrowthBody')}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminAna" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#a3e635" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} minTickGap={28} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
              />
              <Area type="monotone" dataKey="users" stroke="#a3e635" strokeWidth={2} fill="url(#adminAna)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={tA('revenue')} body={tA('revenueBody')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
              />
              <Bar dataKey="subs"     stackId="rev" fill="#a3e635" />
              <Bar dataKey="sessions" stackId="rev" fill="#06b6d4" />
              <Bar dataKey="store"    stackId="rev" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      {/* Funnel + Tier mix */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="rounded-xl border border-border bg-surface p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-fg-1">{tA('conversion')}</h2>
            <p className="text-xs text-fg-3 mt-0.5">{tA('conversionBody')}</p>
          </header>
          <ul className="space-y-2.5">
            {FUNNEL.map((f, i) => {
              const max = FUNNEL[0].count
              const pct = (f.count / max) * 100
              const fromPrev = i === 0 ? 100 : (f.count / FUNNEL[i - 1].count) * 100
              return (
                <li key={f.key}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm text-fg-1">
                      {tA(`funnel.${f.key}` as 'funnel.visitors')}
                    </span>
                    <span className="font-mono text-xs text-fg-1" dir="ltr">
                      {f.count.toLocaleString()}
                      {i > 0 && (
                        <span className="text-fg-3 ms-2">
                          ({fromPrev.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-pill bg-bg-deeper overflow-hidden">
                    <div
                      className="h-full rounded-pill transition-all"
                      style={{ width: `${pct}%`, background: f.tint }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-fg-1">{tA('tierMix')}</h2>
            <p className="text-xs text-fg-3 mt-0.5">{tA('tierMixBody')}</p>
          </header>
          <ul className="space-y-3">
            {tierData.map((row) => {
              const pct = (row.count / totalActive) * 100
              return (
                <li key={row.tier}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span
                      className="text-xs uppercase tracking-eyebrow font-semibold"
                      style={{ color: TIER_TINT[row.tier] }}
                    >
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
      </section>

      {/* Geography */}
      <article className="rounded-xl border border-border bg-surface overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Globe className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
          <div>
            <h2 className="text-base font-semibold text-fg-1">{tA('geography')}</h2>
            <p className="text-xs text-fg-3 mt-0.5">{tA('geographyBody')}</p>
          </div>
        </header>
        <ul className="divide-y divide-border">
          {COUNTRIES.map((c) => {
            const pct = (c.users / totalCountryUsers) * 100
            return (
              <li
                key={c.code}
                className="grid grid-cols-[60px_1fr_120px] gap-3 items-center px-5 py-3"
              >
                <span className="font-mono text-sm text-fg-3 text-center" dir="ltr">
                  {c.code}
                </span>
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-sm text-fg-1">{c.name}</p>
                    <p className="font-mono text-xs text-fg-3" dir="ltr">
                      {pct.toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
                    <div
                      className="h-full rounded-pill bg-lime-400/80 transition-all"
                      style={{ width: `${pct * 2}%` }}
                    />
                  </div>
                </div>
                <p className="font-mono text-sm text-fg-1 text-end" dir="ltr">
                  {c.users.toLocaleString()}
                </p>
              </li>
            )
          })}
        </ul>
      </article>

      <AIUsageTodaySection />
    </div>
  )
}

function Kpi({
  kpi,
  tA,
}: {
  kpi: KpiSpec
  tA: ReturnType<typeof useTranslations>
}) {
  const DeltaIcon = kpi.delta > 0 ? TrendingUp : TrendingDown
  const tint = kpi.delta > 0 ? '#a3e635' : '#f43f5e'
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${kpi.tint}1a`, color: kpi.tint }}
        >
          <kpi.Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {tA(`kpis.${kpi.labelKey}` as 'kpis.mrr')}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
          {kpi.value}
        </p>
        <span
          className="inline-flex items-center gap-0.5 text-xs font-semibold font-mono"
          style={{ color: tint }}
          dir="ltr"
        >
          <DeltaIcon className="w-3 h-3" strokeWidth={2.25} />
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

function PeriodToggle({
  period,
  onChange,
  tA,
}: {
  period: Period
  onChange: (p: Period) => void
  tA: ReturnType<typeof useTranslations>
}) {
  const items: Period[] = ['30d', '90d', '1y', 'all']
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
          {tA(p === 'all' ? 'period_all' : (`period${p}` as 'period30d'))}
        </button>
      ))}
    </div>
  )
}
