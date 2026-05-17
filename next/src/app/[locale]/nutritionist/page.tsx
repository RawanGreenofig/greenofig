'use client'

import { useTranslations } from 'next-intl'
import {
  Users,
  CalendarClock,
  MessageSquare,
  Wallet,
  Video,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChefHat,
  Lightbulb,
  PenLine,
  UserPlus,
  CheckCircle2,
  Bot,
  Copy,
  Check,
  type LucideIcon,
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { Avatar } from '@/components/Avatar'
import { useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

interface SessionRow {
  id: string
  clientName: string
  clientInitials: string
  type: string
  startMin: number
  durationMin: number
}

interface FlaggedClient {
  id: string
  name: string
  initials: string
  flag: 'noLogin' | 'belowCalories' | 'missedAppointment' | 'weightStall' | 'lowAdherence'
  flagValue?: number
}

interface NutritionistTodayData {
  activeClients: number
  unreadMessages: number
  schedule: SessionRow[]
  flagged: FlaggedClient[]
}

export default function NutritionistTodayPage() {
  const t = useTranslations('nutritionist')
  const { profile } = useUser()
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const live = useSupabaseQuery<NutritionistTodayData>(async (supabase) => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 4)

    type BookingRow = {
      id: string; client_id: string; type: string
      scheduled_at: string; duration_min: number
    }
    type FlaggedRow = { id: string; full_name: string | null; last_seen_at: string | null }

    const [activeRes, scheduleRes, unreadRes, flaggedRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'user')
        .eq('is_active', true),
      supabase
        .from('bookings')
        .select('id, client_id, type, scheduled_at, duration_min')
        .gte('scheduled_at', startOfDay.toISOString())
        .lt('scheduled_at', endOfDay.toISOString())
        .eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('read', false)
        .neq('sender_id', profile?.id ?? ''),
      supabase
        .from('profiles')
        .select('id, full_name, last_seen_at')
        .eq('role', 'user')
        .or(`last_seen_at.lte.${cutoff.toISOString()},last_seen_at.is.null`)
        .limit(5),
    ])

    const scheduleRows = (scheduleRes.data as BookingRow[] | null) ?? []

    // Hydrate client names for the schedule
    const clientIds = Array.from(new Set(scheduleRows.map((r) => r.client_id)))
    const { data: clientRows } = clientIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', clientIds)
      : { data: [] }
    type ClientRow = { id: string; full_name: string | null }
    const nameOf = new Map(
      ((clientRows as ClientRow[] | null) ?? []).map((c) => [c.id, c.full_name ?? 'Client']),
    )

    const now = Date.now()
    const schedule: SessionRow[] = scheduleRows.map((r) => {
      const name = nameOf.get(r.client_id) ?? 'Client'
      const startMin = Math.round((new Date(r.scheduled_at).getTime() - now) / 60_000)
      return {
        id: r.id,
        clientName: name,
        clientInitials: initialsOf(name),
        type: r.type,
        startMin,
        durationMin: r.duration_min,
      }
    })

    const flagged: FlaggedClient[] = ((flaggedRes.data as FlaggedRow[] | null) ?? []).map(
      (r) => {
        const days = r.last_seen_at
          ? Math.max(
              0,
              Math.floor((now - new Date(r.last_seen_at).getTime()) / 86_400_000),
            )
          : 30
        const name = r.full_name?.trim() || 'Unnamed client'
        return {
          id: r.id,
          name,
          initials: initialsOf(name),
          flag: 'noLogin',
          flagValue: days,
        }
      },
    )

    return {
      activeClients: activeRes.count ?? 0,
      unreadMessages: unreadRes.count ?? 0,
      schedule,
      flagged,
    }
  }, [profile?.id])

  // Real data only — no SEED fallback. Empty arrays render the page's
  // existing empty states instead of "Layla H. / Maya K." fixtures.
  // MRR isn't yet computed server-side for the nutritionist view; we
  // surface 0 rather than a fake $1240, until /api/nutritionist/kpis
  // lands and feeds it.
  const sourceSchedule = live.data?.schedule ?? []
  const sourceFlagged = live.data?.flagged ?? []
  const kpis = {
    activeClients:  live.data?.activeClients ?? 0,
    sessionsToday:  sourceSchedule.length,
    unreadMessages: live.data?.unreadMessages ?? 0,
    mrrJod:         0,
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <p className="text-xs uppercase tracking-eyebrow text-lime-400 font-semibold">
          {today}
        </p>
        <h1
          className="mt-2 font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('greeting')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">
          {t('todaySubtitle')}
        </p>
      </header>

      {/* KPI row */}
      <section
        aria-label="Practice KPIs"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Kpi
          Icon={Users}
          accent="#a3e635"
          label={t('kpis.activeClients')}
          value={kpis.activeClients}
        />
        <Kpi
          Icon={CalendarClock}
          accent="#06b6d4"
          label={t('kpis.sessionsToday')}
          value={kpis.sessionsToday}
        />
        <Kpi
          Icon={MessageSquare}
          accent="#e8912a"
          label={t('kpis.unreadMessages')}
          value={kpis.unreadMessages}
        />
        <Kpi
          Icon={Wallet}
          accent="#a855f7"
          label={t('kpis.mrr')}
          value={kpis.mrrJod}
          unit="USD"
        />
      </section>

      {/* Schedule + Urgent */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScheduleCard t={t} sessions={sourceSchedule} />
        <UrgentCard t={t} clients={sourceFlagged} />
      </section>

      {/* Quick actions */}
      <QuickActions t={t} />

      {/* OpenClaw quick actions widget */}
      <OpenClawWidget />
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function Kpi({
  Icon,
  accent,
  label,
  value,
  unit,
}: {
  Icon: LucideIcon
  accent: string
  label: string
  value: number
  unit?: string
}) {
  return (
    <article
      className="rounded-xl border border-border bg-surface p-4"
      style={{ boxShadow: `inset 4px 0 0 ${accent}` }}
    >
      <div className="flex items-center gap-2">
        <Icon
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={1.75}
          color={accent}
        />
        <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {label}
        </p>
      </div>
      <p
        className="mt-2 font-display text-2xl font-bold"
        style={{ color: accent }}
        dir="ltr"
      >
        {value.toLocaleString()}
        {unit && (
          <span
            className="ms-1.5 text-sm font-normal"
            style={{ color: 'var(--gf-fg-3)' }}
          >
            {unit}
          </span>
        )}
      </p>
    </article>
  )
}

function ScheduleCard({
  t,
  sessions,
}: {
  t: ReturnType<typeof useTranslations>
  sessions: SessionRow[]
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 lg:p-6 lg:col-span-2">
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-fg-1">
          {t('schedule.title')}
        </h2>
        <Link
          href="/nutritionist/calendar"
          className="text-xs text-lime-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {t('urgent.viewAll')}
          <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={2} />
        </Link>
      </header>
      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-deeper/40 p-6 text-center">
          <CalendarClock
            className="w-7 h-7 mx-auto mb-3 text-fg-3"
            strokeWidth={1.5}
          />
          <p className="text-sm font-semibold text-fg-1">
            {t('schedule.noSessions')}
          </p>
          <p className="mt-1 text-xs text-fg-2">
            {t('schedule.noSessionsBody')}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((s) => (
            <SessionItem key={s.id} t={t} session={s} />
          ))}
        </ul>
      )}
    </article>
  )
}

