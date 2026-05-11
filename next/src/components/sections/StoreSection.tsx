'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Flame,
  Heart,
  Leaf,
  Lightbulb,
  Rocket,
  Sparkles,
  Sun,
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
  ringColor: string
  name: string
  price: string
  badge?: 'pick' | 'bestseller'
}

const PRODUCTS: Product[] = [
  { Icon: Lightbulb, iconColor: 'var(--gf-lime-400)',  ringColor: 'rgba(132,217,61,0.35)', name: 'Omega-3 Premium',    price: '$34.99', badge: 'pick' },
  { Icon: Sun,       iconColor: 'var(--gf-amber)',     ringColor: 'rgba(245,158,11,0.35)', name: 'Vitamin D3 + K2',    price: '$28.99' },
  { Icon: Heart,     iconColor: 'var(--gf-beet)',      ringColor: 'rgba(190,49,68,0.35)',  name: 'Magnesium Complex',  price: '$32.99', badge: 'bestseller' },
  { Icon: Rocket,    iconColor: 'var(--gf-lime-400)',  ringColor: 'rgba(132,217,61,0.35)', name: 'Whey Protein Blend', price: '$59.99', badge: 'pick' },
  { Icon: Sparkles,  iconColor: 'var(--gf-fig-gold)',  ringColor: 'rgba(217,166,71,0.35)', name: 'Collagen Peptides',  price: '$44.99' },
  { Icon: Leaf,      iconColor: 'var(--gf-lime-400)',  ringColor: 'rgba(132,217,61,0.35)', name: 'Greens Powder',      price: '$39.99' },
  { Icon: Flame,     iconColor: 'var(--gf-amber)',     ringColor: 'rgba(245,158,11,0.35)', name: 'Pre-Workout Clean',  price: '$36.99', badge: 'bestseller' },
  { Icon: Droplet,   iconColor: 'var(--gf-beet)',      ringColor: 'rgba(190,49,68,0.35)',  name: 'Electrolyte Mix',    price: '$24.99' },
]

const CARD_W = 248
const GAP = 16

