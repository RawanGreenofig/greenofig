'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'

/**
 * Premium split-screen auth shell.
 * - Left column (md+): mid-sequence hero frame with overlay, brand
 *   wordmark top, brand quote center, trust stats bottom.
 * - Right column: dark form area on `bg-bg`, max-w-md, with logo +
 *   children + language switcher.
 *
 * On mobile the left column collapses; the form column gets a low-opacity
 * frame backdrop so the visual register stays consistent.
 */
export function AuthSplitShell({
  quoteKey,
  children,
}: {
  quoteKey: 'quoteSignInBody' | 'quoteSignUpBody' | 'quoteForgotBody'
  children: ReactNode
}) {
  const t = useTranslations('auth')
  const tStats = useTranslations('marketing')

  return (
    <div className="flex min-h-screen w-full">
      {/* ── Left — image + overlay + brand ─────────────────────── */}
      <aside className="hidden md:flex md:w-[55%] relative overflow-hidden">
        <Image
          src="/frames/frame020.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 55vw, 0px"
          className="object-cover"
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(13,26,18,0.75) 0%, rgba(13,26,18,0.45) 100%)',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full p-12 lg:p-16">
          <Link href="/" aria-label="Greenofig">
            <Wordmark size="lg" />
          </Link>

          <div className="max-w-md">
            <p
              className="font-display italic text-fg-1"
              style={{
                fontSize: '1.4rem',
                lineHeight: 1.5,
                fontVariationSettings:
                  "'opsz' 96, 'wght' 500, 'SOFT' 100, 'WONK' 1",
              }}
            >
              &ldquo;{t(quoteKey)}&rdquo;
            </p>
            <p
              className="mt-4 text-xs"
              style={{ color: 'rgba(240,237,230,0.55)' }}
            >
              {t('quoteAttribution')}
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-x-6 gap-y-4 text-fg-1">
            <Stat number="2,400+" label={tStats('statsClients')} />
            <span aria-hidden className="w-px self-stretch bg-fg-1/15" />
            <Stat number="98%" label={tStats('statsSatisfaction')} />
            <span aria-hidden className="w-px self-stretch bg-fg-1/15" />
            <Stat number="3" label={tStats('statsYears')} />
          </div>
        </div>
      </aside>

      {/* ── Right — form column ─────────────────────────────────── */}
      <main className="relative w-full md:w-[45%] flex flex-col items-center justify-center bg-bg p-6 md:p-12">
        {/* Mobile-only ambient frame backdrop */}
        <div aria-hidden className="md:hidden absolute inset-0 -z-10">
          <Image
            src="/frames/frame020.jpg"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-bg/85" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Large prominent logo — uses the shared Wordmark so font +
              colors stay in sync with the rest of the site. */}
          <Link
            href="/"
            aria-label="Greenofig"
            className="mb-10 flex items-center justify-center md:justify-start"
          >
            <Wordmark size="lg" />
          </Link>

          {children}

          <div className="mt-8 flex justify-center">
            <LanguageSwitcher />
          </div>
        </div>
      </main>
    </div>
  )
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="px-1">
      <p
        className="font-mono font-bold text-lime-400"
        style={{ fontSize: '1.25rem' }}
        dir="ltr"
      >
        {number}
      </p>
      <p
        className="mt-1 text-xs uppercase tracking-eyebrow"
        style={{ color: 'rgba(240,237,230,0.5)' }}
      >
        {label}
      </p>
    </div>
  )
}
