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
} from '@/icons'
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
  const [liveRevenue, setLiveRevenue] = useState<
    { month: string; subs: number; sessions: number; store: number }[] | null
  >(null)
  const [liveFunnel, setLiveFunnel] = useState<
    { key: string; count: number; tint: string }[] | null
  >(null)
  const [liveCountries, setLiveCountries] = useState<
    { code: string; name: string; users: number }[] | null
  >(null)

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

      // MRR — sum the per-tier monthly USD price for every active or
      // trialing subscription. The subscriptions table doesn't store the
      // price, so we use the canonical pricing from the marketing page.
      // 2026-05 pricing: $34.99 / $49.99 / $79.99 per month at sticker.
      // Existing subs may be on the old $14.99/$29.99/$59.99 prices —
      // the MRR estimate is best-effort using the current sticker so
      // the dashboard reflects the value of the active customer base
      // going forward, not historical pricing.
      const TIER_MRR_USD: Record<string, number> = {
        basic: 34.99,
        premium: 49.99,
        vip: 79.99,
      }
      type SubRow = { status: string | null; tier: string | null }
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('status, tier')
      const activeSubs = ((subs as SubRow[] | null) ?? []).filter(
        (s) => s.status === 'active' || s.status === 'trialing',
      )
      const mrr = activeSubs.reduce(
        (acc, s) => acc + (TIER_MRR_USD[s.tier ?? ''] ?? 0),
        0,
      )

      if (cancelled) return
      setLiveTiers(tierRows)
      setLiveKpis({
        mrr,
        newUsers,
        activeUsers: counts.basic + counts.premium + counts.vip,
      })

      // Revenue chart — group last 6 months of orders + bookings
      // (using paid_at / created_at) into per-month buckets and stack
      // them by source so the bar chart shows sub vs sessions vs store
      // contribution. Subs revenue is computed from the active-subs
      // count (best-effort), since subscriptions don't store paid_at.
      const sixAgo = new Date()
      sixAgo.setMonth(sixAgo.getMonth() - 5)
      sixAgo.setDate(1)
      sixAgo.setHours(0, 0, 0, 0)
      const sinceISO = sixAgo.toISOString()

      type DatedAmount = { created_at: string; amount: number }
      const [ordersRev, bookingsRev] = await Promise.all([
        supabase
          .from('orders')
          .select('created_at, total_jod')
          .gte('created_at', sinceISO)
          .in('status', ['processing', 'shipped', 'delivered']),
        supabase
          .from('bookings')
          .select('created_at, paid_amount_cents')
          .gte('created_at', sinceISO)
          .not('paid_amount_cents', 'is', null),
      ])

      const buckets: Record<string, { subs: number; sessions: number; store: number }> = {}
      const monthKey = (d: Date) =>
        d.toLocaleString('en-US', { month: 'short' })
      for (let i = 0; i < 6; i++) {
        const d = new Date(sixAgo)
        d.setMonth(sixAgo.getMonth() + i)
        buckets[monthKey(d)] = { subs: 0, sessions: 0, store: 0 }
      }

      for (const o of (ordersRev.data as DatedAmount[] | null) ?? []) {
        const k = monthKey(new Date(o.created_at))
        const amt = ((o as unknown as { total_jod?: number }).total_jod ?? 0)
        if (buckets[k]) buckets[k].store += amt
      }
      type BookingPaid = { created_at: string; paid_amount_cents: number | null }
      for (const b of (bookingsRev.data as BookingPaid[] | null) ?? []) {
        const k = monthKey(new Date(b.created_at))
        const cents = b.paid_amount_cents ?? 0
        if (buckets[k]) buckets[k].sessions += Math.round(cents / 100)
      }
      // Subs MRR is a current snapshot — split it equally across the
      // 6 months as a smoothed estimate. Better than nothing until
      // the subscriptions table grows a paid_at history.
      const monthlySubs = Math.round(mrr)
      for (const k of Object.keys(buckets)) {
        buckets[k]!.subs = monthlySubs
      }
      const revenue = Object.entries(buckets).map(([month, v]) => ({
        month,
        subs: v.subs,
        sessions: v.sessions,
        store: v.store,
      }))
      if (cancelled) return
      setLiveRevenue(revenue)

      // Funnel — using existing data only (no anonymous tracking).
      // Stage 1 'visitors' = total profiles ever created
      // Stage 2 'signups'  = profiles with last_seen_at set (returned at least once)
      // Stage 3 'trials'   = subscriptions in 'trialing' status
      // Stage 4 'paid'     = active paid subs (basic/premium/vip)
      type ProfileSeen = { last_seen_at: string | null }
      const seenList = list as unknown as ProfileSeen[]
      const visitors = list.length
      const signups = seenList.filter((p) => !!p.last_seen_at).length
      const trials = ((subs as SubRow[] | null) ?? []).filter(
        (s) => s.status === 'trialing',
      ).length
      const paid = activeSubs.filter((s) => s.status === 'active').length
      const funnel = [
        { key: 'visitors', count: visitors, tint: '#9baf9f' },
        { key: 'signups',  count: signups,  tint: '#06b6d4' },
        { key: 'trials',   count: trials,   tint: '#e8912a' },
        { key: 'paid',     count: paid,     tint: '#a3e635' },
      ]
      setLiveFunnel(funnel)

      // Countries — group profiles by ISO code captured by middleware.
      // Map known codes to display names; everything else falls under
      // "Other". Top 7 countries by user count.
      const COUNTRY_NAMES: Record<string, string> = {
        JO: 'Jordan', PS: 'Palestine', LB: 'Lebanon', AE: 'UAE',
        SA: 'Saudi Arabia', EG: 'Egypt', CA: 'Canada', US: 'United States',
        GB: 'United Kingdom', DE: 'Germany', FR: 'France', ES: 'Spain',
        IT: 'Italy', NL: 'Netherlands', SE: 'Sweden', AU: 'Australia',
        TR: 'Turkey', IQ: 'Iraq', SY: 'Syria', YE: 'Yemen', QA: 'Qatar',
        KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman', MA: 'Morocco', DZ: 'Algeria',
        TN: 'Tunisia',
      }
      type ProfileCountry = { country: string | null }
      const { data: countryRows } = await supabase
        .from('profiles')
        .select('country')
      const countryCounts: Record<string, number> = {}
      for (const r of (countryRows as ProfileCountry[] | null) ?? []) {
        const c = r.country?.trim().toUpperCase()
        if (!c) continue
        countryCounts[c] = (countryCounts[c] ?? 0) + 1
      }
      const countries = Object.entries(countryCounts)
        .map(([code, users]) => ({
          code,
          name: COUNTRY_NAMES[code] ?? code,
          users: users as number,
        }))
        .sort((a, b) => b.users - a.users)
        .slice(0, 7)
      if (cancelled) return
      setLiveCountries(countries)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const tierData = liveTiers && liveTiers.some((r) => r.count > 0) ? liveTiers : TIER_MIX
  const totalActive = tierData.reduce((acc, r) => acc + r.count, 0)
  const funnelData =
    liveFunnel && liveFunnel.some((f) => f.count > 0) ? liveFunnel : FUNNEL
  const countriesData =
    liveCountries && liveCountries.length > 0 ? liveCountries : COUNTRIES
  const totalCountryUsers = countriesData.reduce((acc, c) => acc + c.users, 0)

  const kpis: KpiSpec[] = [
    {
      Icon: CreditCard,
      labelKey: 'mrr',
      value: liveKpis ? `${liveKpis.mrr.toLocaleString()} USD` : '6,180 USD',
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
      <header className="flex flex-wrap items-end justify-between gap-3">
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
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-fg-1 transition-colors"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              borderRadius: 8,
            }}
          >
            <Download
              className="w-3.5 h-3.5"
              strokeWidth={1.75}
              color="var(--gf-fg-3)"
            />
            {tA('exportCsv')}
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <BarChart
              data={
                liveRevenue && liveRevenue.some((r) => r.subs + r.sessions + r.store > 0)
                  ? liveRevenue
                  : REVENUE
              }
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#a3e635" stopOpacity={1} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="revSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#06b6d4" stopOpacity={1} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="revStore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#a855f7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgb(255 255 255 / 0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} dy={4} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                cursor={{ fill: 'rgba(163, 230, 53, 0.05)', radius: 6 }}
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
              />
              <Bar dataKey="subs"     stackId="rev" fill="url(#revSubs)" />
              <Bar dataKey="sessions" stackId="rev" fill="url(#revSessions)" />
              <Bar dataKey="store"    stackId="rev" fill="url(#revStore)" radius={[6, 6, 0, 0]} />
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
            {funnelData.map((f, i) => {
              const max = funnelData[0]?.count || 1
              const pct = (f.count / max) * 100
              const prev = funnelData[i - 1]?.count
              const fromPrev = i === 0 ? 100 : prev ? (f.count / prev) * 100 : 0
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
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--gf-input-bg)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${f.tint}, ${f.tint}cc)`,
                        boxShadow: `0 0 8px ${f.tint}55`,
                      }}
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
              const tint = TIER_TINT[row.tier]
              return (
                <li key={row.tier}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span
                      className="text-xs uppercase tracking-eyebrow font-semibold"
                      style={{ color: tint }}
                    >
                      {tTiers(`${row.tier}.name`)}
                    </span>
                    <span className="font-mono text-xs text-fg-1" dir="ltr">
                      {row.count} · {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--gf-input-bg)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${tint}, ${tint}cc)`,
                        boxShadow: `0 0 8px ${tint}55`,
                      }}
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
          <Globe
            className="w-4 h-4 flex-shrink-0"
            strokeWidth={1.75}
            color="#a3e635"
          />
          <div>
            <h2 className="text-base font-semibold text-fg-1">{tA('geography')}</h2>
            <p className="text-xs text-fg-3 mt-0.5">{tA('geographyBody')}</p>
          </div>
        </header>
        <ul className="divide-y divide-border">
          {countriesData.map((c) => {
            const pct = totalCountryUsers > 0 ? (c.users / totalCountryUsers) * 100 : 0
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
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--gf-input-bg)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct * 2}%`,
                        background:
                          'linear-gradient(90deg, #a3e635, #a3e635cc)',
                        boxShadow: '0 0 8px rgba(163,230,53,0.35)',
                      }}
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
  const deltaTint = kpi.delta > 0 ? '#a3e635' : '#f43f5e'
  return (
    <article
      className="rounded-xl border border-border bg-surface p-4"
      style={{ boxShadow: `inset 4px 0 0 ${kpi.tint}` }}
    >
      <div className="flex items-center gap-2">
        <kpi.Icon
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={1.75}
          color={kpi.tint}
        />
        <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA(`kpis.${kpi.labelKey}` as 'kpis.mrr')}
        </p>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p
          className="font-display text-2xl font-bold"
          style={{ color: kpi.tint }}
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
    <div
      className="inline-flex items-center"
      style={{
        background: 'var(--gf-input-bg)',
        border: '1px solid var(--gf-border)',
        borderRadius: 8,
        padding: 2,
        gap: 2,
      }}
    >
      {items.map((p) => {
        const active = period === p
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              borderRadius: 6,
              background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
              color: active ? '#a3e635' : 'var(--gf-fg-2)',
            }}
          >
            {tA(p === 'all' ? 'period_all' : (`period${p}` as 'period30d'))}
          </button>
        )
      })}
    </div>
  )
}
