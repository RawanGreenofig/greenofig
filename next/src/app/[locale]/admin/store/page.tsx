'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  ToggleRight,
  ToggleLeft,
  AlertTriangle,
  Sparkles,
  ShoppingBag,
  Package,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface Product {
  id: string
  name: string
  category: string
  stock: number
  hue: string
}

const ALL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Daily Greens Powder',         category: 'Superfoods',  stock: 14, hue: 'rgb(163 230 53 / 0.18)' },
  { id: 'p2', name: 'Magnesium Glycinate 200 mg',  category: 'Supplements', stock: 22, hue: 'rgb(168 85 247 / 0.18)' },
  { id: 'p3', name: 'Vitamin D3 + K2',             category: 'Supplements', stock: 4,  hue: 'rgb(232 145 42 / 0.18)' },
  { id: 'p4', name: 'Mediterranean Olive Oil',     category: 'Kitchen',     stock: 30, hue: 'rgb(132 204 22 / 0.18)' },
  { id: 'p5', name: 'Almond Butter, raw',          category: 'Snacks',      stock: 24, hue: 'rgb(232 145 42 / 0.16)' },
  { id: 'p6', name: 'Probiotic 25 Billion',        category: 'Supplements', stock: 0,  hue: 'rgb(34 197 94 / 0.18)' },
  { id: 'p7', name: 'Eat Real — Dr. Rawan',        category: 'Books',       stock: 12, hue: 'rgb(61 122 74 / 0.22)' },
  { id: 'p8', name: 'Cold-Pressed Tahini',         category: 'Kitchen',     stock: 3,  hue: 'rgb(234 179 8 / 0.18)' },
]

