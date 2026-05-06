'use client'

import { notFound, useParams } from 'next/navigation'
import { ArrowLeft, Check, ShoppingBag, Sparkles, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from '@/i18n/navigation'
import { PRODUCTS, type Product } from '@/lib/products'
import { useUser } from '@/lib/hooks/useUser'

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
  const product = PRODUCTS.find((p) => p.id === params.productId)
  const { tier } = useUser()

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
          className="relative w-full aspect-square rounded-2xl overflow-hidden"
          style={{ background: product.hue }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag
              className="w-24 h-24"
              strokeWidth={0.75}
              style={{ color: 'rgba(255,255,255,0.35)' }}
            />
          </div>

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
              Dr. Rawan&apos;s Pick
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
          <div
            className="mt-5 flex items-baseline gap-3 font-mono"
            dir="ltr"
          >
            <span
              className="font-bold"
              style={{ fontSize: 32, color: '#4ade80' }}
            >
              {finalPrice}
            </span>
            <span
              className="text-base font-semibold"
              style={{ color: 'var(--gf-fg-2)' }}
            >
              JOD
            </span>
            {(onSale || discountPct > 0) && (
              <span
                className="text-base line-through"
                style={{ color: 'var(--gf-fg-3)' }}
              >
                {onSale ? product.compareAt : product.price}
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
          <p
            className="mt-6 leading-relaxed"
            style={{ fontSize: 15, color: 'var(--gf-fg-2)' }}
          >
            {product.description}
          </p>

          {/* Benefits */}
          {product.benefits.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {product.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="shrink-0 inline-flex items-center justify-center mt-0.5"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'rgba(74,222,128,0.15)',
                      color: '#4ade80',
                    }}
                  >
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  </span>
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--gf-fg-1)' }}
                  >
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
            className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: out ? 'var(--gf-surface-raised)' : '#4ade80',
              color: out ? 'var(--gf-fg-3)' : '#000',
              padding: '14px',
              minHeight: 48,
            }}
            onMouseEnter={(e) => {
              if (!out) e.currentTarget.style.background = '#86efac'
            }}
            onMouseLeave={(e) => {
              if (!out) e.currentTarget.style.background = '#4ade80'
            }}
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
