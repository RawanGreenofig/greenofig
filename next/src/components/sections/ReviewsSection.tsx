'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Star, BadgeCheck, ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ease, NUTRITIONIST } from '@/lib/tokens'

interface LiveReview {
  id: string
  rating: number
  title: string | null
  body: string
  photo_urls: string[]
  author_name: string
  author_initials: string
}

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
  const isAr = locale === 'ar'
  const drName = isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name

  // Fetch the 3 newest live reviews; fall back to the hardcoded
  // testimonials if no rows exist yet (pre-launch / cold-start).
  const [liveReviews, setLiveReviews] = useState<LiveReview[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/reviews?limit=3')
      .then((r) => r.json())
      .then((j: { reviews?: LiveReview[] }) => {
        if (!cancelled && j.reviews) setLiveReviews(j.reviews)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const useLive = liveReviews.length > 0

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
          {useLive
            ? liveReviews.map((review, idx) => (
                <motion.article
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: idx * 0.12 }}
                  viewport={{ once: true, margin: '-80px' }}
                  className="group rounded-xl bg-surface p-6 flex flex-col transition-all duration-300 ease-out hover:-translate-y-1"
                  style={{
                    border: '1px solid var(--gf-border)',
                    borderTop: '2px solid var(--gf-lime-500)',
                  }}
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4"
                        fill={i < review.rating ? 'var(--gf-amber)' : 'transparent'}
                        stroke={i < review.rating ? 'var(--gf-amber)' : 'rgba(255,255,255,0.30)'}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <p className="text-sm font-semibold text-fg-1 mb-1">{review.title}</p>
                  )}
                  <p className="flex-1 text-sm leading-relaxed text-fg-1 line-clamp-6">
                    &ldquo;{review.body}&rdquo;
                  </p>
                  <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
                    <span
                      className="w-10 h-10 rounded-pill flex items-center justify-center text-xs font-bold tracking-wide"
                      style={{
                        background: 'rgba(163,230,53,0.10)',
                        color: '#a3e635',
                        border: '1px solid rgba(163,230,53,0.35)',
                      }}
                    >
                      {review.author_initials}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-fg-1">
                        {review.author_name}
                      </p>
                      <p className="text-xs text-fg-2">
                        {isAr ? 'عضو غرينوفيغ' : 'Greenofig member'}
                      </p>
                    </div>
                  </div>
                </motion.article>
              ))
            : REVIEWS.map((review, idx) => (
                <motion.article
                  key={review.nameKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: idx * 0.12 }}
                  viewport={{ once: true, margin: '-80px' }}
                  className="group rounded-xl bg-surface p-6 flex flex-col transition-all duration-300 ease-out hover:-translate-y-1"
                  style={{
                    border: '1px solid var(--gf-border)',
                    borderTop: `2px solid ${review.borderColor}`,
                  }}
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
                      className="w-10 h-10 rounded-pill flex items-center justify-center text-xs font-bold tracking-wide"
                      style={{
                        background: `color-mix(in srgb, ${review.borderColor} 15%, transparent)`,
                        color: review.borderColor,
                        border: `1px solid color-mix(in srgb, ${review.borderColor} 40%, transparent)`,
                      }}
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

        {/* CTA — read all + write your own */}
        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/reviews"
            className="btn-secondary inline-flex"
            style={{ height: 40, padding: '0 22px', fontSize: 13 }}
          >
            {isAr ? 'اقرأ كل المراجعات' : 'Read all reviews'}
            <ArrowRight
              className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`}
              strokeWidth={2}
            />
          </Link>
          <Link
            href="/reviews"
            className="btn-primary inline-flex"
            style={{ height: 40, padding: '0 22px', fontSize: 13 }}
          >
            {isAr ? 'اكتب مراجعتك' : 'Write a review'}
          </Link>
        </div>

        {/* Nutrition Coach Rawan post — full width */}
        <motion.article
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.4 }}
          viewport={{ once: true, margin: '-80px' }}
          className="mt-8 rounded-xl border border-border bg-surface p-6 lg:p-8 flex flex-col gap-4"
        >
          <div className="flex items-center gap-3">
            <Image
              src="/images/dr-rawan-othman.jpg"
              alt={drName}
              width={48}
              height={48}
              className="rounded-full object-cover object-top shrink-0"
              style={{ width: 48, height: 48 }}
            />
            <div className="flex-1">
              <div className="flex items-center" style={{ gap: 10 }}>
                <p className="text-sm font-semibold text-fg-1">{drName}</p>
                <BadgeCheck
                  className="w-4 h-4"
                  strokeWidth={1.75}
                  style={{ color: '#60a5fa' }}
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