export function StoreSection() {
  const t = useTranslations('marketing')
  const tStore = useTranslations('store')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { value: enabled, isLoading } = usePlatformSetting<boolean>(
    'store_enabled',
  )
  const { value: allowedTiers } = usePlatformSetting<string[]>(
    'store_enabled_tiers',
  )
  const { tier: userTier } = useUser()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [canScroll, setCanScroll] = useState(false)

  const isOff = !isLoading && enabled === false
  const tierBlocked =
    Array.isArray(allowedTiers) && allowedTiers.length > 0 &&
    !allowedTiers.includes(userTier ?? 'free')

  const dir = useMemo(() => (locale === 'ar' ? -1 : 1), [locale])

  // Track active card + whether the rail is actually overflowing. Without
  // this the auto-slide ran forever even when every card was on-screen.
  useEffect(() => {
    if (isOff) return
    const el = scrollerRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setCanScroll(max > 8)
      const cur = Math.abs(el.scrollLeft)
      const idx = Math.round(cur / (CARD_W + GAP))
      setActiveIdx(Math.min(PRODUCTS.length - 1, Math.max(0, idx)))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [isOff])

  // Auto-advance every 4s. Bounded to one card at a time so the dot
  // indicator stays in sync, pauses on hover / focus / pointer down,
  // respects prefers-reduced-motion, and only runs when the rail
  // actually overflows.
  useEffect(() => {
    if (isOff || !canScroll) return
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
    el.addEventListener('pointerdown', pause)
    el.addEventListener('pointerup', resume)
    const id = window.setInterval(() => {
      if (paused) return
      const max = el.scrollWidth - el.clientWidth
      const cur = Math.abs(el.scrollLeft)
      if (cur >= max - 8) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: (CARD_W + GAP) * dir, behavior: 'smooth' })
      }
    }, 4000)
    return () => {
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', resume)
      el.removeEventListener('focusin', pause)
      el.removeEventListener('focusout', resume)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('pointerup', resume)
      window.clearInterval(id)
    }
  }, [dir, isOff, canScroll])

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
  if (tierBlocked) return null

  const scrollByCards = (delta: number) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: (CARD_W + GAP) * delta * dir, behavior: 'smooth' })
  }
  const scrollToCard = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: (CARD_W + GAP) * i * dir, behavior: 'smooth' })
  }

  return (
    <section id="store" className="relative z-10 w-full py-16 lg:py-24">
      <div className="max-w-screen-xl mx-auto px-6">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
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
          </div>

          {/* Desktop arrow chrome — visible by default, not hover-gated. */}
          <div className="hidden md:flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label={tCommon('previous')}
              disabled={!canScroll}
              className="w-11 h-11 rounded-full border border-border bg-surface text-fg-1 inline-flex items-center justify-center transition-all duration-200 hover:border-lime-400 hover:text-lime-400 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 16px rgba(0,0,0,0.25)',
              }}
            >
              <ChevronLeft
                className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`}
                strokeWidth={1.75}
              />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label={tCommon('next')}
              disabled={!canScroll}
              className="w-11 h-11 rounded-full border border-border bg-surface text-fg-1 inline-flex items-center justify-center transition-all duration-200 hover:border-lime-400 hover:text-lime-400 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 6px 16px rgba(0,0,0,0.25)',
              }}
            >
              <ChevronRight
                className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`}
                strokeWidth={1.75}
              />
            </button>
          </div>
        </header>
      </div>

      <div className="relative max-w-screen-xl mx-auto px-6 group/carousel">
        {/* Edge fades blend the rail into the page so cut-off cards
            don't look like a UI bug. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-6 w-8 z-10"
          style={{
            background: 'linear-gradient(to right, var(--gf-bg) 0%, transparent 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 end-6 w-8 z-10"
          style={{
            background: 'linear-gradient(to left, var(--gf-bg) 0%, transparent 100%)',
          }}
        />

        <div
          ref={scrollerRef}
          role="region"
          aria-label={t('storeEyebrow')}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  delay: Math.min(idx, 6) * 0.04,
                }}
                viewport={{ once: true, margin: '-50px' }}
                whileHover={{ y: -6 }}
                className="snap-start shrink-0 rounded-2xl border border-border bg-surface overflow-hidden flex flex-col transition-colors duration-300 hover:border-lime-400/50"
                style={{
                  width: CARD_W,
                  boxShadow:
                    '0 1px 0 rgba(255,255,255,0.03) inset, 0 14px 40px rgba(0,0,0,0.32)',
                }}
              >
                <div
                  className="relative aspect-square flex items-center justify-center overflow-hidden"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 35%, rgba(163,230,53,0.07), rgba(13,26,18,0) 62%), #0d1a12',
                  }}
                >
                  {/* Soft ring behind the icon — picks up product color */}
                  <span
                    aria-hidden
                    className="absolute w-28 h-28 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${product.ringColor} 0%, transparent 70%)`,
                      filter: 'blur(2px)',
                    }}
                  />
                  <Icon
                    className="relative w-16 h-16 transition-transform duration-500"
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
                <div className="px-5 pt-5 pb-3 space-y-1 flex-1">
                  <p className="text-sm font-semibold text-fg-1 truncate">
                    {product.name}
                  </p>
                  <p className="font-mono text-xs text-fg-2">{product.price}</p>
                </div>
                <button
                  type="button"
                  className="mx-4 mb-4 rounded-pill bg-gradient-to-b from-amber to-amber/85 text-bg-deeper text-xs font-bold py-2.5 hover:brightness-110 transition-all duration-fast ease-out min-h-[40px]"
                >
                  {tStore('addToCart')}
                </button>
              </motion.article>
            )
          })}
        </div>
      </div>

      {/* Dot indicator — shows scroll position and is clickable. Hidden
          when the rail isn't overflowing (single page of cards). */}
      {canScroll && (
        <div className="max-w-screen-xl mx-auto px-6 mt-6 flex items-center justify-center gap-1.5">
          {PRODUCTS.map((p, i) => {
            const active = i === activeIdx
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => scrollToCard(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={active}
                className="rounded-full transition-all duration-300"
                style={{
                  width: active ? 22 : 6,
                  height: 6,
                  background: active ? 'var(--gf-lime-400)' : 'var(--gf-border-strong, rgba(255,255,255,0.18))',
                }}
              />
            )
          })}
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-6 mt-8 flex justify-end">
        <Link
          href="/dashboard/store"
          className="text-sm text-lime-400 hover:text-lime-500 transition-colors inline-flex items-center gap-1.5 font-semibold"
        >
          {t('storeViewAll')}
          <ArrowRight
            className={`w-4 h-4 ${locale === 'ar' ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </Link>
      </div>
    </section>
  )
}