function SessionItem({
  t,
  session,
}: {
  t: ReturnType<typeof useTranslations>
  session: SessionRow
}) {
  const isNow = session.startMin <= 5 && session.startMin > -session.durationMin
  const inHrs = Math.floor(session.startMin / 60)
  const inMins = session.startMin % 60
  const inLabel =
    session.startMin <= 0
      ? t('schedule.now')
      : session.startMin >= 60
        ? `${inHrs}h ${inMins ? `${inMins}m` : ''}`.trim()
        : `${session.startMin}m`

  return (
    <li className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
      <Avatar text={session.clientInitials} size={44} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fg-1 truncate">
          {session.clientName}
        </p>
        <p className="mt-0.5 text-xs text-fg-3" dir="ltr">
          {session.type} ·{' '}
          {t('schedule.minLabel', { count: session.durationMin })}
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span
          className="hidden sm:inline-flex items-center font-mono"
          style={{
            height: 18,
            padding: '0 8px',
            borderRadius: 999,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
            background: isNow
              ? 'rgba(163, 230, 53, 0.12)'
              : 'var(--gf-input-bg)',
            color: isNow ? '#a3e635' : 'var(--gf-fg-3)',
          }}
        >
          {isNow ? t('schedule.now') : t('schedule.in', { time: inLabel })}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Video className="w-3.5 h-3.5" strokeWidth={2} />
          {t('schedule.join')}
        </button>
      </div>
    </li>
  )
}

