'use client'


import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Plus,
  Camera,
  Trophy,
  Flame,
  Star,
  X,
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
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Period = '7d' | '30d' | '90d' | '1y'

interface WeightPoint {
  date: string
  weight: number
}

interface Measurements {
  chest: number | null
  waist: number | null
  hips: number | null
  arms: number | null
  thighs: number | null
  neck: number | null
}

const PERIOD_DAYS: Record<Period, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

/** Empty-state demo curve so the chart isn't blank — replaced with progress_entries in Cluster H */
function buildSeed(start: number, days: number): WeightPoint[] {
  const today = new Date()
  const series: WeightPoint[] = []
  let w = start
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    // Slow downward drift with daily noise
    w = w - 0.02 + (Math.sin(i / 4) * 0.15)
    series.push({
      date: d.toISOString().slice(5, 10), // MM-DD
      weight: Number(w.toFixed(1)),
    })
  }
  return series
}

const SEED = buildSeed(78.4, 90)

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function ProgressPage() {
  const t = useTranslations('progress')
  const { profile } = useUser()
  const [period, setPeriod] = useState<Period>('30d')
  const [logOpen, setLogOpen] = useState(false)
  const [measurements, setMeasurements] = useState<Measurements>({
    chest: null,
    waist: null,
    hips: null,
    arms: null,
    thighs: null,
    neck: null,
  })
  const [photoTab, setPhotoTab] = useState<'frontView' | 'sideView' | 'backView'>('frontView')

  // Live weight series from progress_entries; falls back to SEED while
  // loading (or when env unset).
  const liveSeries = useSupabaseQuery<WeightPoint[]>(async (supabase) => {
    if (!profile?.id) return []
    const since = new Date()
    since.setDate(since.getDate() - PERIOD_DAYS[period])
    const { data } = await supabase
      .from('progress_entries')
      .select('recorded_at, weight_kg')
      .eq('user_id', profile.id)
      .gte('recorded_at', since.toISOString())
      .not('weight_kg', 'is', null)
      .order('recorded_at', { ascending: true })
    type Row = { recorded_at: string; weight_kg: number | null }
    return ((data as Row[] | null) ?? [])
      .filter((r) => r.weight_kg != null)
      .map((r) => ({
        date: r.recorded_at.slice(5, 10),
        weight: Number(r.weight_kg!.toFixed(1)),
      }))
  }, [profile?.id, period])

  const series = useMemo(() => {
    if (liveSeries.data && liveSeries.data.length > 0) return liveSeries.data
    return SEED.slice(-PERIOD_DAYS[period])
  }, [liveSeries.data, period])

  const startWeight = profile?.weight_kg ?? series[0]?.weight ?? 0
  const currentWeight = series[series.length - 1]?.weight ?? startWeight
  const goalWeight = profile?.target_weight_kg ?? Math.max(60, startWeight - 8)

  const delta = Number((currentWeight - startWeight).toFixed(1))
  const deltaAbs = Math.abs(delta)

  const minY = Math.floor(Math.min(...series.map((p) => p.weight)) - 1)
  const maxY = Math.ceil(Math.max(...series.map((p) => p.weight)) + 1)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            <span className="gradient-text">{t('title')}</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {t('logWeight')}
        </button>
      </header>

      {/* Stat trio */}
      <section className="grid grid-cols-3 gap-3 md:gap-4">
        <StatCard
          Icon={Scale}
          label={t('starting')}
          value={startWeight}
          unit="kg"
          tint="#60a5fa"
        />
        <StatCard
          Icon={
            delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus
          }
          label={t('current')}
          value={currentWeight}
          unit="kg"
          tint="#a3e635"
          accent
          sub={
            delta === 0
              ? t('atStart')
              : delta < 0
                ? t('downFromStart', { value: deltaAbs })
                : t('upFromStart', { value: deltaAbs })
          }
        />
        <StatCard
          Icon={Target}
          label={t('goal')}
          value={goalWeight}
          unit="kg"
          tint="#fbbf24"
        />
      </section>

      {/* Trend chart */}
      <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-fg-1">
            {t('weightTrend')}
          </h2>
          <PeriodToggle period={period} onChange={setPeriod} t={t} />
        </header>
        <div className="w-full h-[280px] md:h-[320px]" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="rgb(255 255 255 / 0.06)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#5c7262"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}
                minTickGap={24}
              />
              <YAxis
                domain={[minY, maxY]}
                stroke="#5c7262"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--gf-card-hover)',
                  border: '1px solid rgb(255 255 255 / 0.08)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--gf-fg-1)',
                }}
                labelStyle={{ color: '#9baf9f' }}
                formatter={(value) => [`${value} kg`, '']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#a3e635"
                strokeWidth={2}
                fill="url(#weightFill)"
                dot={false}
                activeDot={{ r: 4, fill: '#a3e635', stroke: '#0d1a12' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* Measurements + Photos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MeasurementsCard
          t={t}
          measurements={measurements}
          onChange={setMeasurements}
        />
        <PhotosCard t={t} active={photoTab} onTabChange={setPhotoTab} />
      </section>

      {/* Achievements */}
      <AchievementsGrid t={t} />

      {/* Log weight modal */}
      {logOpen && (
        <LogWeightModal
          t={t}
          current={currentWeight}
          onClose={() => setLogOpen(false)}
        />
      )}
    </motion.div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function StatCard({
  Icon,
  label,
  value,
  unit,
  tint,
  accent,
  sub,
}: {
  Icon: typeof Scale
  label: string
  value: number
  unit: string
  tint: string
  accent?: boolean
  sub?: string
}) {
  return (
    <article
      className={`glass-effect rounded-2xl p-6 flex flex-col gap-3 ${
        accent ? 'border-primary/40' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon
          className="w-5 h-5"
          strokeWidth={1.75}
          style={{ color: tint }}
        />
        <span className="text-xs uppercase tracking-widest text-fg-3 font-semibold">
          {label}
        </span>
      </div>
      <div className="text-4xl font-bold text-fg-1" dir="ltr">
        {value}
        <span className="text-lg text-fg-3 ml-1 font-normal">{unit}</span>
      </div>
      {sub && <p className="text-xs text-fg-2">{sub}</p>}
    </article>
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
  const items: { p: Period; key: string }[] = [
    { p: '7d', key: 'period7d' },
    { p: '30d', key: 'period30d' },
    { p: '90d', key: 'period90d' },
    { p: '1y', key: 'period1y' },
  ]
  return (
    <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-1">
      {items.map(({ p, key }) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 h-8 rounded-pill text-xs font-semibold transition-colors ${
            period === p
              ? 'bg-primary/20 text-lime-400'
              : 'text-fg-3 hover:text-fg-1'
          }`}
        >
          {t(key)}
        </button>
      ))}
    </div>
  )
}

