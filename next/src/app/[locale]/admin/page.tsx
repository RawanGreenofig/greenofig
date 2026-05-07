'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Users,
  CreditCard,
  CalendarClock,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Bell,
  ToggleRight,
  ShieldCheck,
  Wrench,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'
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
import { DemoAccountsCard } from '@/components/admin/DemoAccountsCard'

type Health = 'ok' | 'degraded' | 'down'

const HEALTH_TINT: Record<Health, string> = {
  ok:       '#a3e635',
  degraded: '#e8912a',
  down:     '#f43f5e',
}

const TIER_TINT: Record<Tier, string> = {
  free:    '#9baf9f',
  basic:   '#06b6d4',
  premium: '#a3e635',
  vip:     '#a855f7',
}

interface Signup {
  id: string
  name: string
  initials: string
  email: string
  tier: Tier
  joinedHoursAgo: number
}

const SIGNUPS: Signup[] = [
  { id: 'u1', name: 'Sara Khoury',  initials: 'SK', email: 'sara@example.com',  tier: 'premium', joinedHoursAgo: 2 },
  { id: 'u2', name: 'Faisal Daher', initials: 'FD', email: 'faisal@example.com', tier: 'basic',   joinedHoursAgo: 5 },
  { id: 'u3', name: 'Mira Halaby',  initials: 'MH', email: 'mira@example.com',  tier: 'free',    joinedHoursAgo: 9 },
  { id: 'u4', name: 'Adam Rahmeh',  initials: 'AR', email: 'adam@example.com',  tier: 'vip',     joinedHoursAgo: 18 },
  { id: 'u5', name: 'Lina Sabbagh', initials: 'LS', email: 'lina@example.com',  tier: 'premium', joinedHoursAgo: 26 },
]

const SYSTEM: { key: 'stripe' | 'supabase' | 'ai' | 'storage'; status: Health; lastChecked: string }[] = [
  { key: 'stripe',   status: 'ok',       lastChecked: '2m ago' },
  { key: 'supabase', status: 'ok',       lastChecked: '1m ago' },
  { key: 'ai',       status: 'degraded', lastChecked: '4m ago' },
  { key: 'storage',  status: 'ok',       lastChecked: '2m ago' },
]

function buildGrowth(): { week: string; users: number }[] {
  const today = new Date()
  return Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (11 - i) * 7)
    return {
      week: d.toISOString().slice(5, 10),
      users: 8 + Math.round(Math.sin(i / 2) * 6) + i * 2,
    }
  })
}

interface AdminOverviewData {
  totalUsers: number
  mrr: number
  sessions30d: number
  storeRev30d: number
  recentSignups: Signup[]
  growthSeries: { week: string; users: number }[]
}

