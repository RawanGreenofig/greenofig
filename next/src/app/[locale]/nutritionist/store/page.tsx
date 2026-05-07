'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { SendDiscountSection } from '@/components/nutritionist/SendDiscountSection'
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
} from 'lucide-react'

type Category = 'supplements' | 'superfoods' | 'snacks' | 'kitchen' | 'books'

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

const SEED: Product[] = [
  { id: 'p1',  name: 'Daily Greens Powder',         category: 'superfoods',  price: 28, stock: 14, description: 'Grass-based blend with chlorella and spirulina.', drNote: 'My morning baseline — one scoop in cold water before coffee.', drPick: true,  visible: true,  hue: 'rgb(163 230 53 / 0.18)' },
  { id: 'p2',  name: 'Magnesium Glycinate 200 mg',  category: 'supplements', price: 19, stock: 22, description: 'Glycinate for absorption and sleep onset.',          drNote: '', drPick: true,  visible: true,  hue: 'rgb(168 85 247 / 0.18)' },
  { id: 'p3',  name: 'Vitamin D3 + K2',             category: 'supplements', price: 24, stock: 4,  description: 'D3 with K2 for proper calcium routing.',             drNote: '', drPick: false, visible: true,  hue: 'rgb(232 145 42 / 0.18)' },
  { id: 'p4',  name: 'Mediterranean Olive Oil',     category: 'kitchen',     price: 22, stock: 30, description: 'Cold-pressed extra virgin from Ajloun.',             drNote: 'Use raw — drizzle on plates after cooking.', drPick: true, visible: true, hue: 'rgb(132 204 22 / 0.18)' },
  { id: 'p5',  name: 'Almond Butter, raw',          category: 'snacks',      price: 14, stock: 24, description: 'No oils added, no sugar, just almonds.',             drNote: '', drPick: false, visible: true,  hue: 'rgb(232 145 42 / 0.16)' },
  { id: 'p6',  name: 'Probiotic 25 Billion',        category: 'supplements', price: 38, stock: 0,  description: 'Multi-strain shelf-stable probiotic.',               drNote: '', drPick: true,  visible: false, hue: 'rgb(34 197 94 / 0.18)' },
  { id: 'p7',  name: 'Eat Real — Dr. Rawan',        category: 'books',       price: 18, stock: 12, description: 'Hardback first edition. Signed copies available.',   drNote: 'My take on Mediterranean eating, written for Arab kitchens.', drPick: true, visible: true,  hue: 'rgb(61 122 74 / 0.22)' },
]

