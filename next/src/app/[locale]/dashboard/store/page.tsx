'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Plus,
  Minus,
  X,
  Tag,
  Lock,
  Check,
  ArrowRight,
} from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { useFeature } from '@/lib/hooks/useFeature'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { Link } from '@/i18n/navigation'
import { PRODUCTS as SHARED_PRODUCTS } from '@/lib/products'

type Category =
  | 'all'
  | 'supplements'
  | 'superfoods'
  | 'snacks'
  | 'kitchen'
  | 'books'

type Badge = 'drPick' | 'bestseller' | 'newBadge' | 'saleBadge'

interface Product {
  id: string
  name: string
  category: Exclude<Category, 'all'>
  price: number
  compareAt?: number
  stock: number
  badges: Badge[]
  hue: string
}

const CATEGORIES: Category[] = [
  'all',
  'supplements',
  'superfoods',
  'snacks',
  'kitchen',
  'books',
]

// Source of truth lives in lib/products.ts so the per-product detail
// page reads the same catalog. The local `Product` type is structurally
// a subset of the shared one, so the cast is sound.
const PRODUCTS: Product[] = SHARED_PRODUCTS as unknown as Product[]

const TIER_DISCOUNT_PCT: Record<string, number> = {
  premium: 10,
  vip: 15,
}

interface CartLine {
  productId: string
  qty: number
}

