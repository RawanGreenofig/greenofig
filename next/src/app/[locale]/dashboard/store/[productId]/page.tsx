'use client'

import { useEffect, useState } from 'react'
import { notFound, useParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ShoppingBag, Sparkles, Plus } from '@/icons'
import toast from 'react-hot-toast'
import { Link } from '@/i18n/navigation'
import { PRODUCTS, type Product } from '@/lib/products'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'

const TIER_DISCOUNT_PCT: Record<string, number> = {
  premium: 10,
  vip: 15,
}

const CATEGORY_LABEL: Record<Product['category'], string> = {
  supplements: 'Supplements',
  superfoods: 'Superfoods',
  snacks: 'Snacks',
  kitchen: 'Kitchen',
  books: 'Books',
}

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>()
  const { tier } = useUser()
  const [product, setProduct] = useState<Product | null>(() => {
    return PRODUCTS.find((p) => p.id === params.productId) ?? null
  })
  const [loading, setLoading] = useState(() => {
    // Only hit the DB if we didn't find the id in the seed catalog AND
    // the id looks like a UUID. SEED ids like 'p1' shouldn't trigger a query.
    const isUuid = /^[0-9a-f-]{32,}$/i.test(params.productId ?? '')
    return isUuid && !PRODUCTS.some((p) => p.id === params.productId)
  })

  // Hydrate from the products table when the URL is a real DB UUID.
  useEffect(() => {
    if (!loading) return
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase || !params.productId) {
        if (!cancelled) setLoading(false)
        return
      }
      type Row = {
        id: string
        name: string
        category: string
        price_cents: number
        compare_price_cents: number | null
        stock_quantity: number
        description: string | null
        nutritionist_note: string | null
        is_nutritionist_pick: boolean | null
        image_url: string | null
      }
      const { data } = await supabase
        .from('products')
        .select(
          'id, name, category, price_cents, compare_price_cents, stock_quantity, description, nutritionist_note, is_nutritionist_pick, image_url',
        )
        .eq('id', params.productId)
        .maybeSingle()
      if (cancelled) return
      const row = data as Row | null
      if (row) {
        const cat = (
          ['supplements', 'superfoods', 'snacks', 'kitchen', 'books'].includes(row.category)
            ? row.category
            : 'supplements'
        ) as Product['category']
        const badges: Product['badges'] = []
        if (row.is_nutritionist_pick) badges.push('drPick')
        if (row.compare_price_cents && row.compare_price_cents > row.price_cents) {
          badges.push('saleBadge')
        }
        setProduct({
          id: row.id,
          name: row.name,
          category: cat,
          price: row.price_cents / 100,
          compareAt:
            row.compare_price_cents != null
              ? row.compare_price_cents / 100
              : undefined,
          stock: row.stock_quantity,
          badges,
          hue: 'rgb(132 204 22 / 0.16)',
          image: row.image_url ?? undefined,
          description: row.description ?? '',
          benefits: row.nutritionist_note ? [row.nutritionist_note] : [],
        })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [loading, params.productId])

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-12 max-w-screen-xl mx-auto">
        <p className="text-sm" style={{ color: 'var(--gf-fg-3)' }}>
          Loading product…
        </p>
      </div>
    )
  }

  if (!product) notFound()

  const out = product.stock <= 0
  const onSale = !!product.compareAt && product.compareAt > product.price
  const discountPct = TIER_DISCOUNT_PCT[tier ?? 'free'] ?? 0
  const finalPrice =
    discountPct > 0
      ? Math.round(product.price * (1 - discountPct / 100) * 100) / 100
      : product.price
  const isDrPick = product.badges.includes('drPick')

  const handleAdd = () => {
    if (out) return
    toast.success(`Added "${product.name}" to cart`)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto">
      <Link
        href="/dashboard/store"
        className="inline-flex items-center gap-1.5 text-sm transition-colors mb-6"
        style={{ color: 'var(--gf-fg-2)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gf-fg-1)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gf-fg-2)')}
      >
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
        Back to Store
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ── Visual ─────────────────────────────────────── */}
        <div
          data-product-hue
          className="relative w-full aspect-square rounded-2xl overflow-hidden"
          style={{ background: product.hue }}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag
                className="w-24 h-24"
                strokeWidth={0.75}
                style={{ color: 'rgba(255,255,255,0.35)' }}
              />
            </div>
          )}

          {isDrPick && (
            <span
              className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: 'rgba(74,222,128,0.15)',
                color: '#4ade80',
                border: '1px solid rgba(74,222,128,0.3)',
              }}
            >
              <Sparkles className="w-3 h-3" strokeWidth={2.25} />
              Coach Rawan&apos;s Pick
            </span>
          )}

          {out && (
            <span
              className="absolute bottom-4 start-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow"
              style={{
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                backdropFilter: 'blur(4px)',
              }}
            >
              Out of stock
            </span>
          )}
        </div>

        {/* ── Detail panel ───────────────────────────────── */}
        <div className="flex flex-col">
          <p
            className="text-xs uppercase font-semibold mb-3"
            style={{ letterSpacing: '0.18em', color: 'var(--gf-fg-3)' }}
          >
            {CATEGORY_LABEL[product.category]}
          </p>

          <h1
            className="font-bold tracking-tight"
            style={{ fontSize: 28, color: 'var(--gf-fg-1)', lineHeight: 1.2 }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <div className="mt-5 flex items-baseline gap-3 font-mono" dir="ltr">
            <span
              className="font-bold"
              style={{ fontSize: 32, color: '#4ade80' }}
            >
              ${finalPrice.toFixed(2)}
            </span>
            {(onSale || discountPct > 0) && (
              <span
                className="text-base line-through"
                style={{ color: 'var(--gf-fg-3)' }}
              >
                ${(onSale ? product.compareAt! : product.price).toFixed(2)}
              </span>
            )}
            {discountPct > 0 && (
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{
                  background: 'rgba(74,222,128,0.15)',
                  color: '#4ade80',
                }}
              >
                −{discountPct}% {tier?.toUpperCase()}
              </span>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p
              className="mt-6 leading-relaxed"
              style={{ fontSize: 15, color: 'var(--gf-fg-2)' }}
            >
              {product.description}
            </p>
          )}

          {/* Benefits */}
          {product.benefits.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2
                    className="w-4 h-4 text-primary flex-shrink-0"
                    strokeWidth={2}
                  />
                  <span className="text-sm" style={{ color: 'var(--gf-fg-1)' }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Add to cart */}
          <button
            type="button"
            onClick={handleAdd}
            disabled={out}
            className={out ? 'mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold' : 'btn-primary mt-8'}
            style={
              out
                ? {
                    background: 'var(--gf-surface-raised)',
                    color: 'var(--gf-fg-3)',
                    padding: 14,
                    minHeight: 48,
                    cursor: 'not-allowed',
                  }
                : { width: '100%', height: 48, borderRadius: 12 }
            }
          >
            <Plus className="w-4 h-4" strokeWidth={2.25} />
            {out ? 'Out of stock' : 'Add to cart'}
          </button>

          {/* Stock hint */}
          {!out && product.stock <= 5 && (
            <p
              className="mt-3 text-xs text-center"
              style={{ color: '#fb923c' }}
            >
              Only {product.stock} left
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
