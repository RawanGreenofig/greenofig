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
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { NUTRITIONIST } from '@/lib/tokens'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import { resolveFirstName } from '@/lib/displayName'
import { useState } from 'react'

interface TodayQueryResult {
  todayLogs: { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }[]
  waterMlToday: number
  nextBooking: { scheduled_at: string; type: string } | null
}

export default function DashboardTodayPage() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const { user, profile, tier } = useUser()
  const firstName = resolveFirstName(profile, user, t('guest'))
  const userTier = (tier ?? 'free') as 'free' | 'basic' | 'premium' | 'vip'

  // First-visit push opt-in banner. Dismiss persists in localStorage so
  // we don't nag users who said "later" — they can still enable from
  // Settings → Notifications.
  const { permission, enableNotifications, loading: pushLoading } =
    usePushNotifications(user?.id ?? null)
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('gf_push_banner_dismissed') === '1'
  })
  const showPushBanner =
    !!user && permission === 'default' && !bannerDismissed
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
      {/* Push opt-in banner — first visit only, dismiss-once */}
      {showPushBanner && (
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{
            background: 'var(--gf-surface-raised)',
            border: '1px solid var(--gf-border)',
            borderRadius: 12,
            padding: '12px 16px',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--gf-fg-1)' }}>
            🔔 Get notified when Dr. Rawan posts or messages you
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void enableNotifications()}
              disabled={pushLoading}
              className="btn-primary"
              style={{ height: 32, padding: '0 14px', fontSize: 12 }}
            >
              {pushLoading ? 'Enabling…' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={() => {
                setBannerDismissed(true)
                try {
                  window.localStorage.setItem(
                    'gf_push_banner_dismissed',
                    '1',
                  )
                } catch {
                  /* fine */
                }
              }}
              style={{
                height: 32,
                padding: '0 14px',
                fontSize: 12,
                background: 'transparent',
                border: '1px solid var(--gf-border)',
                borderRadius: 999,
                color: 'var(--gf-fg-3)',
                cursor: 'pointer',
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header>
        <p
          className="text-xs uppercase font-semibold mb-1"
          style={{ letterSpacing: '0.18em', color: '#555' }}
        >
          {today}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
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
          <span
            className="inline-flex items-center"
            style={{
              background: 'var(--tier-badge-bg)',
              color: 'var(--tier-badge-text)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 999,
            }}
          >
            {userTier}
          </span>
        </div>
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
  label,
  current,
  target,
  unit,
}: {
  Icon: LucideIcon
  /** Kept for backwards compat with existing callers; the per-card
   *  accent is no longer rendered as a left border. All KPI cards
   *  share the lime accent for icons + progress bar. */
  accent?: string
  label: string
  current: number
  target: number
  unit: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  return (
    <article
      className="dash-card-lift"
      style={{
        background: 'var(--gf-card)',
        border: '1px solid var(--gf-border)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background:
            'linear-gradient(135deg, rgb(163 230 53 / 0.22), rgb(132 204 22 / 0.10))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          boxShadow: '0 4px 12px rgb(132 204 22 / 0.12)',
        }}
      >
        <Icon size={20} strokeWidth={1.75} color="var(--gf-primary-text)" />
      </div>
      <p
        className="text-[11px] uppercase font-medium"
        style={{
          color: 'var(--gf-fg-3)',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </p>
      <p
        className="font-mono"
        style={{ color: 'var(--gf-fg-1)', fontSize: 28, fontWeight: 700 }}
        dir="ltr"
      >
        {current.toLocaleString()}
        <span
          className="ms-1.5 font-normal"
          style={{ color: 'var(--gf-fg-3)', fontSize: 14 }}
        >
          / {target.toLocaleString()} {unit}
        </span>
      </p>
      <div
        className="mt-3 h-1.5 rounded-pill overflow-hidden"
        style={{ background: 'var(--gf-bg)' }}
      >
        <div
          className="h-full rounded-pill"
          style={{ width: `${pct}%`, background: 'var(--gf-primary)' }}
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
    <article
      className="dash-card-lift"
      style={{
        background: 'var(--gf-card)',
        border: '1px solid var(--gf-border)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background:
            'linear-gradient(135deg, rgb(251 191 36 / 0.22), rgb(245 158 11 / 0.10))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          boxShadow: '0 4px 12px rgb(251 191 36 / 0.12)',
        }}
      >
        <Sparkles size={20} strokeWidth={1.75} color="#fbbf24" />
      </div>
      <p
        className="text-[11px] uppercase font-medium"
        style={{
          color: 'var(--gf-fg-3)',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {t('kpiStreak')}
      </p>
      <p
        className="font-mono"
        style={{ color: 'var(--gf-fg-1)', fontSize: 28, fontWeight: 700 }}
        dir="ltr"
      >
        {t('streakDays', { count: streak })}
      </p>
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-pill"
            style={{
              background: i < streak ? 'var(--gf-primary)' : 'var(--gf-bg)',
            }}
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
    <article
      className="dash-card-lift"
      style={{
        background: 'var(--gf-card)',
        border: '1px solid var(--gf-border)',
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background:
            'linear-gradient(135deg, rgb(96 165 250 / 0.22), rgb(59 130 246 / 0.10))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          boxShadow: '0 4px 12px rgb(96 165 250 / 0.12)',
        }}
      >
        <Calendar size={20} strokeWidth={1.75} color="#60a5fa" />
      </div>
      <p
        className="text-[11px] uppercase font-medium"
        style={{
          color: 'var(--gf-fg-3)',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {t('kpiNextBooking')}
      </p>
      {booking ? (
        <>
          <p
            className="text-base font-semibold"
            style={{ color: 'var(--gf-fg-1)' }}
          >
            {booking.type}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--gf-fg-3)' }}>
            {booking.whenLabel}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm" style={{ color: 'var(--gf-fg-3)' }}>
            {t('noUpcomingBooking')}
          </p>
          <Link
            href="/dashboard/bookings"
            className="mt-3 inline-flex items-center gap-1 text-xs hover:gap-2 transition-all"
            style={{ color: 'var(--gf-primary-text)' }}
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
      className="dash-card-lift group flex items-center gap-3 shrink-0 min-w-[160px] sm:min-w-0"
      style={{
        background: 'var(--gf-card)',
        border: '1px solid var(--gf-border)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--gf-active-bg)',
          color: 'var(--gf-primary-text)',
        }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span
        className="text-[14px] whitespace-nowrap"
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
    <article className="dash-card-lift rounded-2xl p-5 lg:p-6" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
    <article className="dash-card-lift rounded-2xl p-5 lg:p-6" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
    <article className="dash-card-lift rounded-2xl p-5" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
    <article className="dash-card-lift rounded-2xl p-5" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className="icon-tile">
          <TrendingUp size={16} strokeWidth={1.75} />
        </span>
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
    <article className="dash-card-lift rounded-2xl p-5" style={{ background: 'var(--gf-surface-raised)', border: '1px solid var(--gf-border)' }}>
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
