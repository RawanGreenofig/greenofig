'use client'

import { useTranslations } from 'next-intl'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import {
  Wallet,
  ArrowUpRight,
  Download,
  CalendarClock,
  ShoppingBag,
  Sparkles,
  CreditCard,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface RevenueSource {
  key: 'subscriptions' | 'sessionsRev' | 'storeRev' | 'tipsRev'
  amount: number
  Icon: LucideIcon
  tint: string
}

interface Payout {
  id: string
  amount: number
  paidISO: string
  sessionsCount: number
}

const SOURCES: RevenueSource[] = [
  { key: 'subscriptions', amount: 720, Icon: CreditCard,    tint: '#a3e635' },
  { key: 'sessionsRev',   amount: 380, Icon: CalendarClock, tint: '#06b6d4' },
  { key: 'storeRev',      amount: 110, Icon: ShoppingBag,   tint: '#e8912a' },
  { key: 'tipsRev',       amount: 30,  Icon: Sparkles,      tint: '#a855f7' },
]

const MONTHLY = [
  { month: 'Dec', revenue: 980 },
  { month: 'Jan', revenue: 1080 },
  { month: 'Feb', revenue: 1140 },
  { month: 'Mar', revenue: 1180 },
  { month: 'Apr', revenue: 1240 },
  { month: 'May', revenue: 1240 },
]

const PAYOUTS: Payout[] = [
  { id: '00482', amount: 1140, paidISO: '2026-04-03', sessionsCount: 28 },
  { id: '00461', amount: 1080, paidISO: '2026-03-03', sessionsCount: 24 },
  { id: '00440', amount: 980,  paidISO: '2026-02-03', sessionsCount: 22 },
  { id: '00419', amount: 920,  paidISO: '2026-01-03', sessionsCount: 19 },
]

export default function EarningsPage() {
  const t = useTranslations('nutritionist.earningsPage')
  const tNut = useTranslations('nutritionist')
  const { profile } = useUser()

  // Live aggregates: completed bookings this month → session revenue total
  interface EarningsRes {
    sessionsThisMonth: number
    sessionRevenue: number
  }
  const live = useSupabaseQuery<EarningsRes>(async (supabase) => {
    if (!profile?.id) return { sessionsThisMonth: 0, sessionRevenue: 0 }
    const start = new Date()
    start.setDate(1); start.setHours(0,0,0,0)

    type Row = { type: string; status: string }
    const { data } = await supabase
      .from('bookings')
      .select('type, status')
      .eq('nutritionist_id', profile.id)
      .gte('scheduled_at', start.toISOString())

    const rows = (data as Row[] | null) ?? []
    const completed = rows.filter((r) => r.status === 'completed' || r.status === 'scheduled')
    const revenue = completed.reduce((acc, r) => {
      if (r.type === 'introCall') return acc
      if (r.type === 'followUp')  return acc + 15
      if (r.type === 'deepDive')  return acc + 35
      return acc
    }, 0)
    return { sessionsThisMonth: completed.length, sessionRevenue: revenue }
  }, [profile?.id])

  const sessionRevenue = live.data?.sessionRevenue ?? 0
  const thisMonth = sessionRevenue > 0
    ? sessionRevenue
    : SOURCES.reduce((acc, s) => acc + s.amount, 0)
  const totalEarned = MONTHLY.reduce((acc, m) => acc + m.revenue, 0) + PAYOUTS.reduce((a, p) => a + p.amount, 0)
  const pendingPayout = thisMonth
  const totalSessions = (live.data?.sessionsThisMonth ?? 0) > 0
    ? live.data!.sessionsThisMonth
    : PAYOUTS.reduce((a, p) => a + p.sessionsCount, 0)

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {tNut('earnings')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
      </header>

      {/* Hero card */}
      <article className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/15 to-transparent p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-lime-400 font-semibold inline-flex items-center gap-1.5">
              <Wallet className="w-3 h-3" strokeWidth={2} />
              {t('pendingPayout')}
            </p>
            <p className="mt-2 font-display text-4xl md:text-5xl font-bold text-fg-1 tracking-tight font-mono" dir="ltr">
              {pendingPayout}
              <span className="ms-2 text-base font-normal text-fg-3">JOD</span>
            </p>
            <p className="mt-1 text-xs text-fg-3 font-mono" dir="ltr">
              {t('nextPayout', {
                date: new Date('2026-06-03').toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              })}
            </p>
            <button
              type="button"
              className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
            >
              <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.25} />
              {t('withdrawCta')}
            </button>
          </div>

          <div className="md:col-span-2 space-y-2.5">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
              {t('breakdown')}
            </p>
            {SOURCES.map((src) => {
              const pct = thisMonth > 0 ? (src.amount / thisMonth) * 100 : 0
              return (
                <div key={src.key} className="flex items-center gap-3">
                  <span
                    className="shrink-0 w-9 h-9 rounded-lg inline-flex items-center justify-center"
                    style={{ background: `${src.tint}1a`, color: src.tint }}
                  >
                    <src.Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-fg-1">
                        {t(src.key)}
                      </span>
                      <span className="font-mono text-xs text-fg-1" dir="ltr">
                        {src.amount} JOD
                        <span className="text-fg-3 ms-1">· {pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-pill bg-bg-deeper overflow-hidden">
                      <div
                        className="h-full rounded-pill transition-all"
                        style={{ width: `${pct}%`, background: src.tint }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </article>

      {/* Top stats */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat
          Icon={CreditCard}
          tint="#a3e635"
          label={t('thisMonth')}
          value={`${thisMonth} JOD`}
        />
        <Stat
          Icon={CalendarClock}
          tint="#06b6d4"
          label={t('totalSessions', { count: totalSessions })}
          value={totalSessions}
        />
        <Stat
          Icon={TrendingUp}
          tint="#e8912a"
          label={t('totalEarned')}
          value={`${totalEarned.toLocaleString()} JOD`}
        />
      </section>

      {/* Monthly chart */}
      <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-fg-1">
            {t('monthlyRevenue')}
          </h2>
          <p className="text-xs text-fg-3 mt-0.5">{t('monthlyRevenueBody')}</p>
        </header>
        <div className="w-full h-[260px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={36} />
              <Tooltip
                contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 12, color: 'var(--gf-fg-1)' }}
                labelStyle={{ color: '#9baf9f' }}
                formatter={(value) => [`${value} JOD`, '']}
              />
              <Bar dataKey="revenue" fill="#a3e635" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Payouts */}
      <article className="rounded-xl border border-border bg-surface overflow-hidden">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-fg-1">{t('payouts')}</h2>
        </header>
        {PAYOUTS.length === 0 ? (
          <div className="p-8 text-center text-sm text-fg-3">
            <p className="font-semibold text-fg-1">{t('noPayouts')}</p>
            <p className="mt-1">{t('noPayoutsBody')}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {PAYOUTS.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3"
              >
                <div>
                  <p className="text-sm font-mono text-fg-1" dir="ltr">
                    {t('payoutId', { id: p.id })}
                  </p>
                  <p className="text-xs text-fg-3 font-mono mt-0.5" dir="ltr">
                    {t('paidOn', {
                      date: new Date(p.paidISO).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }),
                    })}{' '}
                    · {t('totalSessions', { count: p.sessionsCount })}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-fg-1" dir="ltr">
                  {p.amount} <span className="text-xs text-fg-3 font-normal">JOD</span>
                </p>
                <button
                  type="button"
                  aria-label={t('downloadStatement')}
                  className="w-9 h-9 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  )
}

function Stat({
  Icon,
  tint,
  label,
  value,
}: {
  Icon: LucideIcon
  tint: string
  label: string
  value: string | number
}) {
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
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        {value}
      </p>
    </article>
  )
}
