'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Flag,
  Search,
  AlertTriangle,
  Check,
  Power,
} from '@/icons'
import { FEATURES, type FeatureFlag, type Tier, TIERS } from '@/lib/constants'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Group = 'nutrition' | 'community' | 'education' | 'commerce' | 'other'

interface Flag {
  feature: FeatureFlag
  globalOn: boolean
  tiers: Set<Tier>
}

const GROUP_OF: Record<FeatureFlag, Group> = {
  food_scanner:        'nutrition',
  food_scanner_free:   'nutrition',
  meal_plans:          'nutrition',
  nutrition_tracking:  'nutrition',
  progress_charts:     'nutrition',
  supplement_tracking: 'nutrition',
  water_tracking:      'nutrition',
  sleep_tracking:      'nutrition',
  shopping_list:       'nutrition',
  milestone_sharing:   'community',
  community_feed:      'community',
  direct_messaging:    'community',
  ai_chatbot:          'education',
  ai_chatbot_priority: 'education',
  recipe_library:      'education',
  educational_content: 'education',
  advanced_analytics:  'education',
  store_access:        'commerce',
  store_discount:      'commerce',
  bookings:            'commerce',
}

const GROUP_ORDER: Group[] = ['nutrition', 'community', 'education', 'commerce', 'other']

const TIER_TINT: Record<Tier, string> = {
  free:    '#9baf9f',
  basic:   '#06b6d4',
  premium: '#a3e635',
  vip:     '#a855f7',
}

const SEED: Flag[] = FEATURES.map((f) => ({
  feature: f,
  globalOn: f !== 'sleep_tracking',
  tiers: new Set<Tier>(
    f === 'direct_messaging'
      ? ['vip']
      : f === 'meal_plans' || f === 'ai_chatbot_priority'
        ? ['premium', 'vip']
        : f === 'food_scanner_free'
          ? ['free']
          : f === 'food_scanner' ||
              f === 'nutrition_tracking' ||
              f === 'progress_charts' ||
              f === 'recipe_library' ||
              f === 'supplement_tracking'
            ? ['basic', 'premium', 'vip']
            : ['free', 'basic', 'premium', 'vip'],
  ),
}))

