'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Lock, Heart, FileText, Puzzle, ArrowRight, type LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ease } from '@/lib/tokens'
import { useAuth } from '@/context/AuthContext'

const EASE_OUT: [number, number, number, number] = [...ease.out]

interface BlurMilestone {
  initials: string
  avatarBg: string
  name: string
  type: string
  metric: string
  progress: number
  accent: string
}

const MILESTONES: BlurMilestone[] = [
  {
    initials: 'SM',
    avatarBg: 'var(--gf-lime-500)',
    name: 'Sarah M.',
    type: 'Weight loss',
    metric: '−5 kg in 6 weeks',
    progress: 75,
    accent: 'var(--gf-lime-500)',
  },
  {
    initials: 'AK',
    avatarBg: 'var(--gf-amber)',
    name: 'Ahmed K.',
    type: 'Energy levels',
    metric: '4 / 10 → 8 / 10',
    progress: 60,
    accent: 'var(--gf-amber)',
  },
  {
    initials: 'LR',
    avatarBg: 'var(--gf-fig-gold)',
    name: 'Layla R.',
    type: 'Weekly goals',
    metric: '5 of 5 reached',
    progress: 100,
    accent: 'var(--gf-fig-gold)',
  },
]

export function CommunitySection() {
  const t = useTranslations('marketing')
  const { user } = useAuth()
  const isLoggedIn = !!user
  return (
    <section
      id="community"
      className="relative z-10 w-full px-6 py-16 lg:py-24 overflow-hidden"
    >
      <div className="max-w-screen-xl mx-auto">
        <header className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {t('communityEyebrow')}
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
            {t('communityHeadline')}
          </h2>
          <p className="mt-4 text-base text-fg-2">{t('communitySub')}</p>
        </header>

        {isLoggedIn ? (
          // Signed-in: no blurred lock wall — the user is already in.
          // Show a clean, full-width welcome card with the milestones
          // visible but framed as a "your community" preview.
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              viewport={{ once: true, margin: '-100px' }}
              className="rounded-2xl border border-border bg-surface px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6"
              style={{
                background:
                  'linear-gradient(135deg, rgba(132,217,61,0.06) 0%, var(--gf-surface) 60%)',
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px rgba(0,0,0,0.32)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-pill bg-lime-500/15 text-lime-400 shrink-0">
                  <Heart className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-fg-1">
                    Welcome back
                  </h3>
                  <p className="mt-1 text-sm text-fg-2">
                    Your community is waiting — pop in and say hi.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/community"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg px-6 py-3 text-sm font-semibold shadow-lime-glow border border-lime-600/60 hover:shadow-lime-glow-lg transition-all duration-normal ease-out self-start md:self-center"
              >
                Go to Community
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {MILESTONES.map((m, i) => (
                <motion.article
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.06 }}
                  viewport={{ once: true, margin: '-50px' }}
                  className="rounded-xl border border-border bg-surface p-6"
                  style={{ borderTop: `2px solid ${m.accent}` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      aria-hidden
                      className="w-10 h-10 rounded-full flex items-center justify-center text-bg text-sm font-bold"
                      style={{ background: m.avatarBg }}
                    >
                      {m.initials}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-fg-1">{m.name}</p>
                      <p className="text-xs text-fg-2">{m.type}</p>
                    </div>
                  </div>
                  <p className="font-mono text-2xl font-bold text-fg-1">
                    {m.metric}
                  </p>
                  <div className="mt-4 h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
                    <div
                      className="h-full rounded-pill"
                      style={{ width: `${m.progress}%`, background: m.accent }}
                    />
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Blurred milestones — recognizable as real content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 opacity-30 blur-md pointer-events-none select-none">
              {MILESTONES.map((m, i) => (
                <motion.article
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 6 + i,
                    ease: 'easeInOut',
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                  className="rounded-xl border border-border bg-surface p-6"
                  style={{ borderTop: `2px solid ${m.accent}` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      aria-hidden
                      className="w-10 h-10 rounded-full flex items-center justify-center text-bg text-sm font-bold"
                      style={{ background: m.avatarBg }}
                    >
                      {m.initials}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-fg-1">{m.name}</p>
                      <p className="text-xs text-fg-2">{m.type}</p>
                    </div>
                  </div>
                  <p className="font-mono text-2xl font-bold text-fg-1">
                    {m.metric}
                  </p>
                  <div className="mt-4 h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
                    <div
                      className="h-full rounded-pill"
                      style={{ width: `${m.progress}%`, background: m.accent }}
                    />
                  </div>
                </motion.article>
              ))}
            </div>

            {/* Frosted lock overlay — owns lock, headline, CTA, divider, AND stats */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
              viewport={{ once: true, margin: '-100px' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="rounded-2xl px-8 py-10 max-w-lg w-full mx-auto text-center"
                style={{
                  background: 'rgb(13 26 18 / 0.82)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgb(255 255 255 / 0.08)',
                }}
              >
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Lock className="w-6 h-6 text-lime-400" strokeWidth={1.5} />
                  <p className="inline-block text-xs font-semibold uppercase tracking-eyebrow text-amber bg-amber/15 rounded-pill px-3 py-1">
                    {t('communityLocked')}
                  </p>
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-fg-1">
                  {t('communityLockedTitle')}
                </h3>
                <p className="mt-3 text-sm text-fg-2 leading-relaxed">
                  {t('communityLockedBody')}
                </p>
                <Link
                  href="/sign-up"
                  className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg px-6 py-3 text-sm font-semibold shadow-lime-glow border border-lime-600/60 hover:shadow-lime-glow-lg transition-all duration-normal ease-out"
                >
                  {t('communityLockedCta')}
                </Link>
                <div className="mt-3 text-xs text-fg-3">
                  <Link
                    href="/sign-in"
                    className="hover:text-lime-400 transition-colors"
                  >
                    {t('communityLockedSignIn')}
                  </Link>
                </div>

                {/* Divider + social-proof stats — INSIDE the overlay */}
                <div className="border-t border-fg-1/10 my-6" />
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                  <ProofStat
                    Icon={Heart}
                    label={`500+ ${t('communityMembers')}`}
                  />
                  <ProofStat Icon={FileText} label={t('communityPosted')} />
                  <ProofStat Icon={Puzzle} label={t('communityPrivate')} />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  )
}

function ProofStat({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 text-fg-2">
      <Icon className="w-5 h-5 text-lime-400" strokeWidth={1.75} />
      <span className="text-xs uppercase tracking-eyebrow font-medium">
        {label}
      </span>
    </div>
  )
}