export default function AdminOverviewPage() {
  const t = useTranslations('admin')
  const tT = useTranslations('admin.overviewPage')
  const tTiers = useTranslations('tiers')

  const live = useSupabaseQuery<AdminOverviewData>(async (supabase) => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30)
    const twelveWeeksAgo = new Date(now); twelveWeeksAgo.setDate(now.getDate() - 12 * 7)

    type SignupRow = {
      id: string; full_name: string | null; tier: Tier; created_at: string
    }
    type SubRow = {
      tier: Tier
      status: string | null
    }

    const [usersRes, signupsRes, subsRes, sessionsRes, ordersRes, growthRes] =
      await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
        supabase
          .from('profiles')
          .select('id, full_name, tier, created_at')
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('subscriptions')
          .select('tier, status')
          .eq('status', 'active'),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .gte('scheduled_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('orders')
          .select('total_jod')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .in('status', ['processing', 'shipped', 'delivered']),
        supabase
          .from('profiles')
          .select('created_at')
          .eq('role', 'user')
          .gte('created_at', twelveWeeksAgo.toISOString())
          .order('created_at', { ascending: true }),
      ])

    // MRR: very simple per-tier monthly attribution
    const tierMonthly: Record<Tier, number> = {
      free: 0, basic: 9, premium: 19, vip: 49,
    }
    const subs = (subsRes.data as SubRow[] | null) ?? []
    const mrr = subs.reduce((acc, s) => acc + (tierMonthly[s.tier] ?? 0), 0)

    // Store revenue (sum of recent orders)
    const orders = (ordersRes.data as { total_jod: number | null }[] | null) ?? []
    const storeRev = orders.reduce((acc, o) => acc + (o.total_jod ?? 0), 0)

    // Bucket signups into ISO weeks for the chart
    type GrowthRow = { created_at: string }
    const gRows = (growthRes.data as GrowthRow[] | null) ?? []
    const buckets = new Map<string, number>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i * 7)
      buckets.set(d.toISOString().slice(5, 10), 0)
    }
    for (const r of gRows) {
      const created = new Date(r.created_at)
      const ageDays = Math.floor((now.getTime() - created.getTime()) / 86_400_000)
      const weekIdx = Math.min(11, Math.floor(ageDays / 7))
      const d = new Date(now); d.setDate(now.getDate() - weekIdx * 7)
      const key = d.toISOString().slice(5, 10)
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    const growthSeries = Array.from(buckets.entries()).map(([week, users]) => ({ week, users }))

    const recentSignups: Signup[] = ((signupsRes.data as SignupRow[] | null) ?? []).map(
      (r) => {
        const name = r.full_name?.trim() || 'Unnamed user'
        return {
          id: r.id,
          name,
          initials: name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
          email: '',
          tier: r.tier,
          joinedHoursAgo: Math.max(
            0,
            Math.floor((now.getTime() - new Date(r.created_at).getTime()) / 3_600_000),
          ),
        }
      },
    )

    return {
      totalUsers: usersRes.count ?? 0,
      mrr,
      sessions30d: sessionsRes.count ?? 0,
      storeRev30d: storeRev,
      recentSignups,
      growthSeries,
    }
  }, [])

  const seedSeries = useMemo(() => buildGrowth(), [])
  const series = (live.data?.growthSeries && live.data.growthSeries.length > 0)
    ? live.data.growthSeries
    : seedSeries

  const allHealthy = SYSTEM.every((s) => s.status === 'ok')

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-8">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('title')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{tT('subtitle')}</p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          Icon={Users}
          tint="#a3e635"
          label={tT('kpis.totalUsers')}
          value={String(live.data?.totalUsers ?? 412)}
          delta={14}
          tT={tT}
        />
        <Kpi
          Icon={CreditCard}
          tint="#06b6d4"
          label={tT('kpis.mrr')}
          value={String(live.data?.mrr ?? 6180)}
          unit="JOD"
          delta={9}
          tT={tT}
        />
        <Kpi
          Icon={CalendarClock}
          tint="#e8912a"
          label={tT('kpis.sessions30d')}
          value={String(live.data?.sessions30d ?? 184)}
          delta={22}
          tT={tT}
        />
        <Kpi
          Icon={ShoppingBag}
          tint="#a855f7"
          label={tT('kpis.storeRev30d')}
          value={String(Math.round(live.data?.storeRev30d ?? 3420))}
          unit="JOD"
          delta={-4}
          tT={tT}
        />
      </section>

      {/* Growth + system */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <header className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg-1">
              {tT('growth.title')}
            </h2>
            <Link
              href="/admin/analytics"
              className="text-xs text-lime-400 hover:underline inline-flex items-center gap-1"
            >
              {t('analytics')}
              <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={2} />
            </Link>
          </header>
          <div className="w-full h-[260px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminGrowth" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="users" stroke="#a3e635" strokeWidth={2} fill="url(#adminGrowth)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5">
          <header className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-fg-1">
              {tT('system.title')}
            </h2>
            {allHealthy && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-lime-400">
                <CheckCircle2 className="w-3 h-3" strokeWidth={2.25} />
                {tT('system.all')}
              </span>
            )}
          </header>
          <ul className="space-y-3">
            {SYSTEM.map((s) => (
              <li
                key={s.key}
                className="flex items-center gap-3 rounded-lg bg-bg-deeper/40 border border-border px-3 py-2"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: HEALTH_TINT[s.status] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg-1 truncate">
                    {tT(`system.${s.key}` as 'system.stripe')}
                  </p>
                  <p className="text-[10px] text-fg-3 font-mono mt-0.5" dir="ltr">
                    {tT('system.lastChecked', { time: s.lastChecked })}
                  </p>
                </div>
                <span
                  className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                  style={{
                    background: `${HEALTH_TINT[s.status]}1a`,
                    color: HEALTH_TINT[s.status],
                  }}
                >
                  {tT(`system.${s.status}` as 'system.ok')}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* Recent signups + quick actions */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <article className="rounded-xl border border-border bg-surface overflow-hidden lg:col-span-2">
          <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-fg-1">
              {tT('signups.title')}
            </h2>
            <Link
              href="/admin/users"
              className="text-xs text-lime-400 hover:underline inline-flex items-center gap-1"
            >
              {tT('signups.viewAll')}
              <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={2} />
            </Link>
          </header>
          {(() => {
            const signups = (live.data?.recentSignups && live.data.recentSignups.length > 0)
              ? live.data.recentSignups
              : SIGNUPS
            if (signups.length === 0) {
              return (
                <p className="p-8 text-sm text-fg-3 text-center">
                  {tT('signups.noSignups')}
                </p>
              )
            }
            return (
              <ul className="divide-y divide-border">
                {signups.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-raised transition-colors"
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center font-display text-xs font-bold"
                    style={{
                      background: 'linear-gradient(135deg,#5c7262,#2c3e35)',
                      color: 'var(--gf-fg-1)',
                    }}
                  >
                    {s.initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-1 truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-fg-3 truncate font-mono" dir="ltr">
                      {s.email}
                    </p>
                  </div>
                  <span
                    className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                    style={{
                      background: `${TIER_TINT[s.tier]}1a`,
                      color: TIER_TINT[s.tier],
                    }}
                  >
                    {tTiers(`${s.tier}.name`)}
                  </span>
                  <span className="text-[11px] text-fg-3 font-mono" dir="ltr">
                    {formatHours(s.joinedHoursAgo)}
                  </span>
                  <Link
                    href={`/admin/users/${s.id}`}
                    aria-label="Open"
                    className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.75} />
                  </Link>
                </li>
              ))}
              </ul>
            )
          })()}
        </article>

        <aside className="space-y-3">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
            {tT('actions.title')}
          </p>
          <ActionTile
            Icon={Bell}
            tint="#a3e635"
            title={tT('actions.newAnnouncement')}
            body={tT('actions.newAnnouncementBody')}
            href="/admin/notifications"
          />
          <ActionTile
            Icon={ToggleRight}
            tint="#06b6d4"
            title={tT('actions.toggleStore')}
            body={tT('actions.toggleStoreBody')}
            href="/admin/store"
          />
          <ActionTile
            Icon={ShieldCheck}
            tint="#e8912a"
            title={tT('actions.auditTrail')}
            body={tT('actions.auditTrailBody')}
            href="/admin/audit-log"
          />
          <ActionTile
            Icon={Wrench}
            tint="#a855f7"
            title={tT('actions.siteEdit')}
            body={tT('actions.siteEditBody')}
            href="/admin/site-editor"
          />
        </aside>
      </section>

      {/* Demo + staff credential reference */}
      <DemoAccountsCard />
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function Kpi({
  Icon,
  tint,
  label,
  value,
  unit,
  delta,
  tT,
}: {
  Icon: LucideIcon
  tint: string
  label: string
  value: string
  unit?: string
  delta: number
  tT: ReturnType<typeof useTranslations>
}) {
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : AlertCircle
  const deltaTint = delta > 0 ? '#a3e635' : delta < 0 ? '#f43f5e' : '#9baf9f'
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${tint}1a`, color: tint }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
          {value}
          {unit && <span className="ms-1.5 text-sm font-normal text-fg-3">{unit}</span>}
        </p>
        <span
          className="inline-flex items-center gap-0.5 text-xs font-semibold font-mono"
          style={{ color: deltaTint }}
          dir="ltr"
        >
          <DeltaIcon className="w-3 h-3" strokeWidth={2.25} />
          {delta > 0
            ? tT('kpis.deltaUp', { value: delta })
            : tT('kpis.deltaDown', { value: Math.abs(delta) })}
        </span>
      </div>
    </article>
  )
}

function ActionTile({
  Icon,
  tint,
  title,
  body,
  href,
}: {
  Icon: LucideIcon
  tint: string
  title: string
  body: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
    >
      <span
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: `${tint}1a`, color: tint }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg-1">{title}</p>
        <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">{body}</p>
      </div>
      <ArrowRight
        className="w-3.5 h-3.5 text-fg-3 shrink-0 rtl:rotate-180"
        strokeWidth={1.75}
      />
    </Link>
  )
}

function formatHours(h: number): string {
  if (h < 1) return 'now'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