export default function AdminFeatureFlagsPage() {
  const t = useTranslations('admin')
  const tF = useTranslations('admin.featureFlagsPage')

  const [flags, setFlags] = useState<Flag[]>(SEED)
  const [query, setQuery] = useState('')
  const [confirm, setConfirm] = useState<FeatureFlag | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      type Row = {
        feature: string
        enabled_for_tiers: Tier[] | null
        is_globally_enabled: boolean | null
      }
      const { data: rows } = await supabase
        .from('feature_flags')
        .select('feature, enabled_for_tiers, is_globally_enabled')
      const list = (rows as Row[] | null) ?? []
      if (cancelled || list.length === 0) return
      const byFeature = new Map(list.map((r) => [r.feature, r]))
      setFlags((curr) =>
        curr.map((f) => {
          const live = byFeature.get(f.feature)
          if (!live) return f
          return {
            ...f,
            globalOn: live.is_globally_enabled ?? f.globalOn,
            tiers: new Set<Tier>(live.enabled_for_tiers ?? Array.from(f.tiers)),
          }
        }),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = (feature: FeatureFlag, payload: Partial<{ is_globally_enabled: boolean; enabled_for_tiers: Tier[] }>) => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    void supabase
      .from('feature_flags')
      .upsert({ feature, ...payload } as never, { onConflict: 'feature' })
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const buckets: Record<Group, Flag[]> = {
      nutrition: [], community: [], education: [], commerce: [], other: [],
    }
    flags.forEach((f) => {
      if (q && !f.feature.toLowerCase().includes(q) && !tF(`descriptions.${f.feature}` as 'descriptions.food_scanner').toLowerCase().includes(q)) return
      buckets[GROUP_OF[f.feature]].push(f)
    })
    return buckets
  }, [flags, query, tF])

  const flash = () => {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1100)
  }

  const toggleGlobal = (feature: FeatureFlag) => {
    const f = flags.find((x) => x.feature === feature)!
    if (f.globalOn) {
      // Show confirm dialog before disabling globally
      setConfirm(feature)
      return
    }
    setFlags((curr) =>
      curr.map((x) => (x.feature === feature ? { ...x, globalOn: true } : x)),
    )
    persist(feature, { is_globally_enabled: true })
    flash()
  }

  const applyGlobalKill = () => {
    if (!confirm) return
    const feature = confirm
    setFlags((curr) =>
      curr.map((x) => (x.feature === feature ? { ...x, globalOn: false } : x)),
    )
    persist(feature, { is_globally_enabled: false })
    setConfirm(null)
    flash()
  }

  const toggleTier = (feature: FeatureFlag, tier: Tier) => {
    let nextTiers: Tier[] = []
    setFlags((curr) =>
      curr.map((x) => {
        if (x.feature !== feature) return x
        const next = new Set(x.tiers)
        if (next.has(tier)) next.delete(tier)
        else next.add(tier)
        nextTiers = Array.from(next)
        return { ...x, tiers: next }
      }),
    )
    persist(feature, { enabled_for_tiers: nextTiers })
    flash()
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('featureFlags')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tF('subtitle')}</p>
          <p className="mt-2 text-xs text-fg-3 inline-flex items-center gap-1.5">
            <Flag className="w-3 h-3" strokeWidth={2} />
            {tF('totalFlags', { count: flags.length })}
          </p>
        </div>
        {savedFlash && (
          <span
            className="inline-flex items-center gap-1.5"
            style={{
              height: 18,
              padding: '0 8px',
              borderRadius: 999,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1,
              background: 'rgba(132,217,61,0.14)',
              color: '#a3e635',
            }}
          >
            <Check
              className="w-2.5 h-2.5"
              strokeWidth={2.5}
              color="currentColor"
            />
            {tF('saved')}
          </span>
        )}
      </header>

      <div className="relative">
        <Search
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ insetInlineStart: '12px' }}
          strokeWidth={1.75}
          color="var(--gf-fg-3)"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tF('search')}
          className="w-full h-10 rounded-lg text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
          style={{
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            paddingInlineStart: '36px',
            paddingInlineEnd: '12px',
          }}
        />
      </div>

      {/* Groups */}
      {GROUP_ORDER.map((group) => {
        const list = grouped[group]
        if (list.length === 0) return null
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
              {tF(`group${group.charAt(0).toUpperCase()}${group.slice(1)}` as 'groupNutrition')}
            </h2>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-[2fr_120px_repeat(4,1fr)] gap-3 px-5 py-3 bg-bg-deeper/40 border-b border-border text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                <div>{tF('tableCol.feature')}</div>
                <div className="text-center">{tF('tableCol.global')}</div>
                <div className="text-center">{tF('tableCol.free')}</div>
                <div className="text-center">{tF('tableCol.basic')}</div>
                <div className="text-center">{tF('tableCol.premium')}</div>
                <div className="text-center">{tF('tableCol.vip')}</div>
              </div>
              <ul className="divide-y divide-border">
                {list.map((f) => (
                  <FlagRow
                    key={f.feature}
                    tF={tF}
                    flag={f}
                    onToggleGlobal={() => toggleGlobal(f.feature)}
                    onToggleTier={(tier) => toggleTier(f.feature, tier)}
                  />
                ))}
              </ul>
            </div>
          </section>
        )
      })}

      {confirm && (
        <ConfirmDialog
          title={tF('killAllConfirm', { feature: confirm.replace(/_/g, ' ') })}
          body={tF('killAllBody')}
          confirmLabel={tF('yesKill')}
          cancelLabel={tF('keep')}
          onCancel={() => setConfirm(null)}
          onConfirm={applyGlobalKill}
        />
      )}
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function FlagRow({
  tF,
  flag,
  onToggleGlobal,
  onToggleTier,
}: {
  tF: ReturnType<typeof useTranslations>
  flag: Flag
  onToggleGlobal: () => void
  onToggleTier: (t: Tier) => void
}) {
  const dimmed = !flag.globalOn
  return (
    <li className={`md:grid md:grid-cols-[2fr_120px_repeat(4,1fr)] gap-3 items-center px-5 py-3 transition-colors ${
      dimmed ? 'opacity-55' : ''
    }`}>
      {/* Feature */}
      <div className="flex items-center gap-3 min-w-0 mb-3 md:mb-0">
        <Power
          className="w-5 h-5 flex-shrink-0"
          strokeWidth={1.75}
          color={flag.globalOn ? '#a3e635' : 'var(--gf-fg-3)'}
        />
        <div className="min-w-0">
          <p className="text-sm font-mono text-fg-1 truncate" dir="ltr">
            {flag.feature}
          </p>
          <p className="text-xs text-fg-3 truncate">
            {tF(`descriptions.${flag.feature}` as 'descriptions.food_scanner')}
          </p>
        </div>
      </div>

      {/* Global */}
      <div className="flex md:justify-center mb-3 md:mb-0">
        <span className="md:hidden me-auto text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tF('tableCol.global')}
        </span>
        <Switch
          on={flag.globalOn}
          onChange={onToggleGlobal}
          danger={flag.globalOn}
        />
      </div>

      {/* Tier checks — tint-bg + tint-check when on, neutral surface
       * when off. Reads as a row of allowed tiers without screaming
       * candy colors at the user, matches the rest of the admin chrome. */}
      {TIERS.map((tier) => {
        const on = flag.tiers.has(tier)
        const tint = TIER_TINT[tier]
        return (
          <div
            key={tier}
            className="flex md:justify-center items-center gap-2 mb-2 md:mb-0"
          >
            <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
              {tier}
            </span>
            <button
              type="button"
              onClick={() => onToggleTier(tier)}
              disabled={!flag.globalOn}
              aria-label={tier}
              className={`inline-flex items-center justify-center transition-all overflow-hidden ${
                !flag.globalOn ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: on ? `${tint}24` : 'var(--gf-input-bg)',
                border: `1px solid ${on ? `${tint}66` : 'var(--gf-border)'}`,
                color: on ? tint : 'transparent',
                lineHeight: 0,
              }}
            >
              {on && (
                <Check
                  className="w-3.5 h-3.5"
                  strokeWidth={2}
                  color="currentColor"
                />
              )}
            </button>
          </div>
        )
      })}
    </li>
  )
}

/**
 * Feature-flag switch — same geometry + colors as the shared
 * @/components/Switch component (44×24, lime-500 on, white thumb,
 * thumb-shadow), with an extra red danger dot in the corner when the
 * flag is globally enabled. The dot exists to remind admins that
 * disabling it is a destructive global kill action.
 */
function Switch({
  on,
  onChange,
  danger,
}: {
  on: boolean
  onChange: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className="shrink-0 relative transition-colors"
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        background: on ? '#84cc16' : 'rgba(255,255,255,0.12)',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: 9,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          transition: 'left 200ms',
        }}
      />
      {danger && on && (
        <span
          aria-hidden
          className="absolute"
          style={{
            top: -2,
            insetInlineEnd: -2,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#f43f5e',
            boxShadow: '0 0 6px rgba(244,63,94,0.7)',
          }}
        />
      )}
    </button>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl p-6">
        <h3 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" strokeWidth={1.75} />
          {title}
        </h3>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{body}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-fg-1 transition-colors"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              borderRadius: 8,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 h-10 px-5 text-sm font-semibold transition-colors"
            style={{
              background: 'rgba(244,63,94,0.18)',
              color: '#f43f5e',
              borderRadius: 8,
              border: '1px solid rgba(244,63,94,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(244,63,94,0.28)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244,63,94,0.18)'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
