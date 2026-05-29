'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { BadgeCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ease, NUTRITIONIST } from '@/lib/tokens'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'

interface AboutSettings {
  name?: string
  role?: string
  bio?: string
  credentials?: string
}

const EASE_OUT: [number, number, number, number] = [...ease.out]

export function AboutSection() {
  const t = useTranslations('marketing')
  const locale = useLocale()
  const isAr = locale === 'ar'

  const defaultName = isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name
  const defaultRole = isAr ? NUTRITIONIST.roleAr : NUTRITIONIST.role
  const defaultBio = isAr ? NUTRITIONIST.bio.longAr : NUTRITIONIST.bio.long
  const defaultCreds = isAr ? NUTRITIONIST.credentialsAr : NUTRITIONIST.credentials

  // Admin overrides via /admin/site-editor → site_about. The editor is
  // currently single-language (English by default), so we only apply
  // the override on the EN locale to avoid overwriting Arabic copy
  // with English. The Arabic site keeps the translated defaults.
  const { value: aboutOv } = usePlatformSetting<AboutSettings>('site_about')
  const name = (!isAr && aboutOv?.name?.trim()) || defaultName
  const role = (!isAr && aboutOv?.role?.trim()) || defaultRole
  const bio = (!isAr && aboutOv?.bio?.trim()) || defaultBio
  const creds = !isAr && aboutOv?.credentials?.trim()
    ? aboutOv.credentials.split(/\n+/).filter(Boolean)
    : defaultCreds

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
            className="block w-auto h-auto max-h-[600px] max-w-full rounded-[var(--radius-2xl)]"
          />
          {/* Identity row — name with verified-badge icon, role */}
          <div className="mt-6 space-y-1.5">
            <p className="inline-flex items-center font-sans text-lg font-semibold text-fg-1" style={{ gap: 10 }}>
              {name}
              <BadgeCheck
                className="w-4 h-4"
                strokeWidth={1.75}
                style={{ color: '#60a5fa' }}
              />
            </p>
            <p className="text-sm text-fg-2">{role}</p>
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
              color: '#4d7c0f',
            }}
          >
            {t('aboutEyebrow')}
          </span>

          <h2
            style={{
              fontSize: 'clamp(28px, 4vw, 48px)',
              fontWeight: 700,
              color: '#1c2e20',
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
              color: '#4a6352',
              lineHeight: 1.6,
              maxWidth: '520px',
            }}
          >
            {t('aboutSub')}
          </p>

          <p
            style={{
              fontSize: '16px',
              color: '#4a6352',
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
                  background: 'rgba(61,107,58,0.1)',
                  color: '#3d6b0a',
                  fontSize: '13px',
                  padding: '6px 16px',
                  borderRadius: '999px',
                  border: '1px solid rgba(61,107,58,0.25)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {cred}
              </span>
            ))}
          </div>

          {/* Lead-capture: a "Book a consultation" click should land the
           * visitor on the homepage assessment quiz so we collect their
           * email + answers, not on /dashboard (which would redirect
           * unauthenticated visitors to sign-in). The hash scrolls to
           * the ConsultationQuiz section (#booking). */}
          <Link
            href="/#booking"
            className="btn-primary"
            style={{ width: 'fit-content', marginTop: 4 }}
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

