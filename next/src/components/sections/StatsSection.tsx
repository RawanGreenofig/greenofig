'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { ease } from '@/lib/tokens'

const EASE_OUT: [number, number, number, number] = [...ease.out]

interface Stat {
  value: number
  format: (n: number) => string
  labelKey: 'statsClients' | 'statsYears' | 'statsSatisfaction' | 'statsAdditives'
}

const STATS: Stat[] = [
  { value: 2400, format: (n) => `${n.toLocaleString()}+`, labelKey: 'statsClients' },
  { value: 3, format: (n) => `${n}`, labelKey: 'statsYears' },
  { value: 98, format: (n) => `${n}%`, labelKey: 'statsSatisfaction' },
  { value: 0, format: () => '0g', labelKey: 'statsAdditives' },
]

export function StatsSection() {
  return (
    <section
      id="stats"
      className="relative z-10 w-full bg-surface py-16 lg:py-24"
    >
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 lg:divide-x lg:divide-border rtl:lg:divide-x-reverse">
          {STATS.map((stat, idx) => (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: idx * 0.1 }}
              viewport={{ once: true, margin: '-50px' }}
              className="text-center px-4"
            >
              <StatNumber value={stat.value} format={stat.format} />
              <Label labelKey={stat.labelKey} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatNumber({
  value,
  format,
}: {
  value: number
  format: (n: number) => string
}) {
  const { ref, value: current } = useCountUp<HTMLDivElement>({
    target: value,
    duration: 2000,
  })
  return (
    <div
      ref={ref}
      className="font-mono font-bold text-5xl lg:text-6xl text-lime-400 tracking-tight"
      // Always render LTR — Arabic numerals are still western digits in MSA UI
      dir="ltr"
    >
      {value === 0 ? format(0) : format(current)}
    </div>
  )
}

function Label({
  labelKey,
}: {
  labelKey: 'statsClients' | 'statsYears' | 'statsSatisfaction' | 'statsAdditives'
}) {
  const t = useTranslations('marketing')
  return (
    <p className="mt-3 text-xs uppercase tracking-eyebrow text-fg-2 font-medium">
      {t(labelKey)}
    </p>
  )
}
