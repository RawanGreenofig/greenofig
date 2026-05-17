'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  Zap,
  Camera,
  Bot,
  Microscope,
  Save,
  Check,
  Lightbulb,
  type LucideIcon,
} from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'

const TIERS = ['free', 'basic', 'premium', 'vip'] as const
type Tier = (typeof TIERS)[number]

const TIER_TINT: Record<Tier, string> = {
  free:    '#9baf9f',
  basic:   '#06b6d4',
  premium: '#a3e635',
  vip:     '#a855f7',
}

interface FeatureCfg {
  key: 'scanner' | 'ai_chat' | 'research'
  settingKey: string
  label: string
  labelAr: string
  Icon: LucideIcon
  tint: string
  desc: string
  descAr: string
}

const FEATURES: readonly FeatureCfg[] = [
  {
    key: 'scanner',
    settingKey: 'ai_limits_scanner',
    label: 'Food Scanner',
    labelAr: 'الماسح الغذائي',
    Icon: Camera,
    tint: '#a3e635',
    desc: 'Photo scans per day',
    descAr: 'مسح صور يومياً',
  },
  {
    key: 'ai_chat',
    settingKey: 'ai_limits_chat',
    label: 'AI Chat',
    labelAr: 'محادثة الذكاء الاصطناعي',
    Icon: Bot,
    tint: '#06b6d4',
    desc: 'Messages per day',
    descAr: 'رسائل يومياً',
  },
  {
    key: 'research',
    settingKey: 'ai_limits_research',
    label: 'Research Desk',
    labelAr: 'مكتب البحث',
    Icon: Microscope,
    tint: '#a855f7',
    desc: 'Research queries per day',
    descAr: 'استفسارات بحثية يومياً',
  },
] as const

type FeatureKey = (typeof FEATURES)[number]['key']

