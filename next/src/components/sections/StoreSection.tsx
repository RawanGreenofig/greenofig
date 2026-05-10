'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Sun,
  Heart,
  Rocket,
  Play,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ease } from '@/lib/tokens'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'
import { useUser } from '@/lib/hooks/useUser'

const EASE_OUT: [number, number, number, number] = [...ease.out]

interface Product {
  Icon: LucideIcon
  iconColor: string
  name: string
  price: string
  badge?: 'pick' | 'bestseller'
}

const PRODUCTS: Product[] = [
  { Icon: Lightbulb, iconColor: 'var(--gf-lime-400)', name: 'Omega-3 Premium',    price: '$34.99', badge: 'pick' },
  { Icon: Sun,       iconColor: 'var(--gf-amber)',    name: 'Vitamin D3 + K2',    price: '$28.99' },
  { Icon: Heart,     iconColor: 'var(--gf-beet)',     name: 'Magnesium Complex',  price: '$32.99', badge: 'bestseller' },
  { Icon: Rocket,    iconColor: 'var(--gf-lime-400)', name: 'Whey Protein Blend', price: '$59.99', badge: 'pick' },
  { Icon: Play,      iconColor: 'var(--gf-fig-gold)', name: 'Collagen Peptides',  price: '$44.99' },
]

export function StoreSection() {
  const t = useTranslations('marketing')
  const tStore = useTranslations('store')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { value: enabled, isLoading } = usePlatformSetting<boolean>(
    'store_enabled',
  )
  // Per-tier visibility — admin can restrict the store to specific
  // tiers (e.g. ['premium','vip'] hides it from free/basic). Empty
  // array or null/missing → visible to everyone, including signed-out
  // visitors on the marketing page.
  const { value: allowedTiers } = usePlatformSetting<string[]>(
    'store_enabled_tiers',
  )
  const { tier: userTier } = useUser()
  const scrollerRef = useRef<HTMLDivElement>(null)

  const isOff = !isLoading && enabled === false
  const tierBlocked =
    Array.isArray(allowedTiers) && allowedTiers.length > 0 &&
    !allowedTiers.includes(userTier ?? 'free')

  // Auto-advance the carousel every 3.5s, pause on hover/focus, and loop
  // back to the start when reaching the end. Direction flips for RTL so the
  // visual progression always reads "next card" on either locale.
  // Must run unconditionally (rules-of-hooks) — bail out internally when
  // the store is gated off and the scroller never mounts.
  useEffect(() => {
    if (isOff) return
    const el = scrollerRef.current
    if (!el) return
    if (typeof window !== 'undefined') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
      if (reduce.matches) return
    }
    let paused = false
    const pause = () => { paused = true }
    const resume = () => { paused = false }
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', resume)
    el.addEventListener('focusin', pause)
    el.addEventListener('focusout', resume)
    const dir = locale === 'ar' ? -1 : 1
    const step = 240
    const id = window.setInterval(() => {
      if (paused) return
      const max = el.scrollWidth - el.clientWidth
      const cur = Math.abs(el.scrollLeft)
      if (cur >= max - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: step * dir, behavior: 'smooth' })
      }
    }, 3500)
    return () => {
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
      el.removeEventListener('focusin', pause)
      el.removeEventListener('focusout', resume)
      window.clearInterval(id)
    }
  }, [locale, isOff])

  if (isOff) {
    return (
      <section
        id="store"
        className="relative z-10 w-full px-6 py-16 lg:py-24"
      >
        <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-surface px-8 py-12 text-center">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {t('storeEyebrow')}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-fg-1">
            {tStore('offlineTitle')}
          </h2>
          <p className="mt-3 text-sm text-fg-2">{tStore('offlineBody')}</p>
        </div>
      </section>
    )
  }
  // Admin restricted the store to specific tiers and the current user
  // (or guest) isn't in the list — render nothing rather than a noisy
  // gate so the marketing page just doesn't include the section.
  if (tierBlocked) return null

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <section id="store" className="relative z-10 w-full py-16 lg:py-24">
      <div className="max-w-screen-xl mx-auto px-6">
        <header className="mb-12 max-w-2xl">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {t('storeEyebrow')}
          </p>
          <h2
            className="mt-3 font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.05,
              fontVariationSettings:
                "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {t('storeHeadline')}
          </h2>
          <p className="mt-3 text-base text-fg-2 max-w-md">
            {t('storeSub')}
          </p>
        </header>
      </div>

      <div className="relative max-w-screen-xl mx-auto group/carousel">
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto px-6 pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PRODUCTS.map((product, idx) => {
            const Icon = product.Icon
            return (
              <motion.article
                key={product.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: EASE_OUT,
                  delay: idx * 0.05,
                }}
                viewport={{ once: true, margin: '-50px' }}
                whileHover={{ y: -4 }}
                className="snap-start shrink-0 w-[220px] rounded-xl border border-border bg-surface overflow-hidden flex flex-col transition-colors duration-300 hover:border-primary/40"
                style={{
                  boxShadow:
                    '0 1px 0 rgba(255,255,255,0.02) inset, 0 12px 32px rgba(0,0,0,0.25)',
                }}
              >
                <div
                  className="relative aspect-square flex items-center justify-center"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 35%, rgba(163,230,53,0.06), rgba(13,26,18,0) 60%), #0d1a12',
                  }}
                >
                  <Icon
                    className="w-16 h-16 transition-transform duration-500 group-hover/carousel:scale-105"
                    strokeWidth={1.5}
                    style={{ color: product.iconColor }}
                  />
                  {product.badge && (
                    <span
                      className={`absolute top-3 start-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-eyebrow ${
                        product.badge === 'pick'
                          ? 'bg-lime-500/15 text-lime-400'
                          : 'bg-amber/15 text-amber'
                      }`}
                    >
                      {product.badge === 'pick'
                        ? tStore('drPick')
                        : tStore('bestseller')}
                    </span>
                  )}
                </div>
                <div className="p-6 space-y-1 flex-1">
                  <p className="text-sm font-semibold text-fg-1 truncate">
                    {product.name}
                  </p>
                  <p className="font-mono text-xs text-fg-2">{product.price}</p>
                </div>
                <button
                  type="button"
                  className="mx-4 mb-4 rounded-full bg-amber text-bg-deeper text-xs font-bold py-2 hover:bg-amber/90 transition-colors duration-fast ease-out min-h-[44px]"
                >
                  {tStore('addToCart')}
                </button>
              </motion.article>
            )
          })}
        </div>

        {/* Overlay arrows — sit on the carousel edges, fade in on hover. */}
        <button
          type="button"
          onClick={() => scrollBy(-260)}
          aria-label={tCommon('previous')}
          className="hidden md:flex absolute start-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full border border-border text-fg-1 opacity-0 group-hover/carousel:opacity-100 hover:border-primary hover:text-lime-400 transition-all duration-200"
          style={{
            background: 'rgba(13, 26, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <ChevronLeft
            className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(260)}
          aria-label={tCommon('next')}
          className="hidden md:flex absolute end-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full border border-border text-fg-1 opacity-0 group-hover/carousel:opacity-100 hover:border-primary hover:text-lime-400 transition-all duration-200"
          style={{
            background: 'rgba(13, 26, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <ChevronRight
            className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 mt-6 flex justify-end">
        <Link
          href="/dashboard/store"
          className="text-sm text-lime-400 hover:text-lime-500 transition-colors inline-flex items-center gap-1"
        >
          {t('storeViewAll')}
          <ChevronRight
            className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`}
          />
        </Link>
      </div>
    </section>
  )
}
