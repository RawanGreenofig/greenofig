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

        {/* Right — text */}
        <div className="space-y-5">
          <LineReveal>
            <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
              {t('aboutEyebrow')}
            </p>
          </LineReveal>
          <LineReveal delay={0.08}>
            <h2
              className="font-display font-bold text-fg-1 tracking-tight"
              style={{
                fontSize: 'clamp(40px, 5vw, 64px)',
                lineHeight: 1.05,
                fontVariationSettings:
                  "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
              }}
            >
              {t('aboutHeadline')}
            </h2>
          </LineReveal>
          <LineReveal delay={0.14}>
            <p className="font-display italic text-lg lg:text-xl text-fg-2 leading-relaxed">
              {t('aboutSub')}
            </p>
          </LineReveal>
          <LineReveal delay={0.2}>
            <p className="text-base lg:text-lg text-fg-2 leading-relaxed">
              {bio}
            </p>
          </LineReveal>
          <LineReveal delay={0.4}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                margin: '28px 0',
              }}
            >
              {creds.map((cred, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(61,122,74,0.15)',
                      border: '1px solid rgba(61,122,74,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2 7l3.5 3.5L12 3"
                        stroke="#84cc16"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: '#f0ede6',
                    }}
                  >
                    {cred}
                  </span>
                </div>
              ))}
            </div>
          </LineReveal>
          <LineReveal delay={0.5}>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #3d7a4a, #4a9259)',
                color: '#f0ede6',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '0.95rem',
                padding: '14px 28px',
                borderRadius: '9999px',
                textDecoration: 'none',
                boxShadow: '0 0 32px rgba(61,122,74,0.35)',
                transition: 'all 0.3s ease',
                marginTop: '8px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 0 48px rgba(61,122,74,0.55)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 0 32px rgba(61,122,74,0.35)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
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
          </LineReveal>
        </div>
      </div>
    </section>
  )
}

function LineReveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
      whileInView={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay }}
      viewport={{ once: true, margin: '-100px' }}
    >
      {children}
    </motion.div>
  )
}
