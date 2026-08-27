'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { SendDiscountSection } from '@/components/nutritionist/SendDiscountSection'
import { Switch } from '@/components/Switch'
import {
  Plus,
  Search,
  Sparkles,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  ArrowLeft,
  Save,
  Camera,
  ShoppingBag,
  Pill,
  Apple,
  ChefHat,
  BookOpen,
  Flame,
} from '@/icons'
import type { LucideIcon } from 'lucide-react'

type Category = 'supplements' | 'superfoods' | 'snacks' | 'kitchen' | 'books'

// Per-category icon map. Each row's tile picks a category-appropriate
// icon instead of every product looking like a generic shopping bag.
// Brand colours come from @/icons but get overridden by the status
// tint when the product is low/out of stock.
const CATEGORY_ICON: Record<Category, LucideIcon> = {
  supplements: Pill,
  superfoods:  Flame,
  snacks:      Apple,
  kitchen:     ChefHat,
  books:       BookOpen,
}
// Per-category brand colour (used when stock is in good shape so the
// row doesn't lose category cue). Status colours win when low/out.
const CATEGORY_TINT: Record<Category, string> = {
  supplements: '#a78bfa', // purple
  superfoods:  '#a3e635', // lime
  snacks:      '#fb923c', // orange
  kitchen:     '#a3e635', // lime
  books:       '#60a5fa', // blue
}

interface Product {
  id: string
  name: string
  category: Category
  price: number
  stock: number
  description: string
  drNote: string
  drPick: boolean
  visible: boolean
  hue: string
}

const CATEGORIES: Category[] = ['supplements', 'superfoods', 'snacks', 'kitchen', 'books']

