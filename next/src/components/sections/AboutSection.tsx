'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
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
  const credentials = isAr
    ? NUTRITIONIST.credentialsAr
    : NUTRITIONIST.credentials

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
            alt={`${NUTRITIONIST.name} — ${NUTRITIONIST.role}`}
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
            <div className="flex flex-wrap gap-2.5 pt-2">
              {credentials.map((credential) => (
                <span
                  key={credential}
                  className="inline-flex items-center rounded-full bg-surface border border-primary/40 text-lime-400 px-4 py-1.5 text-sm"
                >
                  {credential}
                </span>
              ))}
            </div>
          </LineReveal>
          <LineReveal delay={0.5}>
            <button
              type="button"
              className="group inline-flex items-center gap-2 rounded-full border border-primary text-primary bg-transparent px-6 py-3 text-base font-medium transition-colors duration-normal ease-out hover:bg-primary hover:text-fg-1 mt-2"
            >
              {t('aboutCta')}
              <ArrowRight
                strokeWidth={1.75}
                className={`w-4 h-4 transition-transform duration-normal ease-out ${
                  isAr
                    ? 'rotate-180 group-hover:-translate-x-1'
                    : 'group-hover:translate-x-1'
                }`}
              />
            </button>
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
