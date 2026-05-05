'use client'

import { useRef } from 'react'
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

const EASE_OUT: [number, number, number, number] = [...ease.out]

interface Product {
  Icon: LucideIcon
  iconColor: string
  name: string
  price: string
  badge?: 'pick' | 'bestseller'
}

const PRODUCTS: Product[] = [
  { Icon: Lightbulb, iconColor: 'var(--gf-lime-400)', name: 'Omega-3 Premium',    price: 'SAR 34.99', badge: 'pick' },
  { Icon: Sun,       iconColor: 'var(--gf-amber)',    name: 'Vitamin D3 + K2',    price: 'SAR 28.99' },
  { Icon: Heart,     iconColor: 'var(--gf-beet)',     name: 'Magnesium Complex',  price: 'SAR 32.99', badge: 'bestseller' },
  { Icon: Rocket,    iconColor: 'var(--gf-lime-400)', name: 'Whey Protein Blend', price: 'SAR 59.99', badge: 'pick' },
  { Icon: Play,      iconColor: 'var(--gf-fig-gold)', name: 'Collagen Peptides',  price: 'SAR 44.99' },
]

export function StoreSection() {
  const t = useTranslations('marketing')
  const tStore = useTranslations('store')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const { value: enabled, isLoading } = usePlatformSetting<boolean>(
    'store_enabled',
  )
  const scrollerRef = useRef<HTMLDivElement>(null)

  const isOff = !isLoading && enabled === false

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

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <section id="store" className="relative z-10 w-full py-16 lg:py-24">
      <div className="max-w-screen-xl mx-auto px-6">
        <header className="flex items-end justify-between gap-4 mb-12">
          <div>
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
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-260)}
              aria-label={tCommon('previous')}
              className="w-11 h-11 rounded-full border border-border bg-surface text-fg-1 hover:border-primary hover:text-lime-400 transition-colors"
            >
              <ChevronLeft
                className={`w-4 h-4 mx-auto ${locale === 'ar' ? 'rotate-180' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(260)}
              aria-label={tCommon('next')}
              className="w-11 h-11 rounded-full border border-border bg-surface text-fg-1 hover:border-primary hover:text-lime-400 transition-colors"
            >
              <ChevronRight
                className={`w-4 h-4 mx-auto ${locale === 'ar' ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </header>
      </div>

      <div className="max-w-screen-xl mx-auto">
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
                className="snap-start shrink-0 w-[220px] rounded-xl border border-border bg-surface overflow-hidden flex flex-col"
              >
                <div className="relative aspect-square bg-bg-deeper flex items-center justify-center">
                  <Icon
                    className="w-16 h-16"
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
