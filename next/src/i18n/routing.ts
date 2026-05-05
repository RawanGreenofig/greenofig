import { defineRouting } from 'next-intl/routing'

/**
 * GreenoFig is bilingual: English (default) and Arabic (RTL).
 * URL strategy: `as-needed` — English at /dashboard, Arabic at /ar/dashboard.
 */
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
