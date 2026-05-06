'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'

/**
 * Persistent site header shown on standalone pages (pricing, blog,
 * legal, etc). Always visible — unlike GhostBar which only shows on
 * the marketing homepage after scroll.
 *
 * Logo links to "/", with quick nav links and a sign-in CTA.
 */
export function SiteHeader() {
  const t = useTranslations('nav')
  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{
        background: '#0d1a12',
        borderColor: 'rgb(240 237 230 / 0.05)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <Link href="/" aria-label="Greenofig">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="hidden md:inline-flex items-center text-sm font-medium text-fg-2 hover:text-lime-400 transition-colors"
          >
            {t('pricing')}
          </Link>
          <Link
            href="/blog"
            className="hidden md:inline-flex items-center text-sm font-medium text-fg-2 hover:text-lime-400 transition-colors"
          >
            {t('blog')}
          </Link>
          <LanguageSwitcher />
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center min-h-[40px] rounded-full border border-lime-500 text-lime-500 px-5 text-sm font-semibold hover:bg-lime-500 hover:text-bg transition-colors"
          >
            {t('signIn')}
          </Link>
        </div>
      </div>
    </header>
  )
}