function MeasurementsCard({
  t,
  measurements,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  measurements: Measurements
  onChange: (m: Measurements) => void
}) {
  const fields: { key: keyof Measurements; label: string }[] = [
    { key: 'chest',  label: t('chest') },
    { key: 'waist',  label: t('waist') },
    { key: 'hips',   label: t('hips') },
    { key: 'arms',   label: t('arms') },
    { key: 'thighs', label: t('thighs') },
    { key: 'neck',   label: t('neck') },
  ]

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-fg-1 mb-4">
        {t('measurements')}
      </h2>
      <ul className="space-y-2.5">
        {fields.map(({ key, label }) => (
          <li
            key={key}
            className="flex items-center justify-between gap-3 rounded-lg bg-bg-deeper/50 border border-border px-3 py-2"
          >
            <label className="text-sm text-fg-1" htmlFor={`m-${key}`}>
              {label}
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`m-${key}`}
                type="number"
                inputMode="decimal"
                step="0.5"
                value={measurements[key] ?? ''}
                onChange={(e) =>
                  onChange({
                    ...measurements,
                    [key]: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
                placeholder="—"
                className="w-20 h-9 rounded-md bg-bg border border-border px-2 text-sm font-mono text-fg-1 text-end focus:outline-none focus:border-primary"
                dir="ltr"
              />
              <span className="text-xs text-fg-3 font-medium w-6">
                {t('cm')}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}

function PhotosCard({
  t,
  active,
  onTabChange,
}: {
  t: ReturnType<typeof useTranslations>
  active: 'frontView' | 'sideView' | 'backView'
  onTabChange: (v: 'frontView' | 'sideView' | 'backView') => void
}) {
  const tabs: { value: 'frontView' | 'sideView' | 'backView'; label: string }[] = [
    { value: 'frontView', label: t('frontView') },
    { value: 'sideView',  label: t('sideView') },
    { value: 'backView',  label: t('backView') },
  ]

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <header className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-fg-1">{t('photos')}</h2>
        <div className="inline-flex rounded-pill bg-bg-deeper border border-border p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTabChange(tab.value)}
              className={`px-3 h-7 rounded-pill text-[11px] font-semibold transition-colors ${
                active === tab.value
                  ? 'bg-primary/20 text-lime-400'
                  : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <p className="text-xs text-fg-3 mb-4 leading-relaxed">{t('photoTip')}</p>

      <div className="rounded-lg border-2 border-dashed border-border bg-bg-deeper/40 aspect-[4/5] flex flex-col items-center justify-center text-center px-4">
        <Camera
          className="w-7 h-7 text-fg-3 mb-3"
          strokeWidth={1.5}
        />
        <p className="text-sm text-fg-2 mb-3">{t('noPhotosYet')}</p>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/60"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {t('uploadPhoto')}
        </button>
      </div>
    </article>
  )
}

function AchievementsGrid({
  t,
}: {
  t: ReturnType<typeof useTranslations>
}) {
  const items: {
    id: string
    title: string
    body: string
    earned: boolean
    Icon: typeof Trophy
    color: string
  }[] = [
    {
      id: 'first_log',
      title: t('ach_first_log'),
      body: t('ach_first_log_body'),
      earned: true,
      Icon: Trophy,
      color: '#fbbf24',
    },
    {
      id: 'week_streak',
      title: t('ach_week_streak'),
      body: t('ach_week_streak_body'),
      earned: false,
      Icon: Flame,
      color: '#fb923c',
    },
    {
      id: 'first_kg',
      title: t('ach_first_kg'),
      body: t('ach_first_kg_body'),
      earned: false,
      Icon: Scale,
      color: '#60a5fa',
    },
    {
      id: 'consistent',
      title: t('ach_consistent'),
      body: t('ach_consistent_body'),
      earned: false,
      Icon: Star,
      color: '#fbbf24',
    },
  ]

  return (
    <section>
      <h2 className="text-base font-semibold text-fg-1 mb-3">
        {t('achievements')}
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <li
            key={item.id}
            className={`glass-effect rounded-xl p-4 flex items-center gap-4 transition-opacity ${
              item.earned ? '' : 'opacity-55'
            }`}
          >
            <item.Icon
              className="w-6 h-6 flex-shrink-0"
              strokeWidth={1.75}
              style={{ color: item.earned ? item.color : 'var(--gf-fg-3)' }}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-fg-1">{item.title}</p>
              <p className="text-xs text-fg-3 leading-snug">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LogWeightModal({
  t,
  current,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>
  current: number
  onClose: () => void
}) {
  const { profile } = useUser()
  const [weight, setWeight] = useState<string>(current.toString())
  const [bodyFat, setBodyFat] = useState<string>('')
  const [saved, setSaved] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!weight) return
    setSaved(true)

    const supabase = getBrowserSupabase()
    if (supabase && profile?.id) {
      void supabase.from('progress_entries').insert({
        user_id: profile.id,
        weight_kg: Number(weight),
        body_fat_percent: bodyFat ? Number(bodyFat) : null,
        recorded_at: new Date().toISOString(),
      } as never)
    }

    window.setTimeout(onClose, 900)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('logWeight')}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-fg-1">{t('logWeight')}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md inline-flex items-center justify-center bg-surface-raised text-fg-2 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="weight"
              className="block text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2"
            >
              {t('weightKg')}
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              autoFocus
              required
              className="w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-base font-mono text-fg-1 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
          <div>
            <label
              htmlFor="bf"
              className="block text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2"
            >
              {t('bodyFatPct')}
              <span className="ms-2 text-fg-3 normal-case font-normal">
                (optional)
              </span>
            </label>
            <input
              id="bf"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-base font-mono text-fg-1 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={saved}
            className={`w-full h-11 rounded-pill text-sm font-semibold transition-all ${
              saved
                ? 'bg-primary/20 text-lime-400 cursor-default'
                : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
            }`}
          >
            {saved ? t('weightLogged') : t('logWeight')}
          </button>
        </form>
      </div>
    </div>
  )
}
