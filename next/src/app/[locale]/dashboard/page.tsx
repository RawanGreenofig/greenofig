'use client'

import { useTranslations } from 'next-intl'
import {
  Flame,
  Droplets,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
  Camera,
  BookOpen,
  Plus,
  Scale,
  Pill,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { NUTRITIONIST } from '@/lib/tokens'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

interface TodayQueryResult {
  todayLogs: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }[]
  waterMlToday: number
  nextBooking: { scheduled_at: string; type: string } | null
}

export default function DashboardTodayPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const { profile } = useUser()
  const firstName = profile?.full_name?.split(' ')[0] ?? t('guest')
  const greetingKey = pickGreeting()
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const userId = profile?.id ?? null
  const targets = {
    calories: 1840,
    waterGlasses: 8,
    protein: 120,
    carbs: 200,
    fat: 60,
  }

  const live = useSupabaseQuery<TodayQueryResult>(async (supabase) => {
    if (!userId) return { todayLogs: [], waterMlToday: 0, nextBooking: null }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startISO = startOfDay.toISOString()

    const [logsRes, waterRes, bookingRes] = await Promise.all([
      supabase
        .from('nutrition_logs')
        .select('calories, protein_g, carbs_g, fat_g')
        .eq('user_id', userId)
        .gte('logged_at', startISO),
      supabase
        .from('progress_entries')
        .select('water_intake_ml')
        .eq('user_id', userId)
        .gte('recorded_at', startISO)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bookings')
        .select('scheduled_at, type')
        .eq('client_id', userId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    return {
      todayLogs:
        (logsRes.data as TodayQueryResult['todayLogs'] | null) ?? [],
      waterMlToday:
        ((waterRes.data as { water_intake_ml: number | null } | null)
          ?.water_intake_ml ?? 0) ?? 0,
      nextBooking:
        (bookingRes.data as TodayQueryResult['nextBooking'] | null) ?? null,
    }
  }, [userId])

  // Aggregate live logs into the same shape the UI already expects.
  const totals = (live.data?.todayLogs ?? []).reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      protein:  acc.protein  + (l.protein_g ?? 0),
      carbs:    acc.carbs    + (l.carbs_g ?? 0),
      fat:      acc.fat      + (l.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const stats = {
    caloriesLogged: Math.round(totals.calories),
    caloriesTarget: targets.calories,
    waterGlasses: Math.round((live.data?.waterMlToday ?? 0) / 250),
    waterTarget: targets.waterGlasses,
    streakDays: 0, // computed in H.5b alongside progress series
    nextBooking: live.data?.nextBooking
      ? {
          whenLabel: new Date(live.data.nextBooking.scheduled_at).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          type: live.data.nextBooking.type,
        }
      : null,
  }

  const macros = {
    protein: { current: Math.round(totals.protein), target: targets.protein },
    carbs:   { current: Math.round(totals.carbs),   target: targets.carbs },
    fat:     { current: Math.round(totals.fat),     target: targets.fat },
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
          {t(greetingKey)}, {firstName}
        </h1>
      </header>

      {/* KPI row */}
      <section
        aria-label="Today summary"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KpiCard
          Icon={Flame}
          accent="#f97316"
          label={t('kpiCalories')}
          current={stats.caloriesLogged}
          target={stats.caloriesTarget}
          unit="kcal"
        />
        <KpiCard
          Icon={Droplets}
          accent="#06b6d4"
          label={t('kpiWater')}
          current={stats.waterGlasses}
          target={stats.waterTarget}
          unit={t('glasses')}
        />
        <StreakCard streak={stats.streakDays} t={t} />
        <BookingCard t={t} booking={stats.nextBooking} />
      </section>

      {/* Quick actions */}
      <section aria-label={t('quickActions')}>
        <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {t('quickActions')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickAction Icon={Plus}     label={t('logMeal')}      href="/dashboard/track" />
          <QuickAction Icon={Droplets} label={t('logWater')}     href="/dashboard/track" />
          <QuickAction Icon={Camera}   label={t('scanFood')}     href="/dashboard/scanner" accent />
          <QuickAction Icon={Scale}    label={t('logWeight')}    href="/dashboard/progress" />
          <QuickAction Icon={Pill}     label={t('logSupplement')} href="/dashboard/track" />
        </div>
      </section>

      {/* Macros + plan */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MacroCard t={t} macros={macros} totalKcal={stats.caloriesLogged} />
        <PlanCard t={t} tCommon={tCommon} />
      </section>

      {/* Latest + progress + notifications */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LatestPostCard t={t} drName={NUTRITIONIST.name} />
        <ProgressCard t={t} />
        <NotificationsCard t={t} />
      </section>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function KpiCard({
  Icon,
  accent,
  label,
  current,
  target,
  unit,
}: {
  Icon: LucideIcon
  accent: string
  label: string
  current: number
  target: number
  unit: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {label}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        {current.toLocaleString()}
        <span className="ms-1.5 text-sm font-normal text-fg-3">
          / {target.toLocaleString()} {unit}
        </span>
      </p>
      <div className="mt-3 h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
        <div
          className="h-full rounded-pill"
          style={{ width: `${pct}%`, background: accent }}
        />
      </div>
    </article>
  )
}

function StreakCard({
  streak,
  t,
}: {
  streak: number
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgb(232 145 42 / 0.12)', color: 'var(--gf-amber)' }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {t('kpiStreak')}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        {t('streakDays', { count: streak })}
      </p>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-pill"
            style={{ background: i < streak ? 'var(--gf-amber)' : 'var(--gf-bg-deeper)' }}
          />
        ))}
      </div>
    </article>
  )
}

function BookingCard({
  t,
  booking,
}: {
  t: ReturnType<typeof useTranslations>
  booking: { whenLabel: string; type: string } | null
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgb(61 122 74 / 0.18)', color: 'var(--gf-lime-400)' }}
        >
          <Calendar className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {t('kpiNextBooking')}
        </span>
      </div>
      {booking ? (
        <>
          <p className="text-base font-semibold text-fg-1">{booking.type}</p>
          <p className="text-sm text-fg-2 mt-0.5">{booking.whenLabel}</p>
        </>
      ) : (
        <>
          <p className="text-sm text-fg-2">{t('noUpcomingBooking')}</p>
          <Link
            href="/dashboard/bookings"
            className="mt-3 inline-flex items-center gap-1 text-xs text-lime-400 hover:gap-2 transition-all"
          >
            {t('bookOne')} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
          </Link>
        </>
      )}
    </article>
  )
}

function QuickAction({
  Icon,
  label,
  href,
  accent,
}: {
  Icon: LucideIcon
  label: string
  href: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl border bg-surface p-4 transition-colors duration-fast ease-out ${
        accent
          ? 'border-primary/40 hover:border-primary'
          : 'border-border hover:border-primary/40'
      }`}
    >
      <span
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          accent ? 'bg-primary/15 text-lime-400' : 'bg-surface-raised text-fg-2'
        }`}
      >
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <span className="text-sm font-medium text-fg-1">{label}</span>
    </Link>
  )
}

function MacroCard({
  t,
  macros,
  totalKcal,
}: {
  t: ReturnType<typeof useTranslations>
  macros: { protein: { current: number; target: number }; carbs: { current: number; target: number }; fat: { current: number; target: number } }
  totalKcal: number
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 lg:p-6">
      <h2 className="text-base font-semibold text-fg-1">{t('macroToday')}</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 items-end">
        <Ring
          label={t('macroProtein')}
          value={macros.protein.current}
          target={macros.protein.target}
          color="#3b82f6"
        />
        <Ring
          label={t('macroCarbs')}
          value={macros.carbs.current}
          target={macros.carbs.target}
          color="#f97316"
        />
        <Ring
          label={t('macroFat')}
          value={macros.fat.current}
          target={macros.fat.target}
          color="#a855f7"
        />
      </div>
      <p className="mt-5 text-center font-mono text-sm text-fg-2" dir="ltr">
        <span className="text-fg-1 text-2xl font-bold">{totalKcal}</span>{' '}
        {t('totalCalories')}
      </p>
    </article>
  )
}

function Ring({
  label,
  value,
  target,
  color,
}: {
  label: string
  value: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const radius = 32
  const stroke = 6
  const C = 2 * Math.PI * radius
  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={radius} stroke="var(--gf-bg-deeper)" strokeWidth={stroke} fill="none" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <p className="mt-2 text-xs uppercase tracking-eyebrow text-fg-3 font-medium">{label}</p>
      <p className="font-mono text-sm text-fg-1" dir="ltr">
        {value}<span className="text-fg-3">/{target}g</span>
      </p>
    </div>
  )
}

function PlanCard({
  t,
  tCommon,
}: {
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
}) {
  void tCommon
  return (
    <article className="rounded-xl border border-border bg-surface p-5 lg:p-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-base font-semibold text-fg-1">{t('todayPlan')}</h2>
        <Link
          href="/dashboard/meal-plan"
          className="text-xs text-lime-400 hover:underline inline-flex items-center gap-1"
        >
          {t('viewFullPlan')} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </Link>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-bg-deeper p-6 text-center">
        <BookOpen
          className="w-7 h-7 mx-auto mb-3 text-fg-3"
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium text-fg-1">{t('noPlanYet')}</p>
        <p className="mt-1 text-xs text-fg-2 max-w-[280px] mx-auto">
          {t('noPlanBody')}
        </p>
      </div>
    </article>
  )
}

function LatestPostCard({
  t,
  drName,
}: {
  t: ReturnType<typeof useTranslations>
  drName: string
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
        {t('latestPost', { name: drName })}
      </p>
      <p className="mt-3 text-sm text-fg-1 leading-relaxed">
        Quick reminder — hydration before caffeine. A glass of water in the
        first 20 minutes of your day moves the needle more than people realize.
      </p>
      <Link
        href="/dashboard/community"
        className="mt-4 inline-flex items-center gap-1 text-xs text-lime-400 hover:gap-2 transition-all"
      >
        {t('seeAll')} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
      </Link>
    </article>
  )
}

function ProgressCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <TrendingUp className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {t('myProgress')}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        — kg
      </p>
      <p className="mt-1 text-xs text-fg-3">
        {t('weightDelta', { delta: '0' })}
      </p>
      <Link
        href="/dashboard/progress"
        className="mt-4 inline-flex items-center gap-1 text-xs text-lime-400 hover:gap-2 transition-all"
      >
        {t('seeAll')} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
      </Link>
    </article>
  )
}

function NotificationsCard({
  t,
}: {
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
        {t('notifications')}
      </p>
      <p className="text-sm text-fg-2">{t('noNotifications')}</p>
    </article>
  )
}

function pickGreeting():
  | 'greetingMorning'
  | 'greetingAfternoon'
  | 'greetingEvening' {
  const h = new Date().getHours()
  if (h < 12) return 'greetingMorning'
  if (h < 18) return 'greetingAfternoon'
  return 'greetingEvening'
}