export default function AILimitsPage() {
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [limits, setLimits] = useState<Record<FeatureKey, Record<Tier, number>>>({
    scanner:  { free: 3, basic: 999, premium: 999, vip: 999 },
    ai_chat:  { free: 0, basic: 0, premium: 50, vip: 999 },
    research: { free: 0, basic: 0, premium: 20, vip: 999 },
  })
  const [globalCap, setGlobalCap] = useState(1000)
  const [todayUsage, setTodayUsage] = useState(0)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Load every limit through /api/settings/[key]. The previous code
    // used the browser supabase client, which raced the session
    // restore on hard refresh — same bug pattern that hit
    // /admin/settings, where the form would fall back to its
    // hardcoded defaults instead of the saved values.
    const settingKeys: string[] = [
      ...FEATURES.map((f) => f.settingKey),
      'ai_daily_global_cap',
    ]
    ;(async () => {
      const results = await Promise.all(
        settingKeys.map(async (key) => {
          const res = await fetch(`/api/settings/${key}`, { cache: 'no-store' })
          if (!res.ok) return [key, null] as const
          const body = (await res.json()) as { value?: unknown }
          return [key, body.value ?? null] as const
        }),
      )
      if (cancelled) return
      const next = { ...limits }
      for (const [key, value] of results) {
        if (value === null) continue
        if (key === 'ai_daily_global_cap') {
          const v = typeof value === 'number' ? value : Number(value as string)
          if (Number.isFinite(v)) setGlobalCap(v)
        } else {
          const feature = FEATURES.find((f) => f.settingKey === key)
          if (feature && typeof value === 'object') {
            next[feature.key] = {
              ...next[feature.key],
              ...(value as Partial<Record<Tier, number>>),
            }
          }
        }
      }
      setLimits(next)
    })()

    // Today's total usage across all features still reads the aggregate
    // off `ai_usage` directly — the row count is small, the data isn't
    // tied to any admin-toggleable flag, and reading via the admin
    // session is the right RLS gate.
    const supabase = getBrowserSupabase()
    if (supabase) {
      ;(async () => {
        const today = new Date().toISOString().slice(0, 10)
        const { data: usageRows } = await supabase
          .from('ai_usage')
          .select('request_count')
          .eq('date', today)
        type UsageRow = { request_count: number | null }
        const total = ((usageRows as UsageRow[] | null) ?? []).reduce(
          (acc, r) => acc + (r.request_count ?? 0),
          0,
        )
        if (!cancelled) setTodayUsage(total)
      })()
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateLimit = (feature: FeatureKey, tier: Tier, value: number) => {
    setLimits((prev) => ({
      ...prev,
      [feature]: { ...(prev[feature] ?? {}), [tier]: value },
    }))
  }

  const saveFeature = async (key: FeatureKey, settingKey: string) => {
    setSaving(key)
    try {
      await fetch(`/api/settings/${settingKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: limits[key] }),
      })
      setSaved(key)
      window.setTimeout(() => setSaved(null), 2000)
    } finally {
      setSaving(null)
    }
  }

  const saveGlobalCap = async () => {
    setSaving('global')
    try {
      await fetch('/api/settings/ai_daily_global_cap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: globalCap }),
      })
      setSaved('global')
      window.setTimeout(() => setSaved(null), 2000)
    } finally {
      setSaving(null)
    }
  }

  const usagePct = Math.min((todayUsage / Math.max(globalCap, 1)) * 100, 100)
  const usageHot = todayUsage > globalCap * 0.8

  return (
    <div
      className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <header className="flex items-start gap-3">
        <Zap
          className="w-6 h-6 mt-1 flex-shrink-0"
          strokeWidth={1.75}
          color="#a3e635"
        />
        <div className="min-w-0">
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {isAr ? 'حدود استخدام الذكاء الاصطناعي' : 'AI Usage Limits'}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2 max-w-2xl">
            {isAr
              ? 'تحكم في عدد طلبات الذكاء الاصطناعي لكل خطة يومياً. 999 = غير محدود، 0 = معطّل.'
              : 'Control daily AI requests per tier. Set 999 for unlimited, 0 to disable.'}
          </p>
        </div>
      </header>

      {/* Global cap */}
      <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
        <header className="flex items-start gap-3 mb-4">
          <Zap
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            strokeWidth={1.75}
            color="#fbbf24"
          />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-fg-1">
              {isAr ? 'الحد اليومي العالمي' : 'Global Daily Cap'}
            </h2>
            <p className="mt-0.5 text-xs text-fg-3">
              {isAr
                ? 'حد صارم لجميع المستخدمين مجتمعين للتحكم في التكاليف'
                : 'Hard limit across all users combined to control costs'}
            </p>
          </div>
        </header>

        {/* Today usage bar — same recipe as funnel/tier bars on /admin/analytics */}
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-fg-3">
              {isAr ? 'الاستخدام اليوم' : 'Used today'}
            </span>
            <span className="text-xs font-mono text-fg-1" dir="ltr">
              {todayUsage.toLocaleString()} / {globalCap.toLocaleString()}
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: 'var(--gf-input-bg)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usagePct}%`,
                background: usageHot
                  ? 'linear-gradient(90deg, #f43f5e, #f43f5ecc)'
                  : 'linear-gradient(90deg, #a3e635, #a3e635cc)',
                boxShadow: usageHot
                  ? '0 0 8px rgba(244,63,94,0.5)'
                  : '0 0 8px rgba(163,230,53,0.45)',
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <NumberField
            value={globalCap}
            onChange={setGlobalCap}
            min={100}
            max={10000}
            width={120}
            tint="#fbbf24"
          />
          <span className="text-xs text-fg-3">
            {isAr ? 'طلب / يوم' : 'requests / day'}
          </span>
          <SaveButton
            isAr={isAr}
            saving={saving === 'global'}
            saved={saved === 'global'}
            onClick={saveGlobalCap}
          />
        </div>
      </article>

      {/* Per-feature cards */}
      {FEATURES.map((feature) => (
        <article
          key={feature.key}
          className="rounded-xl border border-border bg-surface p-5 md:p-6"
        >
          <header className="flex items-start justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <feature.Icon
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                strokeWidth={1.75}
                color={feature.tint}
              />
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-fg-1">
                  {isAr ? feature.labelAr : feature.label}
                </h3>
                <p className="mt-0.5 text-xs text-fg-3">
                  {isAr ? feature.descAr : feature.desc}
                </p>
              </div>
            </div>
            <SaveButton
              isAr={isAr}
              saving={saving === feature.key}
              saved={saved === feature.key}
              onClick={() => saveFeature(feature.key, feature.settingKey)}
            />
          </header>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TIERS.map((tier) => {
              const v = limits[feature.key]?.[tier] ?? 0
              const tint = TIER_TINT[tier]
              return (
                <div key={tier}>
                  <span
                    className="inline-flex items-center mb-2"
                    style={{
                      height: 18,
                      padding: '0 8px',
                      borderRadius: 999,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      background: `${tint}1f`,
                      color: tint,
                    }}
                  >
                    {tier}
                  </span>
                  <NumberField
                    value={v}
                    onChange={(n) => updateLimit(feature.key, tier, n)}
                    min={0}
                    max={999}
                    width="100%"
                    tint={tint}
                    centered
                  />
                  <p className="mt-1.5 text-[10px] text-fg-3 text-center">
                    {v === 0
                      ? isAr
                        ? 'معطّل'
                        : 'disabled'
                      : v >= 999
                        ? isAr
                          ? 'غير محدود'
                          : 'unlimited'
                        : isAr
                          ? '/يوم'
                          : '/day'}
                  </p>
                </div>
              )
            })}
          </div>
        </article>
      ))}

      {/* Quick guide */}
      <article
        className="rounded-xl p-5"
        style={{
          background: 'rgba(163,230,53,0.06)',
          border: '1px solid rgba(163,230,53,0.2)',
        }}
      >
        <h4 className="text-xs uppercase tracking-eyebrow font-semibold mb-3 inline-flex items-center gap-1.5"
            style={{ color: '#a3e635' }}>
          <Lightbulb
            className="w-3.5 h-3.5"
            strokeWidth={1.75}
            color="currentColor"
          />
          {isAr ? 'دليل الاستخدام' : 'Quick Guide'}
        </h4>
        <ul className="space-y-2">
          {(
            isAr
              ? [
                  ['0', 'الميزة معطّلة لهذه الخطة'],
                  ['1–998', 'الحد اليومي الدقيق لكل مستخدم'],
                  ['999', 'غير محدود (لا توجد قيود)'],
                ]
              : [
                  ['0', 'Feature disabled for this tier'],
                  ['1–998', 'Exact daily limit per user'],
                  ['999', 'Unlimited (no restrictions)'],
                ]
          ).map(([val, desc]) => (
            <li key={val} className="flex items-center gap-3">
              <code
                className="font-mono text-xs inline-flex items-center justify-center"
                style={{
                  height: 22,
                  minWidth: 48,
                  padding: '0 8px',
                  borderRadius: 6,
                  background: 'rgba(163,230,53,0.12)',
                  color: '#a3e635',
                  fontWeight: 600,
                }}
              >
                {val}
              </code>
              <span className="text-xs text-fg-2">{desc}</span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

/**
 * Dashboard input recipe (var(--gf-input-bg) + var(--gf-border) + 8px
 * radius). Accepts a tint prop that applies a subtle accent to the
 * border so per-tier cells stay color-coded without going candy.
 */
function NumberField({
  value,
  onChange,
  min,
  max,
  width,
  tint,
  centered,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  width: number | string
  tint?: string
  centered?: boolean
}) {
  return (
    <input
      type="number"
      value={Number.isNaN(value) ? '' : value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      dir="ltr"
      className="h-10 px-3 rounded-lg text-sm font-mono text-fg-1 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      style={{
        width,
        background: 'var(--gf-input-bg)',
        border: `1px solid ${tint ? `${tint}40` : 'var(--gf-border)'}`,
        textAlign: centered ? 'center' : 'start',
      }}
    />
  )
}

/**
 * Save button used by both the global cap and each per-feature card.
 * Uses the lime primary CTA shape that ships across the rest of the
 * dashboard, with a "saved" success state that flashes green then
 * fades away.
 */
function SaveButton({
  isAr,
  saving,
  saved,
  onClick,
}: {
  isAr: boolean
  saving: boolean
  saved: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0"
    >
      {saved ? (
        <Check
          className="w-3.5 h-3.5"
          strokeWidth={2.5}
          color="currentColor"
        />
      ) : (
        <Save
          className="w-3.5 h-3.5"
          strokeWidth={2}
          color="currentColor"
        />
      )}
      {saved ? (isAr ? 'تم الحفظ' : 'Saved') : isAr ? 'حفظ' : 'Save'}
    </button>
  )
}
