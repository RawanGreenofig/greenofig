'use client'

import { useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'

const LABELS: Record<Locale, string> = {
  en: 'EN',
  ar: 'ع',
}

const STORAGE_KEY = 'greenofig.locale'
const COOKIE_NAME = 'NEXT_LOCALE'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // one year

/**
 * EN | ع toggle. Persists choice to cookie + localStorage so the
 * preference sticks across visits. When auth lands (Cluster C) this
 * also writes `profiles.preferred_locale` for signed-in users.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('languageSwitcher')
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const persist = (next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* localStorage may be unavailable in private modes */
    }
    document.cookie = `${COOKIE_NAME}=${next}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  }

  const switchTo = (next: Locale) => {
    if (next === locale) return
    persist(next)
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div
      role="group"
      aria-label={t('switchTo', { language: '' }).trim() || 'Language'}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {routing.locales.map((code) => {
        const isActive = code === locale
        return (
          <button
            key={code}
            type="button"
            onClick={() => switchTo(code)}
            aria-pressed={isActive}
            aria-label={t('switchTo', {
              language: code === 'en' ? t('english') : t('arabic'),
            })}
            className="text-xs font-semibold transition-colors duration-fast ease-out"
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.12)',
              background: isActive
                ? 'rgba(255,255,255,0.18)'
                : 'rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => {
              if (!isActive)
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
            }}
            onMouseLeave={(e) => {
              if (!isActive)
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            }}
          >
            {LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
