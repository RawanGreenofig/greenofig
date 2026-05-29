'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Lock, Heart, FileText, Puzzle, ArrowRight, type LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ease } from '@/lib/tokens'
import { useAuth } from '@/context/AuthContext'

const EASE_OUT: [number, number, number, number] = [...ease.out]

/**
 * /#community marketing section. Single centered card with the
 * locked/welcome state — no fake testimonial cards in the background.
 * The Sarah/Ahmed/Layla milestone preview that used to sit behind
 * the lock was removed: invented numbers from people who don't
 * exist read as fake social proof.
 */
export function CommunitySection() {
  const t = useTranslations('marketing')
  const { user } = useAuth()
  const isLoggedIn = !!user

  return (
    <section
      id="community"
      className="relative z-10 w-full px-6 py-16 lg:py-24"
    >
      <div className="max-w-screen-xl mx-auto">
        <header className="text-center mb-10 max-w-2xl mx-auto">
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

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          viewport={{ once: true, margin: '-100px' }}
          className="rounded-2xl px-8 py-10 max-w-lg w-full mx-auto text-center"
          style={{
            background:
              'linear-gradient(135deg, rgba(132,217,61,0.06) 0%, var(--gf-surface) 60%)',
            border: '1px solid var(--gf-border)',
            boxShadow: '0 8px 32px rgba(40,90,40,0.12)',
          }}
        >
          {isLoggedIn ? (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-pill bg-lime-500/10 text-lime-500 mb-4">
                <Heart className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight text-fg-1">
                Welcome back
              </h3>
              <p className="mt-3 text-sm text-fg-2 leading-relaxed">
                Your community is waiting — pop in and say hi.
              </p>
              <Link
                href="/dashboard/community"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg px-6 py-3 text-sm font-semibold shadow-lime-glow border border-lime-600/60 hover:shadow-lime-glow-lg transition-all duration-normal ease-out"
              >
                Go to Community
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </>
          ) : (
            <>
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

              <div className="border-t border-fg-1/10 my-6" />
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                <ProofStat
                  Icon={Heart}
                  label={`500+ ${t('communityMembers')}`}
                />
                <ProofStat Icon={FileText} label={t('communityPosted')} />
                <ProofStat Icon={Puzzle} label={t('communityPrivate')} />
              </div>
            </>
          )}
        </motion.div>
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
