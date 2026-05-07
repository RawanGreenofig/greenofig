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
      className={cn('inline-flex items-center rounded-full p-0.5', className)}
      style={{
        background: 'hsl(var(--secondary, 220 10% 25%))',
        border: '1px solid hsl(var(--border, 220 10% 25%))',
        flexShrink: 0,
      }}
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
            className="px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              border: 'none',
              cursor: isActive ? 'default' : 'pointer',
              background: isActive
                ? 'hsl(var(--card, 220 15% 15%))'
                : 'transparent',
              color: isActive
                ? 'hsl(var(--foreground, 220 10% 95%))'
                : 'hsl(var(--muted-foreground, 220 10% 65%))',
              userSelect: 'none',
            }}
          >
            {LABELS[code]}
          </button>
        )
      })}
    </div>
  )
}
