'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'

const TIERS = ['free', 'basic', 'premium', 'vip'] as const
type Tier = (typeof TIERS)[number]

const TIER_COLORS: Record<Tier, string> = {
  free: '#5c7262',
  basic: '#84cc16',
  premium: '#3d7a4a',
  vip: '#c9a84c',
}

const FEATURES = [
  {
    key: 'scanner' as const,
    settingKey: 'ai_limits_scanner',
    label: 'Food Scanner',
    labelAr: 'الماسح الغذائي',
    icon: '📸',
    desc: 'Photo scans per day',
    descAr: 'مسح صور يومياً',
  },
  {
    key: 'ai_chat' as const,
    settingKey: 'ai_limits_chat',
    label: 'AI Chat',
    labelAr: 'محادثة الذكاء الاصطناعي',
    icon: '🤖',
    desc: 'Messages per day',
    descAr: 'رسائل يومياً',
  },
  {
    key: 'research' as const,
    settingKey: 'ai_limits_research',
    label: 'Research Desk',
    labelAr: 'مكتب البحث',
    icon: '🔬',
    desc: 'Research queries per day',
    descAr: 'استفسارات بحثية يومياً',
  },
] as const

type FeatureKey = (typeof FEATURES)[number]['key']

export default function AILimitsPage() {
  const locale = useLocale()
  const isAr = locale === 'ar'

  const [limits, setLimits] = useState<Record<FeatureKey, Record<Tier, number>>>({
    scanner: { free: 3, basic: 999, premium: 999, vip: 999 },
    ai_chat: { free: 0, basic: 0, premium: 50, vip: 999 },
    research: { free: 0, basic: 0, premium: 20, vip: 999 },
  })
  const [globalCap, setGlobalCap] = useState(1000)
  const [todayUsage, setTodayUsage] = useState(0)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    ;(async () => {
      // Load all 4 settings rows at once
      const keys: string[] = [
        ...FEATURES.map((f) => f.settingKey),
        'ai_daily_global_cap',
      ]
      const { data: rows } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keys)
      if (cancelled) return
      type SettingRow = { key: string; value: unknown }
      const list = (rows as SettingRow[] | null) ?? []
      const next = { ...limits }
      for (const row of list) {
        if (row.key === 'ai_daily_global_cap') {
          const v =
            typeof row.value === 'number'
              ? row.value
              : Number(row.value as string)
          if (Number.isFinite(v)) setGlobalCap(v)
        } else {
          const feature = FEATURES.find((f) => f.settingKey === row.key)
          if (feature && row.value && typeof row.value === 'object') {
            next[feature.key] = {
              ...next[feature.key],
              ...(row.value as Partial<Record<Tier, number>>),
            }
          }
        }
      }
      setLimits(next)

      // Today's total usage across all features (for the global progress bar)
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

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '32px 24px',
        direction: isAr ? 'rtl' : 'ltr',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontWeight: 700,
            fontSize: '2rem',
            color: '#f0ede6',
            margin: '0 0 8px',
          }}
        >
          {isAr ? 'حدود استخدام الذكاء الاصطناعي' : 'AI Usage Limits'}
        </h1>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9rem',
            color: '#9baf9f',
            margin: 0,
          }}
        >
          {isAr
            ? 'تحكم في عدد طلبات الذكاء الاصطناعي لكل خطة يومياً. 999 = غير محدود، 0 = معطّل.'
            : 'Control daily AI requests per tier. Set 999 for unlimited, 0 to disable.'}
        </p>
      </div>

      {/* Global cap */}
      <div
        style={{
          background: '#132218',
          border: '0.5px solid #243d2a',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#f0ede6',
              margin: '0 0 4px',
            }}
          >
            ⚡ {isAr ? 'الحد اليومي العالمي' : 'Global Daily Cap'}
          </h3>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.8rem',
              color: '#9baf9f',
              margin: 0,
            }}
          >
            {isAr
              ? 'حد صارم لجميع المستخدمين مجتمعين للتحكم في التكاليف'
              : 'Hard limit across all users combined to control costs'}
          </p>
        </div>

        {/* Today usage bar */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: '#9baf9f',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {isAr ? 'الاستخدام اليوم' : 'Used today'}
            </span>
            <span
              style={{
                fontSize: '12px',
                color: '#f0ede6',
                fontFamily: 'JetBrains Mono, monospace',
              }}
              dir="ltr"
            >
              {todayUsage} / {globalCap}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: '#243d2a',
              borderRadius: '3px',
            }}
          >
            <div
              style={{
                width: `${Math.min((todayUsage / Math.max(globalCap, 1)) * 100, 100)}%`,
                height: '100%',
                background: todayUsage > globalCap * 0.8 ? '#c0392b' : '#84cc16',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="number"
            value={globalCap}
            onChange={(e) => setGlobalCap(Number(e.target.value))}
            min={100}
            max={10000}
            style={{
              width: '120px',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#f0ede6',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '15px',
            }}
            dir="ltr"
          />
          <span
            style={{
              fontSize: '13px',
              color: '#9baf9f',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {isAr ? 'طلب / يوم' : 'requests / day'}
          </span>
          <button
            type="button"
            onClick={saveGlobalCap}
            disabled={saving === 'global'}
            style={{
              background:
                saving === 'global'
                  ? 'rgba(61,122,74,0.5)'
                  : saved === 'global'
                    ? '#4caf72'
                    : '#3d7a4a',
              color: '#f0ede6',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              cursor: saving === 'global' ? 'not-allowed' : 'pointer',
            }}
          >
            {saved === 'global'
              ? isAr
                ? '✓ تم الحفظ'
                : '✓ Saved'
              : isAr
                ? 'حفظ'
                : 'Save'}
          </button>
        </div>
      </div>

      {/* Feature cards */}
      {FEATURES.map((feature) => (
        <div
          key={feature.key}
          style={{
            background: '#132218',
            border: '0.5px solid #243d2a',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#f0ede6',
                  margin: '0 0 4px',
                }}
              >
                {feature.icon} {isAr ? feature.labelAr : feature.label}
              </h3>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.8rem',
                  color: '#9baf9f',
                  margin: 0,
                }}
              >
                {isAr ? feature.descAr : feature.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveFeature(feature.key, feature.settingKey)}
              disabled={saving === feature.key}
              style={{
                background:
                  saving === feature.key
                    ? 'rgba(61,122,74,0.5)'
                    : saved === feature.key
                      ? '#4caf72'
                      : '#3d7a4a',
                color: '#f0ede6',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '13px',
                cursor: saving === feature.key ? 'not-allowed' : 'pointer',
              }}
            >
              {saved === feature.key
                ? isAr
                  ? '✓ تم الحفظ'
                  : '✓ Saved'
                : isAr
                  ? 'حفظ'
                  : 'Save'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '12px',
            }}
          >
            {TIERS.map((tier) => {
              const v = limits[feature.key]?.[tier] ?? 0
              return (
                <div key={tier}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: TIER_COLORS[tier],
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: TIER_COLORS[tier],
                      }}
                    >
                      {tier}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={v}
                    onChange={(e) =>
                      updateLimit(feature.key, tier, Number(e.target.value))
                    }
                    min={0}
                    max={999}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${TIER_COLORS[tier]}40`,
                      borderRadius: '8px',
                      color: '#f0ede6',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '16px',
                      textAlign: 'center',
                    }}
                    dir="ltr"
                  />
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '10px',
                      color: '#5c7262',
                      margin: '4px 0 0',
                      textAlign: 'center',
                    }}
                  >
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
        </div>
      ))}

      {/* Quick guide */}
      <div
        style={{
          background: 'rgba(61,122,74,0.08)',
          border: '0.5px solid rgba(61,122,74,0.3)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <h4
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#84cc16',
            margin: '0 0 12px',
          }}
        >
          {isAr ? '💡 دليل الاستخدام' : '💡 Quick Guide'}
        </h4>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
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
            <div
              key={val}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <code
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '13px',
                  color: '#84cc16',
                  background: 'rgba(132,204,22,0.1)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                {val}
              </code>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  color: '#9baf9f',
                }}
              >
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