export default function StoreCurationPage() {
  const t = useTranslations('nutritionist.storeCurationPage')
  const tNut = useTranslations('nutritionist')

  // Empty until the products query below resolves. Was a 7-row SEED
  // (greens, magnesium, olive oil, the "Eat Real" book…) that made
  // the curation page look stocked even on a fresh install.
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden' | 'pick'>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)

  // Hydrate full product catalog (visible + hidden) so curation can flip
  // visibility on draft rows.
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      type Row = {
        id: string; name: string; category: string
        price_cents: number; stock_quantity: number
        description: string | null; nutritionist_note: string | null
        is_nutritionist_pick: boolean | null; is_active: boolean
      }
      const { data } = await supabase
        .from('products')
        .select(
          'id, name, category, price_cents, stock_quantity, description, nutritionist_note, is_nutritionist_pick, is_active',
        )
        .order('created_at', { ascending: false })
        .limit(80)
      if (cancelled) return
      const rows = (data as Row[] | null) ?? []
      if (rows.length === 0) return
      setProducts(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          category: (
            ['supplements','superfoods','snacks','kitchen','books'].includes(r.category)
              ? r.category : 'supplements'
          ) as Product['category'],
          price: r.price_cents / 100,
          stock: r.stock_quantity,
          description: r.description ?? '',
          drNote: r.nutritionist_note ?? '',
          drPick: !!r.is_nutritionist_pick,
          visible: r.is_active,
          hue: 'rgb(132 204 22 / 0.18)',
        })),
      )
    })()
    return () => { cancelled = true }
  }, [])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (filter === 'visible' && !p.visible) return false
      if (filter === 'hidden' && p.visible) return false
      if (filter === 'pick' && !p.drPick) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [products, filter, query])

  const toggleField = <K extends 'drPick' | 'visible'>(id: string, key: K) => {
    setProducts((curr) =>
      curr.map((p) => {
        if (p.id !== id) return p
        return { ...p, [key]: !p[key] }
      }),
    )
    if (!/^[0-9a-f-]{32,}$/i.test(id)) return
    // Server inverts the existing flag value. Was a fire-and-forget
    // browser update — failed toggles silently rolled back.
    void fetch('/api/nutritionist/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        toggle: key === 'drPick' ? 'pick' : 'visible',
      }),
    }).then((res) => {
      if (!res.ok) console.error('[store] toggle failed:', res.status)
    }).catch((err) => {
      console.error('[store] toggle threw:', err)
    })
  }

  const startNew = () =>
    setEditing({
      id: `new-${Date.now()}`,
      name: '',
      category: 'supplements',
      price: 0,
      stock: 0,
      description: '',
      drNote: '',
      drPick: false,
      visible: true,
      hue: 'rgb(132 204 22 / 0.18)',
    })

  const saveProduct = (p: Product) => {
    setProducts((curr) => {
      const idx = curr.findIndex((x) => x.id === p.id)
      if (idx >= 0) {
        const next = [...curr]
        next[idx] = p
        return next
      }
      return [p, ...curr]
    })
    setEditing(null)

    const isExisting = /^[0-9a-f-]{32,}$/i.test(p.id)
    const payload = {
      id: isExisting ? p.id : undefined,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      description: p.description || null,
      drNote: p.drNote || null,
      drPick: p.drPick,
      visible: p.visible,
    }
    void (async () => {
      const res = await fetch('/api/nutritionist/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('[store] save failed:', res.status)
        return
      }
      if (!isExisting) {
        const body = (await res.json()) as { id?: string }
        if (body.id) {
          setProducts((curr) =>
            curr.map((x) => (x.id === p.id ? { ...x, id: body.id! } : x)),
          )
        }
      }
    })()
  }

  const removeProduct = (id: string) => {
    setProducts((curr) => curr.filter((p) => p.id !== id))
    if (editing?.id === id) setEditing(null)
    if (!/^[0-9a-f-]{32,}$/i.test(id)) return
    void fetch('/api/nutritionist/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then((res) => {
      if (!res.ok) console.error('[store] delete failed:', res.status)
    }).catch((err) => {
      console.error('[store] delete threw:', err)
    })
  }

  if (editing) {
    return (
      <ProductForm
        t={t}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={saveProduct}
        onDelete={() => removeProduct(editing.id)}
      />
    )
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {tNut('storeCuration')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
          <p className="mt-2 text-xs text-fg-3 inline-flex items-center gap-1.5">
            <ShoppingBag className="w-3 h-3" strokeWidth={2} />
            {t('totalProducts', { count: products.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {t('newProduct')}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {/* Search input — full width on phones, flexes alongside the
         * filter strip on tablet+. min-w-0 lets it actually shrink
         * without forcing a horizontal scroll on narrow viewports. */}
        <div className="relative flex-1 min-w-0 basis-full sm:basis-auto sm:min-w-[200px]">
          <Search
            className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            strokeWidth={1.75}
            style={{ color: 'var(--gf-fg-3)' }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
          />
        </div>

        {/* Filter segmented control — wraps across two rows on tiny
         * phones if needed, single row otherwise. */}
        <div
          className="inline-flex items-center flex-wrap"
          style={{
            minHeight: 40,
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {(['all', 'visible', 'hidden', 'pick'] as const).map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="inline-flex items-center justify-center px-3 text-[12px] font-semibold transition-colors"
                style={{
                  height: 32,
                  borderRadius: 6,
                  background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
                  color: active ? '#a3e635' : 'var(--gf-fg-2)',
                  letterSpacing: '-0.005em',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--gf-card-hover)'
                    e.currentTarget.style.color = 'var(--gf-fg-1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--gf-fg-2)'
                  }
                }}
              >
                {f === 'all'
                  ? t('filterAll')
                  : f === 'visible'
                    ? t('filterVisible')
                    : f === 'hidden'
                      ? t('filterHidden')
                      : t('filterPick')}
              </button>
            )
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <ShoppingBag
            className="w-9 h-9 mx-auto mb-3 text-fg-3"
            strokeWidth={1.5}
          />
          <p className="text-base font-semibold text-fg-1">{t('noProducts')}</p>
          <p className="mt-1 text-sm text-fg-2 max-w-sm mx-auto">
            {t('noProductsBody')}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {/* Desktop header — column widths tuned to match the row's
           * grid-cols template so the labels line up with the values
           * underneath. Uses the standard dashboard eyebrow style. */}
          {/* Header — collapsed CATEGORY into the PRODUCT cell so the
           * product name + description have proper room. The 1fr
           * category column was getting crushed under the fixed-pixel
           * columns at typical viewport widths. */}
          <div
            className="hidden md:grid grid-cols-[1fr_84px_92px_56px_56px_auto] gap-3 px-5 py-3 text-[10px] uppercase font-semibold"
            style={{
              background: 'var(--gf-bg-deeper)',
              borderBottom: '1px solid var(--gf-border)',
              color: 'var(--gf-fg-3)',
              letterSpacing: '0.1em',
            }}
          >
            <div>{t('row.name')}</div>
            <div className="text-end">{t('row.price')}</div>
            <div className="text-end">{t('row.stock')}</div>
            <div className="text-center">{t('row.drPick')}</div>
            <div className="text-center">{t('row.visible')}</div>
            <div className="sr-only">{t('row.actions')}</div>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--gf-border)' }}>
            {visible.map((p) => (
              <ProductRow
                key={p.id}
                t={t}
                product={p}
                onEdit={() => setEditing(p)}
                onTogglePick={() => toggleField(p.id, 'drPick')}
                onToggleVisible={() => toggleField(p.id, 'visible')}
              />
            ))}
          </ul>
        </div>
      )}

      <SendDiscountSection />
    </div>
  )
}

/* ── Row ────────────────────────────────────────────────────────── */

function ProductRow({
  t,
  product,
  onEdit,
  onTogglePick,
  onToggleVisible,
}: {
  t: ReturnType<typeof useTranslations>
  product: Product
  onEdit: () => void
  onTogglePick: () => void
  onToggleVisible: () => void
}) {
  const out = product.stock <= 0
  const low = product.stock > 0 && product.stock <= 5
  // Just the colour — the icon now renders bare like a sidebar nav
  // item, no tile/border chrome. Status colour wins over category
  // when stock is bad, so urgency reads first.
  const catTint = CATEGORY_TINT[product.category]
  const Icon = CATEGORY_ICON[product.category]
  const iconColor = out ? '#f43f5e' : low ? '#fbbf24' : catTint

  // Stock pill (Low / Out) extracted so we can drop it in either the
  // dedicated mobile row or the desktop stock cell.
  const stockBadge = out ? (
    <span
      className="inline-flex items-center justify-center"
      style={{
        height: 18,
        padding: '0 8px',
        borderRadius: 999,
        background: 'rgba(244,63,94,0.14)',
        color: '#f43f5e',
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {t('outBadge')}
    </span>
  ) : low ? (
    <span
      className="inline-flex items-center justify-center"
      style={{
        height: 18,
        padding: '0 8px',
        borderRadius: 999,
        background: 'rgba(232,145,42,0.14)',
        color: '#fbbf24',
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      {t('lowStockBadge')}
    </span>
  ) : null

  return (
    <li
      className="md:grid md:grid-cols-[1fr_84px_92px_56px_56px_auto] gap-3 md:items-center px-4 md:px-5 py-3 transition-colors"
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--gf-card-hover)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'transparent')
      }
    >
      {/* Product — bare brand icon (sidebar-style) + name + category
       * eyebrow + description. No tile / border around the icon. */}
      <div className="flex items-center gap-3 min-w-0 mb-2 md:mb-0">
        <Icon
          className="w-5 h-5 shrink-0"
          strokeWidth={1.75}
          color={iconColor}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg-1 truncate">
            {product.name || '— Untitled —'}
          </p>
          <p className="text-xs text-fg-3 truncate mt-0.5">
            <span
              className="font-semibold uppercase me-2"
              style={{ letterSpacing: '0.08em', color: 'var(--gf-fg-2)' }}
            >
              {t(`categories.${product.category}` as 'categories.supplements')}
            </span>
            {product.description}
          </p>
        </div>
      </div>

      {/*
        Mobile-only single-line summary row. Holds price · stock+badge
        on the start, the three icon controls on the end. This replaces
        the previous "every cell on its own line" stack that left huge
        vertical gaps and felt empty. Hidden on md+ where the desktop
        grid takes over.
      */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-sm font-semibold text-fg-1" dir="ltr">
            {product.price}{' '}
            <span className="text-xs text-fg-3 font-normal">USD</span>
          </span>
          <span className="text-fg-3">·</span>
          <span className="font-mono text-sm text-fg-1" dir="ltr">
            {product.stock}
          </span>
          {stockBadge}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ToggleIconButton
            active={product.drPick}
            onClick={onTogglePick}
            ariaLabel={t('togglePick')}
            activeColor="#fbbf24"
          >
            <Sparkles
              className="w-[18px] h-[18px]"
              strokeWidth={1.75}
              color="currentColor"
              fill={product.drPick ? 'currentColor' : 'none'}
            />
          </ToggleIconButton>
          <ToggleIconButton
            active={product.visible}
            onClick={onToggleVisible}
            ariaLabel={t('toggleVisible')}
          >
            {product.visible ? (
              <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} color="currentColor" />
            ) : (
              <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.75} color="currentColor" />
            )}
          </ToggleIconButton>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit product"
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--gf-fg-3)',
            }}
          >
            <Edit3
              className="w-[18px] h-[18px]"
              strokeWidth={1.75}
              color="currentColor"
            />
          </button>
        </div>
      </div>

      {/* Desktop-only cells (each becomes its own grid column). */}
      <div className="hidden md:block md:text-end">
        <p className="font-mono text-sm font-semibold text-fg-1" dir="ltr">
          {product.price}{' '}
          <span className="text-xs text-fg-3 font-normal">USD</span>
        </p>
      </div>
      <div className="hidden md:block md:text-end">
        <p className="font-mono text-sm text-fg-1" dir="ltr">
          {product.stock}
        </p>
        {stockBadge && <div className="mt-1">{stockBadge}</div>}
      </div>
      <div className="hidden md:flex md:justify-center">
        <ToggleIconButton
          active={product.drPick}
          onClick={onTogglePick}
          ariaLabel={t('togglePick')}
          activeColor="#fbbf24"
        >
          <Sparkles
            className="w-[18px] h-[18px]"
            strokeWidth={1.75}
            color="currentColor"
            fill={product.drPick ? 'currentColor' : 'none'}
          />
        </ToggleIconButton>
      </div>
      <div className="hidden md:flex md:justify-center">
        <ToggleIconButton
          active={product.visible}
          onClick={onToggleVisible}
          ariaLabel={t('toggleVisible')}
        >
          {product.visible ? (
            <Eye className="w-[18px] h-[18px]" strokeWidth={1.75} color="currentColor" />
          ) : (
            <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.75} color="currentColor" />
          )}
        </ToggleIconButton>
      </div>
      <div className="hidden md:block md:justify-self-end">
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit product"
          className="inline-flex items-center justify-center transition-colors"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'transparent',
            border: 'none',
            color: 'var(--gf-fg-3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--gf-card-hover)'
            e.currentTarget.style.color = 'var(--gf-fg-1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--gf-fg-3)'
          }}
        >
          <Edit3
            className="w-[18px] h-[18px]"
            strokeWidth={1.75}
            color="currentColor"
          />
        </button>
      </div>
    </li>
  )
}