function UrgentCard({
  t,
  clients,
}: {
  t: ReturnType<typeof useTranslations>
  clients: FlaggedClient[]
}) {
  if (clients.length === 0) {
    return (
      <article className="rounded-xl border border-border bg-surface p-5">
        <header className="flex items-center gap-2 mb-3">
          <CheckCircle2
            className="w-4 h-4 text-lime-400"
            strokeWidth={1.75}
          />
          <h2 className="text-base font-semibold text-fg-1">
            {t('urgent.noneTitle')}
          </h2>
        </header>
        <p className="text-sm text-fg-2">{t('urgent.noneBody')}</p>
      </article>
    )
  }

  return (
    <article className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="w-4 h-4"
            strokeWidth={1.75}
            style={{ color: '#e8912a' }}
          />
          <h2 className="text-base font-semibold text-fg-1">
            {t('urgent.title')}
          </h2>
        </div>
        <Link
          href="/nutritionist/clients?filter=at_risk"
          className="text-xs text-lime-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {t('urgent.viewAll')}
          <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={2} />
        </Link>
      </header>
      <ul className="space-y-2">
        {clients.map((c) => (
          <li key={c.id}>
            <Link
              href={`/nutritionist/clients/${c.id}`}
              className="flex items-center gap-3 rounded-lg bg-bg-deeper/40 hover:bg-bg-deeper border border-border px-3 py-2.5 transition-colors"
            >
              <Avatar text={c.initials} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg-1 truncate">
                  {c.name}
                </p>
                <p className="text-xs text-fg-3 truncate" dir="ltr">
                  {c.flag === 'noLogin'
                    ? t('riskFlags.noLogin', { days: c.flagValue ?? 0 })
                    : c.flag === 'belowCalories'
                      ? t('riskFlags.belowCalories', { days: c.flagValue ?? 0 })
                      : c.flag === 'weightStall'
                        ? t('riskFlags.weightStall', { days: c.flagValue ?? 0 })
                        : c.flag === 'lowAdherence'
                          ? t('riskFlags.lowAdherence')
                          : t('riskFlags.missedAppointment')}
                </p>
              </div>
              <ArrowRight
                className="w-3.5 h-3.5 text-fg-3 rtl:rotate-180"
                strokeWidth={1.75}
              />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}

function QuickActions({
  t,
}: {
  t: ReturnType<typeof useTranslations>
}) {
  const items = [
    { Icon: Lightbulb, title: t('quick.newPlan'),   body: t('quick.newPlanBody'),   href: '/nutritionist/meal-plans', tint: '#a3e635' },
    { Icon: ChefHat,   title: t('quick.newRecipe'), body: t('quick.newRecipeBody'), href: '/nutritionist/recipes',    tint: '#06b6d4' },
    { Icon: PenLine,   title: t('quick.newPost'),   body: t('quick.newPostBody'),   href: '/nutritionist/content',    tint: '#e8912a' },
    { Icon: UserPlus,  title: t('quick.newClient'), body: t('quick.newClientBody'), href: '/nutritionist/clients',    tint: '#a855f7' },
  ]
  return (
    <section aria-label={t('quick.title')}>
      <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3 inline-flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-lime-400" strokeWidth={2} />
        {t('quick.title')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary/40 transition-colors"
          >
            <item.Icon
              className="w-6 h-6 flex-shrink-0"
              strokeWidth={1.75}
              style={{ color: item.tint }}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg-1">{item.title}</p>
              <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
                {item.body}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ── OpenClaw widget ────────────────────────────────────────────── */

function OpenClawWidget() {
  const SAMPLES = [
    'Check my at-risk clients',
    'Send me today\'s bookings',
    'Export my client data',
  ]
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (s: string) => {
    void navigator.clipboard.writeText(s).then(() => {
      setCopied(s)
      window.setTimeout(() => setCopied(null), 1100)
    })
  }
  return (
    <section
      aria-label="OpenClaw quick actions"
      className="rounded-xl border border-border bg-surface p-5"
    >
      <header className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Bot
            className="w-5 h-5 flex-shrink-0"
            strokeWidth={1.75}
            color="#a78bfa"
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg-1">
              Quick actions via WhatsApp
            </h2>
            <p className="text-xs text-fg-3 mt-0.5">
              Message OpenClaw on WhatsApp to:
            </p>
          </div>
        </div>
        <Link
          href="/admin/openclaw"
          className="text-xs text-lime-400 hover:underline whitespace-nowrap shrink-0"
        >
          Set up OpenClaw →
        </Link>
      </header>
      <ul className="flex flex-wrap items-center gap-2">
        {SAMPLES.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => copy(s)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-fg-1 transition-colors"
              style={{
                background: 'var(--gf-input-bg)',
                border: '1px solid var(--gf-border)',
                borderRadius: 8,
              }}
            >
              {copied === s ? (
                <Check
                  className="w-3 h-3"
                  strokeWidth={2.5}
                  color="#a3e635"
                />
              ) : (
                <Copy
                  className="w-3 h-3"
                  strokeWidth={1.75}
                  color="var(--gf-fg-3)"
                />
              )}
              {s}
            </button>
          </li>
        ))}
      </ul>
    </section>
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