export default function StorePage() {
  const t = useTranslations('store')
  const { tier } = useUser()
  const { isEnabled, isLoading } = useFeature('store_access')

  const [category, setCategory] = useState<Category>('all')
  const [cart, setCart] = useState<CartLine[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState<{ pct: number } | null>(null)
  const [couponError, setCouponError] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  // Live products from the products table; falls back to seed when env unset
  // or no rows are visible yet.
  const liveProducts = useSupabaseQuery<Product[]>(async (supabase) => {
    const { data } = await supabase
      .from('products')
      .select('id, name, category, price_jod, compare_at_jod, stock, dr_pick, hue, visible')
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .limit(80)
    type Row = {
      id: string; name: string; category: string
      price_jod: number; compare_at_jod: number | null; stock: number
      dr_pick: boolean | null; hue: string | null; visible: boolean
    }
    return ((data as Row[] | null) ?? []).map((r) => {
      const cat = (
        ['supplements','superfoods','snacks','kitchen','books'].includes(r.category)
          ? r.category : 'supplements'
      ) as Product['category']
      const badges: Product['badges'] = []
      if (r.dr_pick) badges.push('drPick')
      if (r.compare_at_jod && r.compare_at_jod > r.price_jod) badges.push('saleBadge')
      return {
        id: r.id,
        name: r.name,
        category: cat,
        price: r.price_jod,
        compareAt: r.compare_at_jod ?? undefined,
        stock: r.stock,
        badges,
        hue: r.hue ?? 'rgb(132 204 22 / 0.16)',
      }
    })
  }, [])

  const sourceProducts = (liveProducts.data && liveProducts.data.length > 0)
    ? liveProducts.data
    : PRODUCTS

  const visible = useMemo(
    () => sourceProducts.filter((p) => category === 'all' || p.category === category),
    [sourceProducts, category],
  )

  // Treat unknown loading state as "open" so the page renders during dev with
  // no Supabase env. The real toggle is wired in Cluster I.
  const offline = !isLoading && !isEnabled && (process.env.NODE_ENV === 'production')

  if (offline) return <OfflineCard t={t} />


  const cartItems = cart.flatMap((line) => {
    const p = sourceProducts.find((x) => x.id === line.productId)
    return p ? [{ ...line, product: p }] : []
  })
  const totalQty = cart.reduce((acc, l) => acc + l.qty, 0)
  const subtotal = cartItems.reduce(
    (acc, l) => acc + l.product.price * l.qty,
    0,
  )
  const tierPct = tier ? TIER_DISCOUNT_PCT[tier] ?? 0 : 0
  const couponPct = couponApplied?.pct ?? 0
  const totalDiscountPct = Math.min(40, tierPct + couponPct)
  const discountAmount = Math.round(subtotal * totalDiscountPct) / 100
  const total = Math.max(0, subtotal - discountAmount)

  const addToCart = (id: string) => {
    setCart((curr) => {
      const existing = curr.find((l) => l.productId === id)
      if (existing) {
        return curr.map((l) =>
          l.productId === id ? { ...l, qty: l.qty + 1 } : l,
        )
      }
      return [...curr, { productId: id, qty: 1 }]
    })
  }

  const setQty = (id: string, qty: number) => {
    setCart((curr) =>
      qty <= 0
        ? curr.filter((l) => l.productId !== id)
        : curr.map((l) => (l.productId === id ? { ...l, qty } : l)),
    )
  }

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    const code = coupon.trim().toUpperCase()
    if (code === 'WELCOME10') {
      setCouponApplied({ pct: 10 })
      setCouponError(false)
    } else if (code === 'GREEN15') {
      setCouponApplied({ pct: 15 })
      setCouponError(false)
    } else {
      setCouponApplied(null)
      setCouponError(true)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('title')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative inline-flex items-center gap-2 rounded-pill bg-surface border border-border h-10 px-5 text-sm font-semibold text-fg-1 hover:border-primary/40"
        >
          <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
          {t('viewCart')}
          {totalQty > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-lime-400 text-bg font-mono font-bold text-[11px] px-1.5" dir="ltr">
              {totalQty}
            </span>
          )}
        </button>
      </header>

      {/* Tier discount banner */}
      {tierPct > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3">
          <Sparkles
            className="w-4 h-4 text-lime-400 shrink-0"
            strokeWidth={2}
          />
          <p className="text-sm text-fg-1">
            <span className="font-semibold text-lime-400">
              {tierPct}% {t('discount')}
            </span>{' '}
            ·{' '}
            <span className="text-fg-2">
              {t('tierDiscount', { tier: tier?.toUpperCase() ?? '' })}
            </span>
          </p>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
              category === c
                ? 'bg-primary/20 text-lime-400 border border-primary/40'
                : 'bg-surface border border-border text-fg-2 hover:border-primary/40'
            }`}
          >
            {t(`categories.${c}` as 'categories.all')}
          </button>
        ))}
      </div>

      {/* Grid */}
      <ul className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((p) => (
          <ProductCard
            key={p.id}
            t={t}
            product={p}
            onAdd={() => addToCart(p.id)}
          />
        ))}
      </ul>

      {/* Cart drawer */}
      {drawerOpen && (
        <CartDrawer
          t={t}
          tier={tier ?? null}
          items={cartItems}
          subtotal={subtotal}
          tierPct={tierPct}
          couponPct={couponPct}
          totalDiscountPct={totalDiscountPct}
          discountAmount={discountAmount}
          total={total}
          coupon={coupon}
          setCoupon={setCoupon}
          couponApplied={couponApplied}
          couponError={couponError}
          applyCoupon={applyCoupon}
          setQty={setQty}
          onClose={() => setDrawerOpen(false)}
          checkingOut={checkingOut}
          onCheckout={async () => {
            if (cart.length === 0 || checkingOut) return
            setCheckingOut(true)
            try {
              const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  kind: 'order',
                  items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
                  couponCode: couponApplied ? coupon : undefined,
                }),
              })
              if (res.ok) {
                const { url } = (await res.json()) as { url: string }
                if (url) window.location.href = url
              }
            } finally {
              setCheckingOut(false)
            }
          }}
        />
      )}
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function ProductCard({
  t,
  product,
  onAdd,
}: {
  t: ReturnType<typeof useTranslations>
  product: Product
  onAdd: () => void
}) {
  const out = product.stock <= 0
  const low = product.stock > 0 && product.stock <= 5
  const onSale = !!product.compareAt && product.compareAt > product.price
  const savePct = onSale
    ? Math.round(
        ((product.compareAt! - product.price) / product.compareAt!) * 100,
      )
    : 0
  return (
    <li className="rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/40 transition-colors">
      <Link
        href={`/dashboard/store/${product.id}` as `/dashboard/store/${string}`}
        className="block cursor-pointer"
      >
      {/* Visual */}
      <div
        className="relative aspect-square w-full"
        style={{ background: product.hue }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <ShoppingBag
            className="w-10 h-10 text-fg-1/40"
            strokeWidth={1}
          />
        </div>
        {/* Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5 items-start">
          {product.badges.map((b) => (
            <Badge key={b} kind={b} t={t} savePct={savePct} />
          ))}
        </div>
        {out && (
          <span className="absolute bottom-3 start-3 rounded-pill bg-bg/85 backdrop-blur-sm text-fg-3 text-[10px] uppercase tracking-eyebrow font-semibold px-2.5 h-6 inline-flex items-center border border-border">
            {t('outOfStock')}
          </span>
        )}
        {low && !out && (
          <span className="absolute bottom-3 start-3 rounded-pill bg-amber-500/20 text-[10px] uppercase tracking-eyebrow font-semibold px-2.5 h-6 inline-flex items-center" style={{ color: '#e8912a' }}>
            {t('lowStock', { count: product.stock })}
          </span>
        )}
      </div>

      <div className="p-4">
        <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {t(`categories.${product.category}` as 'categories.supplements')}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-fg-1 leading-snug line-clamp-2 min-h-[2.5em]">
          {product.name}
        </h3>
        <div className="mt-3 flex items-baseline gap-2 font-mono" dir="ltr">
          <span className="text-base font-bold text-fg-1">
            {product.price}
          </span>
          <span className="text-xs text-fg-3">JOD</span>
          {onSale && (
            <span className="text-xs text-fg-3 line-through">
              {product.compareAt}
            </span>
          )}
        </div>
      </div>
      </Link>
      {/* Add-to-cart sits outside the wrapping Link so its onClick fires
       * cleanly without navigating away to the detail page. */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAdd()
          }}
          disabled={out}
          className={`w-full inline-flex items-center justify-center gap-1.5 rounded-pill h-9 text-xs font-semibold transition-all ${
            out
              ? 'bg-surface-raised text-fg-3 cursor-not-allowed'
              : 'bg-primary/15 text-lime-400 hover:bg-primary/25'
          }`}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {t('addToCart')}
        </button>
      </div>
    </li>
  )
}

function Badge({
  kind,
  t,
  savePct,
}: {
  kind: Badge
  t: ReturnType<typeof useTranslations>
  savePct: number
}) {
  const map: Record<Badge, { label: string; color: string; bg: string; Icon?: typeof Sparkles }> = {
    drPick:     { label: t('drPick'),                        color: '#a3e635', bg: 'rgb(13 26 18 / 0.85)',  Icon: Sparkles },
    bestseller: { label: t('bestseller'),                    color: '#e8912a', bg: 'rgb(13 26 18 / 0.85)' },
    newBadge:   { label: t('newBadge'),                      color: '#06b6d4', bg: 'rgb(13 26 18 / 0.85)' },
    saleBadge:  { label: t('save', { pct: savePct }),        color: '#f43f5e', bg: 'rgb(13 26 18 / 0.85)' },
  }
  const { label, color, bg, Icon } = map[kind]
  return (
    <span
      className="inline-flex items-center gap-1 rounded-pill backdrop-blur-sm px-2 h-6 text-[10px] uppercase tracking-eyebrow font-semibold border"
      style={{ background: bg, color, borderColor: `${color}40` }}
    >
      {Icon && <Icon className="w-2.5 h-2.5" strokeWidth={2} />}
      {label}
    </span>
  )
}

function CartDrawer({
  t,
  tier,
  items,
  subtotal,
  tierPct,
  couponPct,
  totalDiscountPct,
  discountAmount,
  total,
  coupon,
  setCoupon,
  couponApplied,
  couponError,
  applyCoupon,
  setQty,
  onClose,
  onCheckout,
  checkingOut,
}: {
  t: ReturnType<typeof useTranslations>
  tier: string | null
  items: (CartLine & { product: Product })[]
  subtotal: number
  tierPct: number
  couponPct: number
  totalDiscountPct: number
  discountAmount: number
  total: number
  coupon: string
  setCoupon: (s: string) => void
  couponApplied: { pct: number } | null
  couponError: boolean
  applyCoupon: (e: React.FormEvent) => void
  setQty: (id: string, qty: number) => void
  onClose: () => void
  onCheckout: () => void
  checkingOut: boolean
}) {
  void couponPct
  void totalDiscountPct
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('cart')}
      className="fixed inset-0 z-50 flex"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <aside className="relative ms-auto w-full max-w-md h-full bg-surface border-s border-border shadow-2xl flex flex-col">
        {/* Header */}
        <header className="shrink-0 px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" strokeWidth={1.75} />
            {t('cart')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md bg-surface-raised text-fg-2 hover:text-fg-1 inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ShoppingBag
                className="w-9 h-9 mx-auto mb-3 text-fg-3"
                strokeWidth={1.5}
              />
              <p className="text-base font-semibold text-fg-1">
                {t('emptyCart')}
              </p>
              <p className="mt-1 text-sm text-fg-2">{t('emptyCartBody')}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-10 px-5 text-sm font-semibold hover:bg-primary/25"
              >
                {t('continueShopping')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((line) => (
                <li
                  key={line.productId}
                  className="flex items-start gap-3 px-5 py-4"
                >
                  <span
                    className="shrink-0 w-14 h-14 rounded-md"
                    style={{ background: line.product.hue }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-1 leading-snug">
                      {line.product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-3 font-mono" dir="ltr">
                      {line.product.price} JOD
                    </p>
                    <div className="mt-3 inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5">
                      <button
                        type="button"
                        onClick={() => setQty(line.productId, line.qty - 1)}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center text-fg-2 hover:text-fg-1 hover:bg-surface-raised"
                        aria-label="-"
                      >
                        <Minus className="w-3 h-3" strokeWidth={2} />
                      </button>
                      <span className="font-mono text-xs font-semibold text-fg-1 w-7 text-center" dir="ltr">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(line.productId, line.qty + 1)}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center text-fg-2 hover:text-fg-1 hover:bg-surface-raised"
                        aria-label="+"
                      >
                        <Plus className="w-3 h-3" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-mono text-sm text-fg-1" dir="ltr">
                      {line.product.price * line.qty}
                    </p>
                    <button
                      type="button"
                      onClick={() => setQty(line.productId, 0)}
                      className="mt-2 text-[11px] text-fg-3 hover:text-rose-400 underline underline-offset-2"
                    >
                      {t('remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <footer className="shrink-0 border-t border-border px-5 py-4 space-y-3 bg-bg-deeper/30">
            {/* Coupon */}
            <form onSubmit={applyCoupon} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag
                  className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3"
                  strokeWidth={1.75}
                />
                <input
                  type="text"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder={t('couponCode')}
                  className="w-full h-9 rounded-md bg-surface border border-border ps-9 pe-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
              >
                {t('applyCoupon')}
              </button>
            </form>
            {couponApplied && (
              <p className="text-xs text-lime-400 inline-flex items-center gap-1">
                <Check className="w-3 h-3" strokeWidth={2.25} />
                {t('couponApplied')} · {couponApplied.pct}%
              </p>
            )}
            {couponError && (
              <p className="text-xs text-rose-400">{t('couponInvalid')}</p>
            )}

            {/* Totals */}
            <ul className="text-sm space-y-1.5 font-mono" dir="ltr">
              <li className="flex justify-between text-fg-2">
                <span className="font-sans">{t('subtotal')}</span>
                <span>{subtotal} JOD</span>
              </li>
              {discountAmount > 0 && (
                <li className="flex justify-between text-lime-400">
                  <span className="font-sans">
                    {t('discount')}
                    {tierPct > 0 && ` · ${tier?.toUpperCase()} ${tierPct}%`}
                    {couponApplied && ` · +${couponApplied.pct}%`}
                  </span>
                  <span>− {discountAmount.toFixed(2)} JOD</span>
                </li>
              )}
              <li className="flex justify-between text-fg-2">
                <span className="font-sans">{t('shipping')}</span>
                <span>{t('freeShipping')}</span>
              </li>
              <li className="pt-2 mt-1 border-t border-border flex justify-between text-fg-1 text-base font-bold">
                <span className="font-sans">{t('total')}</span>
                <span>{total.toFixed(2)} JOD</span>
              </li>
            </ul>

            <button
              type="button"
              aria-label={t('checkoutAriaLabel')}
              onClick={onCheckout}
              disabled={checkingOut}
              className="w-full inline-flex items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {checkingOut ? '…' : t('checkout')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
            </button>
          </footer>
        )}
      </aside>
    </div>
  )
}

function OfflineCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="px-4 md:px-8 py-12 max-w-screen-md mx-auto">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-8 md:p-12 text-center">
        <span
          className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-5"
          style={{ background: 'rgb(232 145 42 / 0.18)', color: '#e8912a' }}
        >
          <Lock className="w-6 h-6" strokeWidth={1.75} />
        </span>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.15 }}
        >
          {t('offlineTitle')}
        </h1>
        <p className="mt-3 text-sm md:text-base text-fg-2 max-w-md mx-auto leading-relaxed">
          {t('offlineBody')}
        </p>
      </div>
    </div>
  )
}
