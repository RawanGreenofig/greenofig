'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ease, NUTRITIONIST } from '@/lib/tokens'

const EASE_OUT: [number, number, number, number] = [...ease.out]

export function AboutSection() {
  const t = useTranslations('marketing')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const name = isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name
  const role = isAr ? NUTRITIONIST.roleAr : NUTRITIONIST.role
  const bio = isAr ? NUTRITIONIST.bio.longAr : NUTRITIONIST.bio.long
  const creds = isAr ? NUTRITIONIST.credentialsAr : NUTRITIONIST.credentials

  const slideFrom = isAr ? 40 : -40

  return (
    <section
      id="about"
      className="relative z-10 w-full px-6 py-16 lg:py-24"
    >
      <div className="max-w-screen-xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — portrait */}
        <motion.div
          initial={{ opacity: 0, x: slideFrom }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          viewport={{ once: true, margin: '-100px' }}
        >
          <Image
            src="/images/dr-rawan-othman.jpg"
            alt={`${name} — ${role}`}
            width={480}
            height={640}
            priority
            className="w-full rounded-[var(--radius-2xl)] object-cover object-top"
          />
          {/* Identity row — name, role, verified badge */}
          <div className="mt-6 space-y-1.5">
            <p className="font-sans text-lg font-semibold text-fg-1">
              {name}
            </p>
            <p className="text-sm text-fg-2">{role}</p>
            <p className="inline-flex items-center gap-2 text-xs text-lime-400">
              <span
                aria-hidden
                className="w-2 h-2 rounded-pill bg-success"
              />
              {tCommon('verifiedNutritionist')}
            </p>
          </div>
        </motion.div>

        {/* Right — text. Pure inline-styled / animation-free so the bio
         * can NEVER end up at opacity:0 because of an observer that didn't
         * fire. This regressed three times via clipPath/whileInView; we
         * are not flirting with that again. */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '24px',
            padding: '32px 0',
            opacity: 1,
            transform: 'none',
            visibility: 'visible',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#4ade80',
            }}
          >
            {t('aboutEyebrow')}
          </span>

          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {t('aboutHeadline')}
          </h2>

          <p
            style={{
              fontSize: '18px',
              fontStyle: 'italic',
              color: '#9baf9f',
              lineHeight: 1.6,
              maxWidth: '520px',
            }}
          >
            {t('aboutSub')}
          </p>

          <p
            style={{
              fontSize: '16px',
              color: '#aaaaaa',
              lineHeight: 1.7,
              maxWidth: '520px',
            }}
          >
            {bio}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {creds.map((cred) => (
              <span
                key={cred}
                style={{
                  background: 'rgba(74,222,128,0.1)',
                  color: '#4ade80',
                  fontSize: '13px',
                  padding: '6px 16px',
                  borderRadius: '999px',
                  border: '1px solid rgba(74,222,128,0.2)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {cred}
              </span>
            ))}
          </div>

          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#4ade80',
              color: '#000000',
              fontWeight: 600,
              fontSize: '14px',
              padding: '12px 24px',
              borderRadius: '999px',
              width: 'fit-content',
              textDecoration: 'none',
              transition: 'background 200ms',
              marginTop: '4px',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#86efac')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#4ade80')}
          >
            {t('aboutCta')}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d={isAr ? 'M13 8H3M7 4L3 8l4 4' : 'M3 8h10M9 4l4 4-4 4'}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

