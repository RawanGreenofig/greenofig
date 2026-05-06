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
import { resolveFirstName } from '@/lib/displayName'

interface TodayQueryResult {
  todayLogs: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }[]
  waterMlToday: number
  nextBooking: { scheduled_at: string; type: string } | null
}

export default function DashboardTodayPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const { user, profile } = useUser()
  const firstName = resolveFirstName(profile, user, t('guest'))
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

  // resolveFirstName already strips digits and capitalizes — use it directly.
  const displayFirstName = firstName

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-8">
      {/* Header */}
      <header>
        <p
          className="text-xs uppercase font-semibold mb-1"
          style={{ letterSpacing: '0.18em', color: '#555' }}
        >
          {today}
        </p>
        <h1
          className="font-sans font-bold tracking-tight text-3xl md:text-4xl"
          style={{
            color: 'var(--gf-fg-1)',
            lineHeight: 1.1,
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}
        >
          {t(greetingKey)}, {displayFirstName}
        </h1>
        <p
          className="mt-2 text-sm"
          style={{ color: 'var(--gf-fg-2)' }}
        >
          {t('overviewSubtitle')}
        </p>
      </header>

      {/* KPI row — uniform green accent on every card per the simplified
       * palette spec. Per-card varied colors made the row feel busy. */}
      <section
        aria-label="Today summary"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        <KpiCard
          Icon={Flame}
          accent="#4ade80"
          label={t('kpiCalories')}
          current={stats.caloriesLogged}
          target={stats.caloriesTarget}
          unit="kcal"
        />
        <KpiCard
          Icon={Droplets}
          accent="#4ade80"
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
        <p
          className="text-xs uppercase font-semibold mb-4"
          style={{ letterSpacing: '0.18em', color: '#555' }}
        >
          {t('quickActions')}
        </p>
        {/* Horizontal scroll on mobile, grid on sm+ */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible">
          <div className="flex gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:gap-3 min-w-max sm:min-w-0">
            <QuickAction Icon={Plus}     label={t('logMeal')}      href="/dashboard/track" />
            <QuickAction Icon={Droplets} label={t('logWater')}     href="/dashboard/track" />
            <QuickAction Icon={Camera}   label={t('scanFood')}     href="/dashboard/scanner" accent />
            <QuickAction Icon={Scale}    label={t('logWeight')}    href="/dashboard/progress" />
            <QuickAction Icon={Pill}     label={t('logSupplement')} href="/dashboard/track" />
          </div>
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
    <article
      className="rounded-2xl p-4 md:p-5 transition-colors"
      style={{
        background: 'var(--gf-surface-raised)',
        border: '1px solid var(--gf-border)',
        borderInlineStartWidth: 3,
        borderInlineStartColor: accent,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#363d60')}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = 'var(--gf-border)')
      }
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span
          className="text-[12px] uppercase font-semibold"
          style={{ letterSpacing: '0.15em', color: '#4a5080' }}
        >
          {label}
        </span>
      </div>
      <p
        className="font-mono text-3xl font-bold"
        style={{ color: accent }}
        dir="ltr"
      >
        {current.toLocaleString()}
        <span className="ms-1.5 text-sm font-normal" style={{ color: '#8b92b8' }}>
          / {target.toLocaleString()} {unit}
        </span>
      </p>
      <div
        className="mt-3 h-1.5 rounded-pill overflow-hidden"
        style={{ background: '#0d0f1a' }}
      >
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
  const accent = '#4ade80'
  return (
    <article
      className="rounded-2xl p-4 md:p-5 transition-colors"
      style={{
        background: 'var(--gf-surface-raised)',
        border: '1px solid var(--gf-border)',
        borderInlineStartWidth: 3,
        borderInlineStartColor: accent,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#363d60')}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = 'var(--gf-border)')
      }
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span
          className="text-[12px] uppercase font-semibold"
          style={{ letterSpacing: '0.15em', color: '#4a5080' }}
        >
          {t('kpiStreak')}
        </span>
      </div>
      <p
        className="font-mono text-3xl font-bold"
        style={{ color: accent }}
        dir="ltr"
      >
        {t('streakDays', { count: streak })}
      </p>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-pill"
            style={{ background: i < streak ? accent : '#0d0f1a' }}
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
  const accent = '#4ade80'
  return (
    <article
      className="rounded-2xl p-4 md:p-5 transition-colors"
      style={{
        background: 'var(--gf-surface-raised)',
        border: '1px solid var(--gf-border)',
        borderInlineStartWidth: 3,
        borderInlineStartColor: accent,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#363d60')}
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = 'var(--gf-border)')
      }
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}1a`, color: accent }}
        >
          <Calendar className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <span
          className="text-[12px] uppercase font-semibold"
          style={{ letterSpacing: '0.15em', color: '#4a5080' }}
        >
          {t('kpiNextBooking')}
        </span>
      </div>
      {booking ? (
        <>
          <p className="text-base font-semibold" style={{ color: '#fff' }}>
            {booking.type}
          </p>
          <p className="text-sm mt-0.5" style={{ color: '#8b92b8' }}>
            {booking.whenLabel}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: '#8b92b8' }}>
            {t('noUpcomingBooking')}
          </p>
          <Link
            href="/dashboard/bookings"
            className="mt-3 inline-flex items-center gap-1 text-xs hover:gap-2 transition-all"
            style={{ color: accent }}
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
}: {
  Icon: LucideIcon
  label: string
  href: string
  /** kept in the type for backwards compat with callers; visual treatment
   *  is now identical regardless of `accent` to keep the row uniform. */
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-4 transition-colors shrink-0 min-w-[160px] sm:min-w-0"
      style={{
        background: 'var(--gf-surface-raised)',
        border: '1px solid var(--gf-border)',
        height: 56,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--gf-surface)'
        e.currentTarget.style.borderColor = '#363d60'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--gf-surface-raised)'
        e.currentTarget.style.borderColor = 'var(--gf-border)'
      }}
    >
      <span
        className="rounded-xl p-2.5 flex items-center justify-center shrink-0"
        style={{ background: 'rgb(74 222 128 / 0.10)', color: '#4ade80' }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <span
        className="text-[14px] font-medium whitespace-nowrap"
        style={{ color: 'var(--gf-fg-1)' }}
      >
        {label}
      </span>
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
    <article className="rounded-2xl p-5 lg:p-6" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
  const stroke = 8
  const C = 2 * Math.PI * radius
  const isEmpty = value === 0
  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
        {/* Track — always visible against the card surface. */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="var(--gf-border)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={isEmpty ? '4 4' : undefined}
        />
        {/* Progress — only render when there's something to show. */}
        {!isEmpty && (
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
        )}
        {/* Center label */}
        <text
          x="40"
          y="42"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fill: 'var(--gf-fg-1)',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {value}
        </text>
      </svg>
      <p
        className="mt-2 text-[12px] uppercase font-medium"
        style={{ letterSpacing: '0.18em', color: 'var(--gf-fg-3)' }}
      >
        {label}
      </p>
      <p className="font-mono text-[13px]" dir="ltr" style={{ color: 'var(--gf-fg-2)' }}>
        <span style={{ color: 'var(--gf-fg-1)', fontWeight: 600 }}>{value}</span>
        <span style={{ color: 'var(--gf-fg-3)' }}>/{target}g</span>
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
    <article className="rounded-2xl p-5 lg:p-6" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
    <article className="rounded-2xl p-5" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
    <article className="rounded-2xl p-5" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
      <div className="flex items-center gap-2.5 mb-3">
        <TrendingUp className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
        <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-medium">
          {t('myProgress')}
        </span>
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        0.0 kg
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
    <article className="rounded-2xl p-5" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