export default function AdminStorePage() {
  const t = useTranslations('admin')
  const tS = useTranslations('admin.storePage')

  const [live, setLive] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  const [confirm, setConfirm] = useState<null | 'go-live' | 'go-offline'>(null)
  const [featured, setFeatured] = useState<string[]>(
    ['p1', 'p2', 'p4', 'p7'],
  )
  const [products, setProducts] = useState<Product[]>(ALL_PRODUCTS)

  // Hydrate products + the master toggle settings from the DB on mount.
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    void (async () => {
      type Row = {
        id: string; name: string; category: string; stock: number; hue: string | null
      }
      const { data: rows } = await supabase
        .from('products')
        .select('id, name, category, stock, hue')
        .order('created_at', { ascending: false })
        .limit(80)
      if (!cancelled) {
        const list = ((rows as Row[] | null) ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          stock: r.stock,
          hue: r.hue ?? 'rgb(132 204 22 / 0.16)',
        }))
        if (list.length > 0) setProducts(list)
      }

      type SettingRow = { key: string; value: unknown }
      const { data: settingsRows } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['store_enabled', 'maintenance_mode'])
      if (!cancelled) {
        for (const s of (settingsRows as SettingRow[] | null) ?? []) {
          if (s.key === 'store_enabled')   setLive(s.value === true || s.value === 'true')
          if (s.key === 'maintenance_mode') setMaintenance(s.value === true || s.value === 'true')
        }
      }
    })()

    return () => { cancelled = true }
  }, [])

  const totalProducts = products.length
  const drPicksCount = 5
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 5)
  const outOfStock = products.filter((p) => p.stock <= 0)

  const requestToggle = () => setConfirm(live ? 'go-offline' : 'go-live')
  const applyToggle = () => {
    const nextLive = !live
    setLive(nextLive)
    setConfirm(null)
    void fetch('/api/settings/store_enabled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: nextLive }),
    })
  }

  // Persist maintenance toggle on user change (skip the initial render +
  // hydration-from-DB so we don't echo the value we just read).
  const maintenanceSettled = useRef(false)
  useEffect(() => {
    if (!maintenanceSettled.current) {
      maintenanceSettled.current = true
      return
    }
    void fetch('/api/settings/maintenance_mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: maintenance }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenance])

  const move = (id: string, dir: -1 | 1) => {
    setFeatured((curr) => {
      const idx = curr.indexOf(id)
      if (idx < 0) return curr
      const next = idx + dir
      if (next < 0 || next >= curr.length) return curr
      const out = [...curr]
      ;[out[idx], out[next]] = [out[next]!, out[idx]!]
      return out
    })
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('store')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{tS('subtitle')}</p>
      </header>

      {/* Master toggle */}
      <article
        className={`rounded-xl border p-5 md:p-6 ${
          live
            ? 'border-primary/30 bg-gradient-to-b from-primary/10 to-transparent'
            : 'border-rose-500/30 bg-rose-500/5'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {live ? (
              <ToggleRight
                className="w-7 h-7 text-primary flex-shrink-0"
                strokeWidth={1.75}
              />
            ) : (
              <ToggleLeft
                className="w-7 h-7 text-rose-500 flex-shrink-0"
                strokeWidth={1.75}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
                {tS('masterToggle')}
              </p>
              <h2 className="mt-1 font-display text-2xl md:text-3xl font-bold text-fg-1 tracking-tight">
                {live ? tS('masterLive') : tS('masterOffline')}
              </h2>
              <p className="mt-1.5 text-sm text-fg-2 max-w-md leading-relaxed">
                {live ? tS('masterDescLive') : tS('masterDescOffline')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestToggle}
            className={`inline-flex items-center gap-1.5 rounded-pill h-11 px-5 text-sm font-semibold transition-all ${
              live
                ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
            }`}
          >
            {live ? tS('yesGoOffline') : tS('yesGoLive')}
          </button>
        </div>
      </article>

      {/* Maintenance mode */}
      <article className="rounded-xl border border-border bg-surface p-5 flex flex-wrap items-start gap-4">
        <Wrench
          className="w-6 h-6 flex-shrink-0"
          strokeWidth={1.75}
          style={{
            color: maintenance ? '#fbbf24' : 'var(--gf-fg-3)',
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg-1">{tS('maintenance')}</p>
          <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">
            {tS('maintenanceBody')}
          </p>
        </div>
        <Switch on={maintenance} onChange={setMaintenance} />
      </article>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          Icon={ShoppingBag}
          tint="#a3e635"
          label={tS('kpis.products')}
          value={totalProducts}
        />
        <KpiCard
          Icon={Sparkles}
          tint="#a855f7"
          label={tS('kpis.drPicks')}
          value={drPicksCount}
        />
        <KpiCard
          Icon={TrendingDown}
          tint="#e8912a"
          label={tS('kpis.lowStock')}
          value={lowStock.length}
        />
        <KpiCard
          Icon={Package}
          tint="#f43f5e"
          label={tS('kpis.outOfStock')}
          value={outOfStock.length}
        />
      </section>

      {/* Inventory + Featured */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="rounded-xl border border-border bg-surface p-5">
          <header className="mb-4">
            <h2 className="text-base font-semibold text-fg-1">{tS('lowStockTitle')}</h2>
            <p className="text-xs text-fg-3 mt-0.5">{tS('lowStockBody')}</p>
          </header>
          {lowStock.length + outOfStock.length === 0 ? (
            <div className="rounded-lg bg-bg-deeper/40 border border-border p-6 text-center text-sm text-fg-2 inline-flex items-center justify-center gap-2 w-full">
              <CheckCircle2 className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
              {tS('noLowStock')}
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--gf-border)' }}>
              {[...outOfStock, ...lowStock].map((p) => {
                const out = p.stock <= 0
                // Status-tinted icon tile + matching pill — switching from
                // per-category bright hues to a status-driven palette makes
                // the row read as a hierarchy of urgency (red > amber)
                // instead of an unrelated rainbow.
                const tone = out
                  ? { tile: 'rgba(244,63,94,0.12)', text: '#f43f5e', label: 'OUT' }
                  : {
                      tile: 'rgba(232,145,42,0.12)',
                      text: '#fbbf24',
                      label: `${p.stock} LEFT`,
                    }
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 -mx-2 px-2 rounded-lg transition-colors"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'var(--gf-card-hover)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'transparent')
                    }
                  >
                    <span
                      className="shrink-0 inline-flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: tone.tile,
                        border: `1px solid ${tone.text}33`,
                      }}
                    >
                      <ShoppingBag
                        className="w-4 h-4"
                        strokeWidth={1.75}
                        style={{ color: tone.text }}
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-1 truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-fg-3 truncate mt-0.5">
                        {p.category}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center justify-center"
                      style={{
                        height: 22,
                        padding: '0 10px',
                        borderRadius: 999,
                        background: tone.tile,
                        color: tone.text,
                        fontSize: 10.5,
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tone.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-border bg-surface p-5">
          <header className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-semibold text-fg-1">{tS('featuredTitle')}</h2>
              <p className="text-xs text-fg-3 mt-0.5">{tS('featuredBody')}</p>
            </div>
            <Link
              href="/nutritionist/store"
              className="text-xs text-lime-400 hover:underline inline-flex items-center gap-1"
            >
              {tS('openCuration')}
              <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={2} />
            </Link>
          </header>
          {/* Featured-order list. Switched from per-row sub-cards to a
           * dividing-line stack so the article reads as ONE card with
           * clean rows — no "card inside a card inside a card". The
           * rank circle uses the lime tier-accent treatment, and the
           * product icon tile is now a neutral surface so categories
           * don't introduce a rainbow per row. Move buttons sit in a
           * subtle pill group at the row end. */}
          <ol className="divide-y" style={{ borderColor: 'var(--gf-border)' }}>
            {featured.map((id, i) => {
              const p = products.find((x) => x.id === id)
              if (!p) return null
              return (
                <li
                  key={id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 -mx-2 px-2 rounded-lg transition-colors"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--gf-card-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center font-mono font-bold"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: 'rgba(132,217,61,0.12)',
                      color: '#a3e635',
                      fontSize: 11,
                      letterSpacing: '0.02em',
                    }}
                    dir="ltr"
                  >
                    {i + 1}
                  </span>
                  <span
                    className="shrink-0 inline-flex items-center justify-center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'var(--gf-card-hover)',
                      border: '1px solid var(--gf-border)',
                    }}
                  >
                    <ShoppingBag
                      className="w-4 h-4"
                      strokeWidth={1.75}
                      style={{ color: 'var(--gf-fg-2)' }}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-1 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-fg-3 truncate mt-0.5">
                      {p.category}
                    </p>
                  </div>
                  <div
                    className="shrink-0 inline-flex items-center"
                    style={{
                      background: 'var(--gf-card-hover)',
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                      padding: 2,
                      gap: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => move(id, -1)}
                      aria-label={tS('moveUp')}
                      disabled={i === 0}
                      className="inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        width: 26,
                        height: 26,
                        background: 'transparent',
                        color: 'var(--gf-fg-2)',
                      }}
                      onMouseEnter={(e) => {
                        if (i !== 0) {
                          e.currentTarget.style.background = 'var(--gf-card)'
                          e.currentTarget.style.color = 'var(--gf-fg-1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--gf-fg-2)'
                      }}
                    >
                      <ChevronUp className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(id, 1)}
                      aria-label={tS('moveDown')}
                      disabled={i === featured.length - 1}
                      className="inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        width: 26,
                        height: 26,
                        background: 'transparent',
                        color: 'var(--gf-fg-2)',
                      }}
                      onMouseEnter={(e) => {
                        if (i !== featured.length - 1) {
                          e.currentTarget.style.background = 'var(--gf-card)'
                          e.currentTarget.style.color = 'var(--gf-fg-1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--gf-fg-2)'
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        </article>
      </section>

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          title={confirm === 'go-offline' ? tS('confirmGoOffline') : tS('confirmGoLive')}
          body={
            confirm === 'go-offline'
              ? tS('confirmGoOfflineBody')
              : tS('confirmGoLiveBody')
          }
          confirmLabel={confirm === 'go-offline' ? tS('yesGoOffline') : tS('yesGoLive')}
          cancelLabel={tS('keep')}
          tone={confirm === 'go-offline' ? 'danger' : 'lime'}
          onConfirm={applyToggle}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function KpiCard({
  Icon,
  tint,
  label,
  value,
}: {
  Icon: LucideIcon
  tint: string
  label: string
  value: number
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: tint }} />
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

function Switch({
  on,
  onChange,
}: {
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`shrink-0 relative w-10 h-6 rounded-full transition-colors ${
        on ? 'bg-amber-400' : 'bg-bg-deeper border border-border'
      }`}
      style={on ? { background: '#e8912a' } : undefined}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-bg shadow transition-all ${
          on ? 'start-[18px]' : 'start-0.5'
        }`}
      />
    </button>
  )
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  tone: 'danger' | 'lime'
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
          <AlertTriangle
            className={`w-4 h-4 ${tone === 'danger' ? 'text-rose-400' : 'text-lime-400'}`}
            strokeWidth={1.75}
          />
          {title}
        </h3>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{body}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-sm font-medium text-fg-1 hover:border-primary/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-pill h-10 px-5 text-sm font-semibold transition-colors ${
              tone === 'danger'
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
