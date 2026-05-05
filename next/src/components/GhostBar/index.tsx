'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'
import { cn } from '@/lib/cn'

/**
 * Minimal floating top bar that appears once the user scrolls past the
 * hero. Watches a `[data-ghostbar-sentinel]` div placed at the bottom of
 * the hero section and toggles visibility based on its viewport state.
 *
 * Hidden entirely for authenticated users — they belong on a dashboard.
 */
export function GhostBar() {
  const t = useTranslations('nav')
  const { user, isLoading } = useUser()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Ghostbar appears once we've scrolled past the hero pin (100vh + 500vh).
    // Using a scroll-position threshold instead of IntersectionObserver because
    // Lenis's transform-based smooth scroll doesn't reliably fire IO entries
    // on programmatic jumps.
    const onScroll = () => {
      const threshold = window.innerHeight * 0.6 // show after first 60vh of scroll
      setVisible(window.scrollY > threshold)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!isLoading && user) return null

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all ease-out',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-2 pointer-events-none',
      )}
      style={{
        transitionDuration: 'var(--dur-normal)',
        background: visible ? 'rgb(6 13 9 / 0.75)' : 'transparent',
        backdropFilter: visible ? 'blur(12px)' : 'none',
        WebkitBackdropFilter: visible ? 'blur(12px)' : 'none',
        borderBottom: visible
          ? '1px solid rgb(240 237 230 / 0.05)'
          : '1px solid transparent',
      }}
    >
      <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" aria-label="Greenofig">
          <Wordmark size="md" />
        </Link>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center min-h-[40px] rounded-full border border-lime-500 text-lime-500 px-5 text-sm font-semibold hover:bg-lime-500 hover:text-bg transition-colors duration-fast ease-out"
          >
            {t('signIn')}
          </Link>
        </div>
      </div>
    </div>
  )
}