export default function StoreCurationPage() {
  const t = useTranslations('nutritionist.storeCurationPage')
  const tNut = useTranslations('nutritionist')

  const [products, setProducts] = useState<Product[]>(SEED)
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
        price_jod: number; stock: number
        description: string | null; dr_note: string | null
        dr_pick: boolean | null; visible: boolean
        hue: string | null
      }
      const { data } = await supabase
        .from('products')
        .select('id, name, category, price_jod, stock, description, dr_note, dr_pick, visible, hue')
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
          price: r.price_jod,
          stock: r.stock,
          description: r.description ?? '',
          drNote: r.dr_note ?? '',
          drPick: !!r.dr_pick,
          visible: r.visible,
          hue: r.hue ?? 'rgb(132 204 22 / 0.18)',
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
    let nextValue = false
    setProducts((curr) =>
      curr.map((p) => {
        if (p.id !== id) return p
        nextValue = !p[key]
        return { ...p, [key]: nextValue }
      }),
    )
    const supabase = getBrowserSupabase()
    if (supabase && /^[0-9a-f-]{32,}$/i.test(id)) {
      const dbCol = key === 'drPick' ? 'dr_pick' : 'visible'
      void supabase
        .from('products')
        .update({ [dbCol]: nextValue } as never)
        .eq('id', id)
    }
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

    const supabase = getBrowserSupabase()
    if (!supabase) return
    const isExisting = /^[0-9a-f-]{32,}$/i.test(p.id)
    const row = {
      name: p.name,
      category: p.category,
      price_jod: p.price,
      stock: p.stock,
      description: p.description || null,
      dr_note: p.drNote || null,
      dr_pick: p.drPick,
      visible: p.visible,
      hue: p.hue,
    }
    if (isExisting) {
      void supabase.from('products').update(row as never).eq('id', p.id)
    } else {
      void (async () => {
        const { data } = await supabase
          .from('products')
          .insert(row as never)
          .select('id')
          .maybeSingle()
        const realId = (data as { id?: string } | null)?.id
        if (realId) {
          setProducts((curr) =>
            curr.map((x) => (x.id === p.id ? { ...x, id: realId } : x)),
          )
        }
      })()
    }
  }

  const removeProduct = (id: string) => {
    setProducts((curr) => curr.filter((p) => p.id !== id))
    if (editing?.id === id) setEditing(null)
    const supabase = getBrowserSupabase()
    if (supabase && /^[0-9a-f-]{32,}$/i.test(id)) {
      void supabase.from('products').delete().eq('id', id)
    }
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
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5">
          {(['all', 'visible', 'hidden', 'pick'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-pill text-[11px] font-semibold transition-colors ${
                filter === f
                  ? 'bg-primary/20 text-lime-400'
                  : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              {f === 'all'
                ? t('filterAll')
                : f === 'visible'
                  ? t('filterVisible')
                  : f === 'hidden'
                    ? t('filterHidden')
                    : t('filterPick')}
            </button>
          ))}
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
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_100px_100px_70px_70px_auto] gap-3 px-5 py-3 bg-bg-deeper/40 border-b border-border text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
            <div>{t('row.name')}</div>
            <div>{t('row.category')}</div>
            <div className="text-end">{t('row.price')}</div>
            <div className="text-end">{t('row.stock')}</div>
            <div className="text-center">{t('row.drPick')}</div>
            <div className="text-center">{t('row.visible')}</div>
            <div className="sr-only">{t('row.actions')}</div>
          </div>
          <ul className="divide-y divide-border">
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
  return (
    <li className="md:grid md:grid-cols-[2fr_1fr_100px_100px_70px_70px_auto] gap-3 items-center px-5 py-3 hover:bg-surface-raised transition-colors">
      {/* Product */}
      <div className="flex items-center gap-3 min-w-0 mb-3 md:mb-0">
        <span
          className="shrink-0 w-10 h-10 rounded-md flex items-center justify-center"
          style={{ background: product.hue }}
        >
          <ShoppingBag className="w-4 h-4 text-fg-1/50" strokeWidth={1.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg-1 truncate">
            {product.name || '— Untitled —'}
          </p>
          <p className="text-xs text-fg-3 truncate">
            {product.description}
          </p>
        </div>
      </div>

      {/* Category */}
      <p className="text-xs text-fg-2 mb-1.5 md:mb-0">
        {t(`categories.${product.category}` as 'categories.supplements')}
      </p>

      {/* Price */}
      <div className="md:text-end mb-1.5 md:mb-0">
        <p className="font-mono text-sm font-semibold text-fg-1" dir="ltr">
          {product.price} <span className="text-xs text-fg-3 font-normal">JOD</span>
        </p>
      </div>

      {/* Stock */}
      <div className="md:text-end mb-1.5 md:mb-0">
        <p className="font-mono text-sm text-fg-1" dir="ltr">
          {product.stock}
        </p>
        {low && !out && (
          <span className="rounded-pill h-4 px-1.5 inline-flex items-center text-[9px] uppercase tracking-eyebrow font-bold mt-0.5"
            style={{ background: 'rgb(232 145 42 / 0.16)', color: '#e8912a' }}>
            {t('lowStockBadge')}
          </span>
        )}
        {out && (
          <span className="rounded-pill h-4 px-1.5 inline-flex items-center text-[9px] uppercase tracking-eyebrow font-bold mt-0.5"
            style={{ background: 'rgb(244 63 94 / 0.14)', color: '#f43f5e' }}>
            {t('outBadge')}
          </span>
        )}
      </div>

      {/* Dr. pick */}
      <div className="flex md:justify-center mb-1.5 md:mb-0">
        <button
          type="button"
          onClick={onTogglePick}
          aria-label={t('togglePick')}
          className={`w-9 h-9 rounded-md inline-flex items-center justify-center transition-colors ${
            product.drPick
              ? 'bg-primary/15 text-lime-400'
              : 'bg-surface-raised text-fg-3 hover:text-fg-1'
          }`}
        >
          <Sparkles
            className="w-4 h-4"
            strokeWidth={2}
            fill={product.drPick ? 'currentColor' : 'none'}
          />
        </button>
      </div>

      {/* Visible */}
      <div className="flex md:justify-center mb-3 md:mb-0">
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={t('toggleVisible')}
          className={`w-9 h-9 rounded-md inline-flex items-center justify-center transition-colors ${
            product.visible
              ? 'bg-primary/15 text-lime-400'
              : 'bg-surface-raised text-fg-3 hover:text-fg-1'
          }`}
        >
          {product.visible ? (
            <Eye className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <EyeOff className="w-4 h-4" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Edit */}
      <div className="md:justify-self-end">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <Edit3 className="w-3 h-3" strokeWidth={1.75} />
          edit
        </button>
      </div>
    </li>
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
                  suffix="JOD"
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
        on ? 'bg-lime-400' : 'bg-bg-deeper border border-border'
      }`}
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
