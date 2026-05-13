'use client'


import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
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
} from '@/icons'
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
  image?: string
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

/** Captured at add-time so the cart drawer can render even when the
 *  live products query hasn't returned yet (or returns something
 *  different from the seed catalog). Previously cartItems did a
 *  `sourceProducts.find(id)` lookup and dropped lines whose product
 *  wasn't found, so the cart badge would show "3" but the drawer
 *  rendered empty for UUID-keyed products on first paint. */
interface CartLineSnapshot {
  name: string
  price: number
  image?: string
  hue: string
  stock: number
  category: Exclude<Category, 'all'>
}

interface CartLine {
  productId: string
  qty: number
  snapshot?: CartLineSnapshot
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function StorePage() {
  const t = useTranslations('store')
  const { tier } = useUser()
  const { isEnabled, isLoading } = useFeature('store_access')

  const [category, setCategory] = useState<Category>('all')
  // Cart persists across page navigation via localStorage. Without
  // this, navigating to a product detail and back wipes the cart
  // because the component remounts with fresh state.
  const [cart, setCart] = useState<CartLine[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem('gf_cart')
      if (!raw) return []
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.flatMap((raw): CartLine[] => {
        if (!raw || typeof raw !== 'object') return []
        const l = raw as Partial<CartLine>
        if (typeof l.productId !== 'string') return []
        if (typeof l.qty !== 'number' || l.qty <= 0) return []
        // snapshot is optional for backwards compat: legacy cart
        // entries from before this field existed won't have one and
        // will be resolved through sourceProducts at render time.
        const snap = (l.snapshot ?? null) as CartLineSnapshot | null
        const validSnap =
          snap &&
          typeof snap.name === 'string' &&
          typeof snap.price === 'number' &&
          typeof snap.hue === 'string'
            ? snap
            : undefined
        return [{
          productId: l.productId,
          qty: l.qty,
          snapshot: validSnap,
        }]
      })
    } catch {
      return []
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (cart.length === 0) window.localStorage.removeItem('gf_cart')
      else window.localStorage.setItem('gf_cart', JSON.stringify(cart))
    } catch { /* private mode — ignore */ }
  }, [cart])
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
      .select(
        'id, name, category, price_cents, compare_price_cents, stock_quantity, is_nutritionist_pick, is_active, image_url',
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(80)
    type Row = {
      id: string; name: string; category: string
      price_cents: number; compare_price_cents: number | null; stock_quantity: number
      is_nutritionist_pick: boolean | null; is_active: boolean
      image_url: string | null
    }
    return ((data as Row[] | null) ?? []).map((r) => {
      const cat = (
        ['supplements','superfoods','snacks','kitchen','books'].includes(r.category)
          ? r.category : 'supplements'
      ) as Product['category']
      const badges: Product['badges'] = []
      if (r.is_nutritionist_pick) badges.push('drPick')
      if (r.compare_price_cents && r.compare_price_cents > r.price_cents) badges.push('saleBadge')
      return {
        id: r.id,
        name: r.name,
        category: cat,
        price: r.price_cents / 100,
        compareAt: r.compare_price_cents ? r.compare_price_cents / 100 : undefined,
        stock: r.stock_quantity,
        badges,
        hue: 'rgb(132 204 22 / 0.16)',
        image: r.image_url ?? undefined,
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


  // Prefer the live product row (in case price/stock changed), but
  // fall back to the snapshot captured at add-time so a line never
  // ghosts. If neither exists (legacy entry without snapshot AND
  // product missing), filter it out — there's nothing renderable.
  const cartItems = cart.flatMap((line) => {
    const live = sourceProducts.find((x) => x.id === line.productId)
    if (live) return [{ ...line, product: live }]
    if (line.snapshot) {
      const fallback: Product = {
        id: line.productId,
        name: line.snapshot.name,
        category: line.snapshot.category,
        price: line.snapshot.price,
        stock: line.snapshot.stock,
        badges: [],
        hue: line.snapshot.hue,
        image: line.snapshot.image,
      }
      return [{ ...line, product: fallback }]
    }
    return []
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

  const addToCart = (product: Product) => {
    const snapshot: CartLineSnapshot = {
      name: product.name,
      price: product.price,
      image: product.image,
      hue: product.hue,
      stock: product.stock,
      category: product.category,
    }
    let added = false
    setCart((curr) => {
      const existing = curr.find((l) => l.productId === product.id)
      if (existing) {
        added = true
        return curr.map((l) =>
          l.productId === product.id
            // Refresh the snapshot on every add so cart lines stay
            // in sync with the latest product data the user saw.
            ? { ...l, qty: l.qty + 1, snapshot }
            : l,
        )
      }
      added = true
      return [...curr, { productId: product.id, qty: 1, snapshot }]
    })
    if (added) toast.success(t('addedToCart'))
    setDrawerOpen(true)
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
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
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
            onAdd={() => addToCart(p)}
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
              const data = (await res.json().catch(() => ({}))) as {
                url?: string
                error?: string
              }
              if (!res.ok) {
                toast.error(
                  data.error ?? 'Checkout failed. Please try again.',
                )
                return
              }
              if (!data.url) {
                toast.error('Checkout did not return a URL. Try again.')
                return
              }
              window.location.href = data.url
            } catch (err) {
              console.error('[store] checkout failed:', err)
              toast.error('Network error during checkout. Please retry.')
            } finally {
              setCheckingOut(false)
            }
          }}
        />
      )}
    </motion.div>
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
  const href =
    `/dashboard/store/${product.id}` as `/dashboard/store/${string}`

  return (
    <li
      className="group rounded-2xl border border-border overflow-hidden transition-all hover:-translate-y-0.5 hover:border-lime-400/30"
      style={{
        background:
          'linear-gradient(180deg, var(--gf-surface) 0%, var(--gf-bg) 100%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.22)',
      }}
    >
      {/* IMAGE — the only clickable-to-detail surface. Putting the
       *  Link wrap around the entire card (incl. the button) caused
       *  taps near the CTA edge to bubble to the Link in mobile
       *  WebViews and navigate away before onAdd fired — that's
       *  exactly why "Add to cart doesn't work" on phones. */}
      <Link
        href={href}
        className="block relative aspect-square w-full overflow-hidden"
        style={{ background: product.hue }}
        data-product-hue
      >
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-fg-1/40" strokeWidth={1} />
          </div>
        )}
        {/* Stacked badges, top-start */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5 items-start max-w-[calc(100%-1.5rem)]">
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
          <span
            className="absolute bottom-3 start-3 rounded-pill bg-amber-500/20 text-[10px] uppercase tracking-eyebrow font-semibold px-2.5 h-6 inline-flex items-center"
            style={{ color: '#e8912a' }}
          >
            {t('lowStock', { count: product.stock })}
          </span>
        )}
      </Link>

      {/* INFO + CTA — outside the Link so taps on the button land
       *  on the button, full stop. */}
      <div className="p-4 md:p-5 flex flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-eyebrow text-lime-400 font-semibold">
            {t(`categories.${product.category}` as 'categories.supplements')}
          </p>
          <Link
            href={href}
            className="block mt-1 text-sm md:text-base font-semibold text-fg-1 leading-snug line-clamp-2 min-h-[2.6em] hover:text-lime-400 transition-colors"
          >
            {product.name}
          </Link>
        </div>

        <div className="flex items-baseline gap-2 font-mono" dir="ltr">
          <span className="text-lg font-bold text-fg-1">
            ${product.price.toFixed(2)}
          </span>
          {onSale && (
            <span className="text-xs text-fg-3 line-through">
              ${product.compareAt!.toFixed(2)}
            </span>
          )}
        </div>

        <button
          type="button"
          // stopPropagation is defensive — the button is already a
          // sibling of the Link, not a descendant, so nothing should
          // capture this click. But on Capacitor WebView we'd rather
          // be paranoid than have the user end up on the detail page.
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAdd()
          }}
          disabled={out}
          className={`relative z-10 w-full inline-flex items-center justify-center gap-1.5 rounded-pill h-11 text-sm font-semibold transition-all ${
            out
              ? 'bg-surface-raised text-fg-3 cursor-not-allowed'
              : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg border border-lime-600/60 active:brightness-90 active:translate-y-px'
          }`}
          style={
            out
              ? undefined
              : { boxShadow: '0 8px 22px rgba(132,217,61,0.3)' }
          }
        >
          <Plus className="w-4 h-4" strokeWidth={2.25} />
          {out ? t('outOfStock') : t('addToCart')}
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
      // max-w + truncate keep the pill inside the product card no
      // matter how long the localized label is (e.g. the previous
      // "Nutrition Coach Rawan's pick" overflowed at the 2-col
      // mobile grid width). The icon and the eyebrow-cased label
      // still get a comfortable fit; anything longer ellipsizes.
      className="inline-flex items-center gap-1 rounded-pill backdrop-blur-sm px-2 h-6 text-[10px] uppercase tracking-eyebrow font-semibold border max-w-[calc(100%-1rem)] overflow-hidden whitespace-nowrap"
      style={{ background: bg, color, borderColor: `${color}40` }}
    >
      {Icon && <Icon className="w-2.5 h-2.5 shrink-0" strokeWidth={2} />}
      <span className="truncate">{label}</span>
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
                    className="shrink-0 w-14 h-14 rounded-md overflow-hidden inline-block"
                    style={{ background: line.product.hue }}
                    aria-hidden
                  >
                    {line.product.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={line.product.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-1 leading-snug">
                      {line.product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-3 font-mono" dir="ltr">
                      ${line.product.price.toFixed(2)}
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
                      ${(line.product.price * line.qty).toFixed(2)}
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
                <span>${subtotal.toFixed(2)}</span>
              </li>
              {discountAmount > 0 && (
                <li className="flex justify-between text-lime-400">
                  <span className="font-sans">
                    {t('discount')}
                    {tierPct > 0 && ` · ${tier?.toUpperCase()} ${tierPct}%`}
                    {couponApplied && ` · +${couponApplied.pct}%`}
                  </span>
                  <span>−${discountAmount.toFixed(2)}</span>
                </li>
              )}
              <li className="flex justify-between text-fg-2">
                <span className="font-sans">{t('shipping')}</span>
                <span>{t('freeShipping')}</span>
              </li>
              <li className="pt-2 mt-1 border-t border-border flex justify-between text-fg-1 text-base font-bold">
                <span className="font-sans">{t('total')}</span>
                <span>${total.toFixed(2)}</span>
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
        <Lock
          className="w-8 h-8 text-yellow-500 mx-auto mb-5"
          strokeWidth={1.75}
        />
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
