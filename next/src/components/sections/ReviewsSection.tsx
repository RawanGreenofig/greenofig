'use client'

import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Star, CheckCircle } from 'lucide-react'
import { ease, NUTRITIONIST } from '@/lib/tokens'

const EASE_OUT: [number, number, number, number] = [...ease.out]

interface Review {
  quoteKey: 'review1Quote' | 'review2Quote' | 'review3Quote'
  nameKey: 'review1Name' | 'review2Name' | 'review3Name'
  goalKey: 'review1Goal' | 'review2Goal' | 'review3Goal'
  initials: string
  borderColor: string
}

const REVIEWS: Review[] = [
  { quoteKey: 'review1Quote', nameKey: 'review1Name', goalKey: 'review1Goal', initials: 'SM', borderColor: 'var(--gf-lime-500)' },
  { quoteKey: 'review2Quote', nameKey: 'review2Name', goalKey: 'review2Goal', initials: 'AK', borderColor: 'var(--gf-amber)' },
  { quoteKey: 'review3Quote', nameKey: 'review3Name', goalKey: 'review3Goal', initials: 'LR', borderColor: 'var(--gf-fig-gold)' },
]

export function ReviewsSection() {
  const t = useTranslations('marketing')
  const locale = useLocale()
  const drName = locale === 'ar' ? NUTRITIONIST.nameAr : NUTRITIONIST.name

  return (
    <section
      id="reviews"
      className="relative z-10 w-full px-6 py-16 lg:py-24"
    >
      <div className="max-w-screen-xl mx-auto">
        <header className="text-center mb-12 lg:mb-16 max-w-2xl mx-auto">
          <p className="eyebrow">{t('reviewsEyebrow')}</p>
          <h2
            className="mt-3 font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.05,
              fontVariationSettings:
                "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {t('reviewsHeadline')}
          </h2>
          <p className="mt-4 text-base text-fg-2">{t('reviewsSub')}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((review, idx) => (
            <motion.article
              key={review.nameKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: idx * 0.12 }}
              viewport={{ once: true, margin: '-80px' }}
              className="rounded-xl bg-surface p-6 flex flex-col"
              style={{ borderTop: `2px solid ${review.borderColor}`, border: '1px solid var(--gf-border)', borderTopWidth: 2, borderTopColor: review.borderColor }}
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4"
                    fill="var(--gf-amber)"
                    stroke="var(--gf-amber)"
                  />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-fg-1">
                &ldquo;{t(review.quoteKey)}&rdquo;
              </p>
              <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-pill flex items-center justify-center text-bg text-xs font-bold"
                  style={{ background: review.borderColor }}
                >
                  {review.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg-1">
                    {t(review.nameKey)}
                  </p>
                  <p className="text-xs text-fg-2">{t(review.goalKey)}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Dr. Rawan post — full width */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.4 }}
          viewport={{ once: true, margin: '-80px' }}
          className="mt-8 rounded-xl border border-border bg-surface p-6 lg:p-8 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-pill bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-bg text-sm font-bold">
              {NUTRITIONIST.initials}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-fg-1">{drName}</p>
                <CheckCircle
                  className="w-4 h-4 text-success"
                  strokeWidth={2}
                  fill="var(--gf-success)"
                  stroke="var(--gf-bg)"
                />
              </div>
              <p className="text-xs text-fg-2">
                {locale === 'ar' ? NUTRITIONIST.roleAr : NUTRITIONIST.role}
              </p>
            </div>
          </div>
          <p className="text-base leading-relaxed text-fg-1/90">
            {t('drPostBody')}
          </p>
          <p className="text-xs text-lime-400 font-mono">{t('drPostTags')}</p>
        </motion.article>
      </div>
    </section>
  )
}
