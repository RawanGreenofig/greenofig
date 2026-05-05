'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  Rocket,
  BookOpen,
  Camera,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import { ease } from '@/lib/tokens'

const EASE_OUT: [number, number, number, number] = [...ease.out]

interface Service {
  Icon: LucideIcon
  iconColor: string
  topColor: string
  titleKey:
    | 'service1Title'
    | 'service2Title'
    | 'service3Title'
    | 'service4Title'
  bodyKey: 'service1Body' | 'service2Body' | 'service3Body' | 'service4Body'
}

const SERVICES: Service[] = [
  { Icon: Rocket,     iconColor: 'var(--gf-lime-400)', topColor: 'var(--gf-primary)',   titleKey: 'service1Title', bodyKey: 'service1Body' },
  { Icon: BookOpen,   iconColor: 'var(--gf-amber)',    topColor: 'var(--gf-amber)',     titleKey: 'service2Title', bodyKey: 'service2Body' },
  { Icon: Camera,     iconColor: 'var(--gf-berry)',    topColor: 'var(--gf-berry)',     titleKey: 'service3Title', bodyKey: 'service3Body' },
  { Icon: CreditCard, iconColor: 'var(--gf-fig-gold)', topColor: 'var(--gf-fig-gold)',  titleKey: 'service4Title', bodyKey: 'service4Body' },
]

export function ServicesSection() {
  const t = useTranslations('marketing')
  return (
    <section
      id="services"
      className="relative z-10 w-full px-6 py-16 lg:py-24"
    >
      <div className="max-w-screen-xl mx-auto">
        <header className="text-center mb-12">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {t('servicesEyebrow')}
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
            {t('servicesHeadline')}
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SERVICES.map((service, idx) => {
            const Icon = service.Icon
            return (
              <motion.article
                key={service.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: EASE_OUT,
                  delay: idx * 0.12,
                }}
                viewport={{ once: true, margin: '-80px' }}
                className="group rounded-xl border border-border bg-surface p-6 transition-all duration-normal ease-out hover:-translate-y-1 hover:shadow-glow"
                style={{ borderTop: `2px solid ${service.topColor}` }}
              >
                <Icon
                  className="w-12 h-12"
                  strokeWidth={1.5}
                  style={{ color: service.iconColor }}
                />
                <h3 className="mt-5 text-h4 font-semibold text-fg-1">
                  {t(service.titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-2">
                  {t(service.bodyKey)}
                </p>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
