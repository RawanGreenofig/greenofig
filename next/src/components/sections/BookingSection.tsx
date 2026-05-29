'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, CheckCircle, BadgeCheck } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from '@/i18n/navigation'
import { ease, NUTRITIONIST } from '@/lib/tokens'

const EASE_OUT: [number, number, number, number] = [...ease.out]

const STAGGER = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE_OUT, delay },
  viewport: { once: true, margin: '-80px' },
})

export function BookingSection() {
  const t = useTranslations('marketing')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const drName = isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name
  const drRole = isAr ? NUTRITIONIST.roleAr : NUTRITIONIST.role

  const trustChips = [
    t('bookingTrust1'),
    t('bookingTrust2'),
    t('bookingTrust3'),
  ]

  return (
    <section
      id="booking"
      className="relative z-10 w-full bg-bg overflow-hidden py-20 lg:py-32"
    >
      {/* Two cinematic radial glows */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle 400px at 30% 50%, rgb(61 122 74 / 0.18), transparent 70%), radial-gradient(circle 300px at 75% 50%, rgb(163 230 53 / 0.08), transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        viewport={{ once: true, margin: '-80px' }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        {/* 1 — Eyebrow pill with pulsing dot */}
        <motion.div
          {...STAGGER(0)}
          className="inline-flex items-center gap-2 rounded-full bg-surface border border-primary/40 px-5 py-2 mb-8"
        >
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"
          />
          <span className="text-xs font-semibold uppercase tracking-eyebrow text-lime-400">
            {t('bookingEyebrow')}
          </span>
        </motion.div>

        {/* 2 — Two-line headline */}
        <motion.h2
          {...STAGGER(0.1)}
          className="font-display font-bold tracking-tight mb-5"
          style={{
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            fontVariationSettings:
              "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
          }}
        >
          <span className="block text-fg-1">{t('bookingLine1')}</span>
          <span className="block text-lime-400">{t('bookingLine2')}</span>
        </motion.h2>

        {/* 3 — Subtitle */}
        <motion.p
          {...STAGGER(0.2)}
          className="mx-auto max-w-lg text-fg-2 mb-12"
          style={{ fontSize: '1.125rem', lineHeight: 1.6 }}
        >
          {t('bookingSub')}
        </motion.p>

        {/* 4 — Nutrition Coach Rawan trust card */}
        <motion.div {...STAGGER(0.3)} className="mb-10 flex justify-center">
          <div className="inline-flex items-center gap-4 rounded-2xl border border-border bg-surface px-6 py-4 max-w-sm w-full text-start">
            <Image
              src="/images/dr-rawan-othman.jpg"
              alt={drName}
              width={56}
              height={56}
              className="rounded-full object-cover object-top border-2 border-primary shrink-0"
              style={{ width: 56, height: 56 }}
            />
            <div className="min-w-0">
              <p className="inline-flex items-center text-sm font-semibold text-fg-1 truncate" style={{ gap: 10 }}>
                {drName}
                <BadgeCheck
                  className="w-4 h-4 shrink-0"
                  strokeWidth={1.75}
                  style={{ color: '#60a5fa' }}
                />
              </p>
              <p className="text-xs text-fg-2 truncate">{drRole}</p>
            </div>
          </div>
        </motion.div>

        {/* 5 — CTA buttons */}
        <motion.div
          {...STAGGER(0.4)}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#booking"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-bg transition-all duration-normal ease-out hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #5a9048, #3d6b2a)',
              boxShadow: '0 0 32px rgba(90,144,72,0.35)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                '0 0 48px rgba(90,144,72,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                '0 0 32px rgba(90,144,72,0.35)'
            }}
          >
            {t('bookingCta')}
            <ArrowRight
              strokeWidth={2.25}
              className={`w-4 h-4 transition-transform duration-normal ease-out ${
                isAr
                  ? 'rotate-180 group-hover:-translate-x-1'
                  : 'group-hover:translate-x-1'
              }`}
            />
          </a>

          <Link
            href="/dashboard/store"
            className="inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium text-fg-1 bg-transparent transition-all duration-normal ease-out hover:bg-surface"
            style={{ border: '1.5px solid rgb(163 230 53 / 0.4)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgb(163 230 53 / 1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgb(163 230 53 / 0.4)'
            }}
          >
            {t('bookingCtaSecondary')}
          </Link>
        </motion.div>

        {/* 6 — Trust chips */}
        <motion.div
          {...STAGGER(0.5)}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {trustChips.map((chip, i) => (
            <Fragment key={chip}>
              {i > 0 && (
                <span
                  aria-hidden
                  className="text-fg-3 hidden sm:inline"
                >
                  ·
                </span>
              )}
              <span className="inline-flex items-center gap-2 text-sm text-fg-2">
                <CheckCircle
                  className="w-4 h-4 text-lime-500 shrink-0"
                  strokeWidth={2}
                />
                {chip}
              </span>
            </Fragment>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