/**
 * Ghost icon toggle for Coach pick / Visible columns. No tile chrome —
 * just the icon. State is communicated by colour: brand-tinted when
 * active, muted when not. A subtle bg appears on hover so the click
 * affordance stays. Reads the same as Linear / Stripe row actions
 * rather than chunky button tiles. The `activeColor` lets the Dr.
 * pick toggle be amber (matching the brand Sparkles palette) while
 * Visible stays lime.
 */
function ToggleIconButton({
  active,
  onClick,
  ariaLabel,
  activeColor = '#a3e635',
  children,
}: {
  active: boolean
  onClick: () => void
  ariaLabel: string
  activeColor?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className="inline-flex items-center justify-center transition-colors"
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'transparent',
        border: 'none',
        color: active ? activeColor : 'var(--gf-fg-3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--gf-card-hover)'
        if (!active) e.currentTarget.style.color = 'var(--gf-fg-1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        if (!active) e.currentTarget.style.color = 'var(--gf-fg-3)'
      }}
    >
      {children}
    </button>
  )
}

/* ── Form ───────────────────────────────────────────────────────── */

function ProductForm({
  t,
  initial,
  onCancel,
  onSave,
  onDelete,
}: {
  t: ReturnType<typeof useTranslations>
  initial: Product
  onCancel: () => void
  onSave: (p: Product) => void
  onDelete: () => void
}) {
  const [p, setP] = useState<Product>(initial)
  const update = <K extends keyof Product>(k: K, v: Product[K]) =>
    setP((curr) => ({ ...curr, [k]: v }))

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg-1"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
          {t('form.back')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-2 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('form.delete')}
          </button>
          <button
            type="button"
            onClick={() => onSave(p)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={2} />
            {t('form.save')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <article className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <Field label={t('form.name')}>
              <input
                type="text"
                value={p.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder={t('form.namePh')}
                className="w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-base font-semibold text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t('form.category')}>
                <select
                  value={p.category}
                  onChange={(e) => update('category', e.target.value as Category)}
                  className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-surface">
                      {t(`categories.${c}` as 'categories.supplements')}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('form.price')}>
                <NumInput
                  value={p.price}
                  onChange={(n) => update('price', n)}
                  suffix="USD"
                />
              </Field>
              <Field label={t('form.stock')}>
                <NumInput
                  value={p.stock}
                  onChange={(n) => update('stock', n)}
                />
              </Field>
            </div>
            <Field label={t('form.description')}>
              <textarea
                value={p.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder={t('form.descriptionPh')}
                rows={3}
                className="w-full resize-none rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
              />
            </Field>
            <Field label={t('form.drNote')}>
              <textarea
                value={p.drNote}
                onChange={(e) => update('drNote', e.target.value)}
                placeholder={t('form.drNotePh')}
                rows={2}
                className="w-full resize-none rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
              />
            </Field>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
              {t('form.image')}
            </p>
            <div
              className="rounded-lg border-2 border-dashed border-border aspect-square flex flex-col items-center justify-center gap-3 text-center px-4"
              style={{ background: p.hue }}
            >
              <Camera className="w-8 h-8 text-fg-1/40" strokeWidth={1.25} />
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-pill bg-bg/85 backdrop-blur-sm border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                {t('form.uploadImage')}
              </button>
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <article className="rounded-xl border border-border bg-surface p-5 flex items-start gap-4">
            <Sparkles
              className="w-6 h-6 text-yellow-500 flex-shrink-0"
              strokeWidth={1.75}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg-1">{t('form.drPick')}</p>
            </div>
            <Switch on={p.drPick} onChange={(v) => update('drPick', v)} />
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 flex items-start gap-4">
            <Eye
              className="w-6 h-6 text-blue-500 flex-shrink-0"
              strokeWidth={1.75}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg-1">{t('form.visible')}</p>
            </div>
            <Switch on={p.visible} onChange={(v) => update('visible', v)} />
          </article>
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function NumInput({
  value,
  onChange,
  suffix,
}: {
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={`w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary ${
          suffix ? 'pe-12' : ''
        }`}
        dir="ltr"
      />
      {suffix && (
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono" aria-hidden>
          {suffix}
        </span>
      )}
    </div>
  )
}

