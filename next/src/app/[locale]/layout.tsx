import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Noto_Sans_Arabic, Cormorant } from 'next/font/google'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'

import '../globals.css'

import { LenisProvider } from '@/providers/LenisProvider'
import { GSAPProvider } from '@/providers/GSAPProvider'
import { CapacitorMotionGate } from '@/providers/CapacitorMotionGate'
import { CapacitorAuthListener } from '@/components/CapacitorAuthListener'
import { CapacitorPushRegistration } from '@/components/CapacitorPushRegistration'
import { CapacitorLocalNotifications } from '@/components/CapacitorLocalNotifications'
import { AuthProvider } from '@/context/AuthContext'
import { ToastHost } from '@/components/ToastHost'
import { FilmGrain } from '@/components/FilmGrain'
import { MaintenanceBanner } from '@/components/MaintenanceBanner'
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

// Brand wordmark font (Cormorant — elegant high-contrast serif).
const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  // metadataBase makes every relative URL inside this Metadata
  // (canonical, openGraph.url, openGraph.images, etc) resolve to
  // the production origin. Without it Next emits "vercel.app"
  // URLs for previews which leak into Google's index.
  metadataBase: new URL('https://greenofig.com'),
  title: 'Greenofig | Personalized Nutrition Plans — Nutrition Coach Rawan Othman',
  description:
    'Get a personalized nutrition plan from Nutrition Coach Rawan Othman, certified clinical nutritionist. Science-backed meal plans, AI food scanning, and one-on-one consultations designed specifically for your body and goals.',
  applicationName: 'Greenofig',
  keywords: [
    'personalized nutrition plan',
    'nutritionist consultation',
    'Nutrition Coach Rawan Othman',
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
  // Tell crawlers this site is open for business. We use the explicit
  // index/follow shape instead of relying on defaults so the directive
  // shows up in page source where Google's URL Inspector can confirm.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Hreflang alternates for the en/ar split. We intentionally do
  // NOT set a global canonical here — layout metadata is inherited
  // by every page, so a layout-level canonical of "/" would tell
  // Google that /blog, /about, /pricing etc are all duplicates of
  // the homepage. Each page sets its own canonical via its own
  // metadata block.
  alternates: {
    languages: {
      en: 'https://greenofig.com/',
      ar: 'https://greenofig.com/ar',
      'x-default': 'https://greenofig.com/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Greenofig',
    url: 'https://greenofig.com/',
    title: 'Greenofig | Personalized Nutrition Plans — Nutrition Coach Rawan Othman',
    description:
      'Science-backed nutrition coaching from Nutrition Coach Rawan Othman, certified clinical nutritionist. Personalized meal plans, AI food scanning, 1-on-1 consultations.',
    locale: 'en_US',
    images: [
      {
        url: '/images/dr-rawan-othman.jpg',
        width: 1200,
        height: 630,
        alt: 'Nutrition Coach Rawan Othman — Certified Clinical Nutritionist',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Greenofig | Personalized Nutrition Plans — Nutrition Coach Rawan Othman',
    description:
      'Science-backed nutrition coaching from Nutrition Coach Rawan Othman. Personalized meal plans, AI food scanning, 1-on-1 consultations.',
    images: ['/images/dr-rawan-othman.jpg'],
  },
  // Next 13+ auto-detects src/app/favicon.ico, but be explicit so any
  // CDN / browser doesn't fall back to a stale cached default. The
  // multi-size set in /public/logo/ (16, 32, apple, android 192/512)
  // covers iOS home-screen and Android PWA install icons.
  // Order matters — first entry wins in most browsers. Lead with the
  // explicit PNG paths so a stale cached favicon.ico can't keep
  // serving the old image. The .ico fallbacks stay for legacy bots.
  icons: {
    icon: [
      { url: '/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/logo/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/logo/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo/apple-touch-icon.png',
  },
  // Google Search Console domain verification — emits the
  // <meta name="google-site-verification" content="..."> tag in <head>.
  verification: {
    google: 'WdvkxsKC5KThyVfnh5WhkcliKeuCELyTTxO3eDOR_JU',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d1a12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

// Google Analytics 4 measurement id. Public by design (it's visible
// in the page source). Allow an env override so a staging deploy can
// point at a separate property; falls back to the prod stream id.
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? 'G-SYXCWBYXPB'

// Three structured-data entities in one @graph so Google sees them
// as related, not three independent things — boosts the chance of a
// brand knowledge panel for "greenofig".
const SITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://greenofig.com/#organization',
      name: 'Greenofig',
      url: 'https://greenofig.com',
      logo: 'https://greenofig.com/logo.png',
      sameAs: [
        'https://instagram.com/greenofig',
        'https://x.com/greenofig',
        'https://linkedin.com/company/greenofig',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://greenofig.com/#website',
      url: 'https://greenofig.com',
      name: 'Greenofig',
      description:
        'Science-backed personalized nutrition coaching from Nutrition Coach Rawan Othman.',
      publisher: { '@id': 'https://greenofig.com/#organization' },
      inLanguage: ['en', 'ar'],
    },
    {
      '@type': 'Person',
      '@id': 'https://greenofig.com/#coach-rawan',
      name: 'Nutrition Coach Rawan Othman',
      jobTitle: 'Certified Clinical Nutritionist',
      worksFor: { '@id': 'https://greenofig.com/#organization' },
      url: 'https://greenofig.com',
      image: 'https://greenofig.com/images/dr-rawan-othman.jpg',
    },
  ],
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
      className={`${fraunces.variable} ${inter.variable} ${jetBrainsMono.variable} ${notoArabic.variable} ${cormorant.variable}`}
    >
      <body className="bg-bg text-fg-1 antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <LenisProvider>
              <GSAPProvider>
                <CapacitorMotionGate>
                  <CapacitorAuthListener />
                  <CapacitorPushRegistration />
                  <CapacitorLocalNotifications />
                  <MaintenanceBanner />
                  {children}
                  <FilmGrain />
                  <ToastHost />
                </CapacitorMotionGate>
              </GSAPProvider>
            </LenisProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        <Analytics />
        {/* Google Analytics 4 — fires pageviews + lets us pull live
            traffic from the GA Data API in /admin/analytics. The
            `afterInteractive` strategy means the tag loads after the
            page is interactive so it doesn't block first paint. */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(SITE_JSON_LD),
          }}
        />
      </body>
    </html>
  )
}
