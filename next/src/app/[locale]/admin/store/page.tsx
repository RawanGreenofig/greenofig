'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
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
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { Switch } from '@/components/Switch'

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
  { id: 'p7', name: 'Eat Real — Nutrition Coach Rawan',        category: 'Books',       stock: 12, hue: 'rgb(61 122 74 / 0.22)' },
  { id: 'p8', name: 'Cold-Pressed Tahini',         category: 'Kitchen',     stock: 3,  hue: 'rgb(234 179 8 / 0.18)' },
]

/**
 * Persist a single platform_settings value to the server whenever it
 * changes after the initial hydration read. The settled ref skips the
 * very first effect run so the value loaded from the DB doesn't
 * immediately echo back as a write.
 */
function usePersistSetting(key: string, value: unknown): void {
  const settled = useRef(false)
  useEffect(() => {
    if (!settled.current) {
      settled.current = true
      return
    }
    void fetch(`/api/settings/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
}

export default function AdminStorePage() {
  const t = useTranslations('admin')
  const tS = useTranslations('admin.storePage')

  const [live, setLive] = useState(true)
  const [maintenance, setMaintenance] = useState(false)
  // Platform controls — admin can disable each feature surface site-wide.
  // Default true (enabled) so a missing row reads as on. Each toggle has
  // a consumer that hides the corresponding feature when flipped off.
  const [aiChatEnabled, setAiChatEnabled] = useState(true)
  const [bookingEnabled, setBookingEnabled] = useState(true)
  const [scannerEnabled, setScannerEnabled] = useState(true)
  const [communityEnabled, setCommunityEnabled] = useState(true)
  const [researchEnabled, setResearchEnabled] = useState(true)
  const [announcement, setAnnouncement] = useState('')
  // Tier visibility for the marketing-page store section. Empty array =
  // visible to everyone. Non-empty array = only those tiers see the store.
  const [storeTiers, setStoreTiers] = useState<string[]>([])
  // Single-knob throttle for the scanner free-tier daily cap.
  const [freeScannerLimit, setFreeScannerLimit] = useState<number>(3)
  // Per-type booking prices, in cents. Customer-side checkout reads
  // these via the Stripe route. introCall=0 means free.
  const [bookingPrices, setBookingPrices] = useState<{
    introCall: number
    followUp: number
    deepDive: number
  }>({ introCall: 0, followUp: 2500, deepDive: 5000 })
  // Percentage off store orders for paying tiers (0 = disabled).
  const [memberDiscount, setMemberDiscount] = useState<number>(0)
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
        .in('key', [
          'store_enabled',
          'maintenance_mode',
          'ai_chat_enabled',
          'booking_enabled',
          'scanner_enabled',
          'community_enabled',
          'research_desk_enabled',
          'site_announcement',
          'store_enabled_tiers',
          'free_tier_scanner_limit',
          'booking_price_cents',
          'member_discount_percent',
        ])
      if (!cancelled) {
        for (const s of (settingsRows as SettingRow[] | null) ?? []) {
          const truthy = s.value === true || s.value === 'true'
          // Default-true toggles read as enabled when row absent or null.
          // Only an explicit `false`/`'false'` string disables the feature.
          const explicitFalse = s.value === false || s.value === 'false'
          if (s.key === 'store_enabled')        setLive(truthy)
          if (s.key === 'maintenance_mode')     setMaintenance(truthy)
          if (s.key === 'ai_chat_enabled')      setAiChatEnabled(!explicitFalse)
          if (s.key === 'booking_enabled')      setBookingEnabled(!explicitFalse)
          if (s.key === 'scanner_enabled')      setScannerEnabled(!explicitFalse)
          if (s.key === 'community_enabled')    setCommunityEnabled(!explicitFalse)
          if (s.key === 'research_desk_enabled') setResearchEnabled(!explicitFalse)
          if (s.key === 'site_announcement')
            setAnnouncement(typeof s.value === 'string' ? s.value : '')
          if (s.key === 'store_enabled_tiers' && Array.isArray(s.value)) {
            setStoreTiers((s.value as string[]).filter((x) => typeof x === 'string'))
          }
          if (s.key === 'free_tier_scanner_limit') {
            const n = typeof s.value === 'number' ? s.value : Number(s.value)
            if (Number.isFinite(n) && n >= 0) setFreeScannerLimit(n)
          }
          if (s.key === 'booking_price_cents' && s.value && typeof s.value === 'object') {
            const v = s.value as Record<string, unknown>
            setBookingPrices((prev) => ({
              introCall: Number(v.introCall ?? prev.introCall) || 0,
              followUp:  Number(v.followUp  ?? prev.followUp ) || 0,
              deepDive:  Number(v.deepDive  ?? prev.deepDive ) || 0,
            }))
          }
          if (s.key === 'member_discount_percent') {
            const n = typeof s.value === 'number' ? s.value : Number(s.value)
            if (Number.isFinite(n) && n >= 0 && n <= 100) setMemberDiscount(n)
          }
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

  // Persist each toggle to platform_settings on user change. Each
  // setting has its own settled ref so we don't echo the hydrated DB
  // value back as a write.
  usePersistSetting('ai_chat_enabled',       aiChatEnabled)
  usePersistSetting('booking_enabled',       bookingEnabled)
  usePersistSetting('scanner_enabled',       scannerEnabled)
  usePersistSetting('community_enabled',     communityEnabled)
  usePersistSetting('research_desk_enabled', researchEnabled)
  usePersistSetting('store_enabled_tiers',   storeTiers)
  usePersistSetting('free_tier_scanner_limit', freeScannerLimit)
  usePersistSetting('booking_price_cents',   bookingPrices)
  usePersistSetting('member_discount_percent', memberDiscount)

  // Announcement is a free-text field — debounce the write so we don't
  // POST on every keystroke. 600ms after the user stops typing is enough.
  const announcementSettled = useRef(false)
  useEffect(() => {
    if (!announcementSettled.current) {
      announcementSettled.current = true
      return
    }
    const id = window.setTimeout(() => {
      void fetch('/api/settings/site_announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: announcement }),
      })
    }, 600)
    return () => window.clearTimeout(id)
  }, [announcement])

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

      {/* Master toggle — the Switch is the interactive control. Clicking
       * it opens the confirm dialog (taking the store offline is too
       * destructive to do on a single click without verification). */}
      <article
        className={`rounded-xl border p-5 md:p-6 ${
          live
            ? 'border-primary/30 bg-gradient-to-b from-primary/10 to-transparent'
            : 'border-rose-500/30 bg-rose-500/5'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
              {tS('masterToggle')}
            </p>
            <h2
              className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight"
              style={{ color: live ? '#a3e635' : '#f43f5e' }}
            >
              {live ? tS('masterLive') : tS('masterOffline')}
            </h2>
            <p className="mt-1.5 text-sm text-fg-2 max-w-md leading-relaxed">
              {live ? tS('masterDescLive') : tS('masterDescOffline')}
            </p>
          </div>
          <Switch
            on={live}
            onChange={requestToggle}
            ariaLabel={tS('masterToggle')}
          />
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

      {/* Platform controls — site-wide feature switches. Each toggle
       * writes to platform_settings via /api/settings/<key>; the matching
       * consumer (FigyChat, dashboard pages, banner) hides its surface
       * within milliseconds via Supabase realtime. Default-true: a
       * missing or null row reads as enabled. */}
      <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <header>
          <h2 className="text-base font-semibold text-fg-1">Platform controls</h2>
          <p className="text-xs text-fg-3 mt-0.5">
            Disable a feature site-wide. Changes propagate live to every
            open browser tab.
          </p>
        </header>

        <div className="space-y-3 divide-y divide-border">
          <PlatformToggle
            label="AI chat (Figy)"
            body="The floating AI nutrition assistant on every dashboard."
            on={aiChatEnabled}
            onChange={setAiChatEnabled}
          />
          <PlatformToggle
            label="Bookings"
            body="Customers can book consultations from their dashboard."
            on={bookingEnabled}
            onChange={setBookingEnabled}
          />
          <PlatformToggle
            label="Food scanner"
            body="Camera-based food scanner page in the customer dashboard."
            on={scannerEnabled}
            onChange={setScannerEnabled}
          />
          <PlatformToggle
            label="Community feed"
            body="Customer-side social feed and post composer."
            on={communityEnabled}
            onChange={setCommunityEnabled}
          />
          <PlatformToggle
            label="Research desk"
            body="Nutritionist research page and document library."
            on={researchEnabled}
            onChange={setResearchEnabled}
          />
        </div>

        <div className="pt-3 border-t border-border">
          <label className="block">
            <span className="text-sm font-medium text-fg-1">
              Site announcement
            </span>
            <span className="block text-xs text-fg-3 mt-0.5 mb-2">
              Shows a lime banner site-wide. Leave empty to hide. Saves
              automatically.
            </span>
            <input
              type="text"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g. Free shipping on orders over $50 this week"
              className="w-full h-10 rounded-lg text-sm text-fg-1 placeholder-fg-3 focus:outline-none px-3"
              style={{
                background: 'var(--gf-input-bg)',
                border: '1px solid var(--gf-border)',
              }}
            />
          </label>
        </div>

        {/* Store visibility per tier */}
        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium text-fg-1">
            Store visible to tiers
          </p>
          <p className="text-xs text-fg-3 mt-0.5 mb-2">
            Pick which signed-in tiers see the store on the marketing
            page. Leave all unchecked to show it to everyone.
          </p>
          <div className="flex flex-wrap gap-2">
            {(['free', 'basic', 'premium', 'vip'] as const).map((t) => {
              const on = storeTiers.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setStoreTiers((curr) =>
                      curr.includes(t)
                        ? curr.filter((x) => x !== t)
                        : [...curr, t],
                    )
                  }
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-pill text-xs font-semibold uppercase tracking-eyebrow transition-colors"
                  style={{
                    background: on ? 'rgba(132,217,61,0.18)' : 'var(--gf-input-bg)',
                    color: on ? '#a3e635' : 'var(--gf-fg-3)',
                    border: `1px solid ${on ? 'rgba(132,217,61,0.35)' : 'var(--gf-border)'}`,
                  }}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scanner free-tier daily cap */}
        <div className="pt-3 border-t border-border">
          <label className="block">
            <span className="text-sm font-medium text-fg-1">
              Free-tier scanner daily limit
            </span>
            <span className="block text-xs text-fg-3 mt-0.5 mb-2">
              Number of food scans a free user can run per day. Set to 0
              to disable scanning for free users entirely.
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={freeScannerLimit}
              onChange={(e) => {
                const n = Number(e.target.value)
                if (Number.isFinite(n) && n >= 0) setFreeScannerLimit(n)
              }}
              className="w-32 h-10 rounded-lg text-sm text-fg-1 focus:outline-none px-3"
              style={{
                background: 'var(--gf-input-bg)',
                border: '1px solid var(--gf-border)',
              }}
            />
          </label>
        </div>

        {/* Booking prices */}
        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium text-fg-1">Booking prices (USD)</p>
          <p className="text-xs text-fg-3 mt-0.5 mb-2">
            Per-session price for paying tiers. VIP always books free.
            Set to 0 to make a session type free for everyone.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                ['introCall', 'Intro call'],
                ['followUp', 'Follow-up'],
                ['deepDive', 'Deep dive'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="block text-xs text-fg-3 mb-1">{label}</span>
                <div className="relative">
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-fg-3 text-sm"
                    style={{ insetInlineStart: '12px' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={(bookingPrices[key] / 100).toFixed(2)}
                    onChange={(e) => {
                      const dollars = Number(e.target.value)
                      if (Number.isFinite(dollars) && dollars >= 0) {
                        setBookingPrices((prev) => ({
                          ...prev,
                          [key]: Math.round(dollars * 100),
                        }))
                      }
                    }}
                    className="w-full h-10 rounded-lg text-sm text-fg-1 focus:outline-none"
                    style={{
                      background: 'var(--gf-input-bg)',
                      border: '1px solid var(--gf-border)',
                      paddingInlineStart: '24px',
                      paddingInlineEnd: '12px',
                    }}
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Member discount */}
        <div className="pt-3 border-t border-border">
          <label className="block">
            <span className="text-sm font-medium text-fg-1">
              Member discount on store orders
            </span>
            <span className="block text-xs text-fg-3 mt-0.5 mb-2">
              Percentage off store orders for paying tiers (basic /
              premium / vip). Set to 0 to disable.
            </span>
            <div className="relative w-32">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={memberDiscount}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (Number.isFinite(n) && n >= 0 && n <= 100) setMemberDiscount(n)
                }}
                className="w-full h-10 rounded-lg text-sm text-fg-1 focus:outline-none"
                style={{
                  background: 'var(--gf-input-bg)',
                  border: '1px solid var(--gf-border)',
                  paddingInlineStart: '12px',
                  paddingInlineEnd: '32px',
                }}
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 text-fg-3 text-sm"
                style={{ insetInlineEnd: '12px' }}
              >
                %
              </span>
            </div>
          </label>
        </div>
      </section>

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
                    <ShoppingBag
                      className="w-5 h-5 shrink-0"
                      strokeWidth={1.75}
                      color={tone.text}
                    />
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
                        height: 18,
                        padding: '0 8px',
                        borderRadius: 999,
                        background: tone.tile,
                        color: tone.text,
                        fontSize: 9.5,
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
              href="/admin/store/curation"
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
                      width: 22,
                      height: 22,
                      borderRadius: 999,
                      background: 'rgba(163,230,53,0.12)',
                      color: '#a3e635',
                      fontSize: 11,
                      letterSpacing: '0.02em',
                    }}
                    dir="ltr"
                  >
                    {i + 1}
                  </span>
                  <ShoppingBag
                    className="w-5 h-5 shrink-0"
                    strokeWidth={1.75}
                    color="var(--gf-fg-3)"
                  />
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
                    style={{ gap: 2 }}
                  >
                    <button
                      type="button"
                      onClick={() => move(id, -1)}
                      aria-label={tS('moveUp')}
                      disabled={i === 0}
                      className="inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{
                        width: 28,
                        height: 28,
                        background: 'transparent',
                        color: 'var(--gf-fg-3)',
                      }}
                      onMouseEnter={(e) => {
                        if (i !== 0) {
                          e.currentTarget.style.background = 'var(--gf-input-bg)'
                          e.currentTarget.style.color = 'var(--gf-fg-1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--gf-fg-3)'
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
                        width: 28,
                        height: 28,
                        background: 'transparent',
                        color: 'var(--gf-fg-3)',
                      }}
                      onMouseEnter={(e) => {
                        if (i !== featured.length - 1) {
                          e.currentTarget.style.background = 'var(--gf-input-bg)'
                          e.currentTarget.style.color = 'var(--gf-fg-1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--gf-fg-3)'
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

function PlatformToggle({
  label,
  body,
  on,
  onChange,
}: {
  label: string
  body: string
  on: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 pt-3 first:pt-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fg-1">{label}</p>
        <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">{body}</p>
      </div>
      <Switch on={on} onChange={() => onChange(!on)} />
    </div>
  )
}
