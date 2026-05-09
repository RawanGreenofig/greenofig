'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { Star, Plus } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { Link } from '@/i18n/navigation'
import { ReviewForm } from './ReviewForm'

interface Review {
  id: string
  user_id: string
  rating: number
  title: string | null
  body: string
  photo_paths: string[]
  photo_urls: string[]
  auto_themes: string[]
  helpful_count: number
  reply_text: string | null
  reply_at: string | null
  created_at: string
  author_name: string
  author_initials: string
}

const FILTER_RATINGS: (number | 'all')[] = ['all', 5, 4, 3, 2, 1]

export function ReviewsBrowser() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const { user } = useUser()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [writing, setWriting] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url =
      filter === 'all'
        ? '/api/reviews?limit=200'
        : `/api/reviews?limit=200&rating=${filter}`
    fetch(url)
      .then((r) => r.json())
      .then((j: { reviews?: Review[] }) => {
        if (!cancelled) setReviews(j.reviews ?? [])
      })
      .catch(() => {
        if (!cancelled) setReviews([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filter, reload])

  const stats = useMemo(() => {
    if (!reviews.length) {
      return { total: 0, avg: 0, counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }
    }
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
    let sum = 0
    for (const r of reviews) {
      sum += r.rating
      counts[r.rating] = (counts[r.rating] ?? 0) + 1
    }
    return { total: reviews.length, avg: sum / reviews.length, counts }
  }, [reviews])

  return (
    <section className="relative z-10 w-full px-6 py-16 lg:py-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-screen-xl mx-auto">
        <header className="text-center mb-10">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {isAr ? 'تقييمات العملاء' : 'Customer reviews'}
          </p>
          <h1
            className="mt-3 font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.05,
              fontVariationSettings:
                "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {isAr ? 'ماذا يقول عملاؤنا.' : 'What our members say.'}
          </h1>

          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap" dir="ltr">
            <Stars rating={Math.round(stats.avg)} size={20} />
            <span className="font-mono text-lg font-bold text-fg-1">
              {stats.avg ? stats.avg.toFixed(1) : '—'}
            </span>
            <span className="text-sm text-fg-3">
              {isAr
                ? `(${stats.total} مراجعة)`
                : `(${stats.total} reviews)`}
            </span>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
            {user ? (
              <button
                type="button"
                onClick={() => setWriting(true)}
                className="btn-primary inline-flex"
                style={{ height: 40, padding: '0 22px', fontSize: 13 }}
              >
                <Plus className="w-4 h-4" strokeWidth={2} />
                {isAr ? 'اكتب مراجعة' : 'Write a review'}
              </button>
            ) : (
              <Link
                href="/sign-in?next=/reviews"
                className="btn-secondary inline-flex"
                style={{ height: 40, padding: '0 22px', fontSize: 13 }}
              >
                {isAr ? 'سجّل دخول لكتابة مراجعة' : 'Sign in to write a review'}
              </Link>
            )}
          </div>
        </header>

        {/* Rating filter chips */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {FILTER_RATINGS.map((r) => (
            <button
              key={String(r)}
              type="button"
              onClick={() => setFilter(r)}
              className="text-xs rounded-full px-3 py-1.5 transition-colors inline-flex items-center gap-1.5"
              style={{
                background:
                  filter === r ? 'rgba(163,230,53,0.15)' : 'rgba(255,255,255,0.04)',
                color: filter === r ? '#a3e635' : 'var(--gf-fg-2)',
                border: `1px solid ${filter === r ? 'rgba(163,230,53,0.4)' : 'var(--gf-border)'}`,
              }}
            >
              {r === 'all' ? (
                isAr ? 'الكل' : 'All'
              ) : (
                <>
                  <Star
                    className="w-3 h-3"
                    fill={filter === r ? '#a3e635' : 'currentColor'}
                    stroke={filter === r ? '#a3e635' : 'currentColor'}
                  />
                  {r}
                  <span className="opacity-70">
                    ({stats.counts[r as number] ?? 0})
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        {writing && (
          <div className="mb-8">
            <ReviewForm
              isAr={isAr}
              onClose={() => setWriting(false)}
              onSubmitted={() => {
                setWriting(false)
                setReload((n) => n + 1)
              }}
            />
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-fg-3 py-12">
            {isAr ? 'جارٍ تحميل المراجعات…' : 'Loading reviews…'}
          </p>
        ) : reviews.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center max-w-xl mx-auto"
            style={{
              background: 'var(--gf-surface)',
              border: '1px solid var(--gf-border)',
            }}
          >
            <Star
              className="w-10 h-10 mx-auto mb-3 text-fg-3"
              strokeWidth={1.5}
            />
            <p className="text-base font-semibold text-fg-1 mb-1">
              {isAr ? 'لا توجد مراجعات بعد' : 'No reviews yet'}
            </p>
            <p className="text-sm text-fg-2 leading-relaxed">
              {isAr
                ? 'كن أول من يشارك تجربته مع غرينوفيغ.'
                : 'Be the first to share your Greenofig experience.'}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} isAr={isAr} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ReviewCard({ review, isAr }: { review: Review; isAr: boolean }) {
  return (
    <li
      className="rounded-2xl p-6 flex flex-col"
      style={{
        background: 'var(--gf-surface)',
        border: '1px solid var(--gf-border)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold tracking-wide shrink-0"
          style={{
            background: 'rgba(163,230,53,0.10)',
            color: '#a3e635',
            border: '1px solid rgba(163,230,53,0.35)',
          }}
        >
          {review.author_initials}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg-1 truncate">
            {review.author_name}
          </p>
          <p className="text-[11px] text-fg-3">{fmtDate(review.created_at, isAr)}</p>
        </div>
      </div>

      <Stars rating={review.rating} size={16} />

      {review.title && (
        <p className="mt-3 text-sm font-semibold text-fg-1">{review.title}</p>
      )}
      <p className="mt-2 text-sm text-fg-2 leading-relaxed flex-1 whitespace-pre-wrap">
        {review.body}
      </p>

      {review.photo_urls.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {review.photo_urls.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden block"
              style={{ border: '1px solid var(--gf-border)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Review photo ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}

      {review.reply_text && (
        <div
          className="mt-4 rounded-lg p-3"
          style={{
            background: 'rgba(96,165,250,0.08)',
            border: '1px solid rgba(96,165,250,0.25)',
          }}
        >
          <p className="text-[11px] uppercase tracking-eyebrow text-blue-400 font-semibold">
            {isAr ? 'رد فريق غرينوفيغ' : 'Reply from Greenofig'}
          </p>
          <p className="mt-1 text-sm text-fg-2 leading-relaxed whitespace-pre-wrap">
            {review.reply_text}
          </p>
        </div>
      )}

      {review.auto_themes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {review.auto_themes.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--gf-fg-3)',
                border: '1px solid var(--gf-border)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </li>
  )
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          fill={i < rating ? 'var(--gf-amber)' : 'transparent'}
          stroke={i < rating ? 'var(--gf-amber)' : 'rgba(255,255,255,0.30)'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  )
}

function fmtDate(iso: string, isAr: boolean): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(isAr ? 'ar' : 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
