import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Noto_Sans_Arabic } from 'next/font/google'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import '../globals.css'

import { LenisProvider } from '@/providers/LenisProvider'
import { GSAPProvider } from '@/providers/GSAPProvider'
import { AuthProvider } from '@/context/AuthContext'
import { ToastHost } from '@/components/ToastHost'
import { FilmGrain } from '@/components/FilmGrain'
import CustomCursor from '@/components/CustomCursor'
import { routing } from '@/i18n/routing'

// ── Fonts ────────────────────────────────────────────────────────────
const fraunces = localFont({
  variable: '--font-fraunces',
  display: 'swap',
  src: [
    {
      path: '../fonts/Fraunces-VariableFont_SOFT_WONK_opsz_wght.ttf',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../fonts/Fraunces-Italic-VariableFont_SOFT_WONK_opsz_wght.ttf',
      weight: '100 900',
      style: 'italic',
    },
  ],
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Greenofig | Personalized Nutrition Plans — Dr. Rawan Othman',
  description:
    'Get a personalized nutrition plan from Dr. Rawan Othman, certified clinical nutritionist. Science-backed meal plans, AI food scanning, and one-on-one consultations designed specifically for your body and goals.',
  keywords: [
    'personalized nutrition plan',
    'nutritionist consultation',
    'Dr. Rawan Othman',
    'certified nutritionist',
    'custom meal plan',
    'science-backed nutrition',
    'weight loss nutritionist',
    'healthy eating plan',
    'food scanner app',
    'nutrition expert',
    'online nutritionist',
    'Greenofig',
  ],
}

export const viewport: Viewport = {
  themeColor: '#0d1a12',
  width: 'device-width',
  initialScale: 1,
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

const NUTRITIONIST_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Dr. Rawan Othman',
  jobTitle: 'Certified Clinical Nutritionist',
  worksFor: { '@type': 'Organization', name: 'Greenofig' },
  url: 'https://greenofig.com',
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  setRequestLocale(locale)
  const messages = await getMessages()

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${fraunces.variable} ${inter.variable} ${jetBrainsMono.variable} ${notoArabic.variable}`}
    >
      <body className="bg-bg text-fg-1 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <LenisProvider>
              <GSAPProvider>
                {children}
                <FilmGrain />
                <CustomCursor />
                <ToastHost />
              </GSAPProvider>
            </LenisProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(NUTRITIONIST_JSON_LD),
          }}
        />
      </body>
    </html>
  )
}
