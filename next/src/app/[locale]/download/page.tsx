import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/SiteHeader'
import { FooterSection } from '@/components/sections/FooterSection'
import { DownloadSection } from '@/components/sections/DownloadSection'

interface PageProps {
  params: { locale: string }
}

export const metadata: Metadata = {
  title: 'Download | Greenofig — Android APK + iPhone Home Screen install',
  description:
    'Download the Greenofig nutrition coach for Android, or add the web app to your iPhone Home Screen in four taps. Direct install, no app store wait.',
  alternates: { canonical: 'https://greenofig.com/download' },
  openGraph: {
    url: 'https://greenofig.com/download',
    title: 'Download the Greenofig App',
    description:
      'Direct Android APK download or one-tap iPhone Home Screen install. Take your nutrition coach with you.',
    type: 'website',
  },
}

/**
 * /download — dedicated download page. Reuses the same
 * DownloadSection component as the homepage so both surfaces stay
 * in sync.
 */
export default function DownloadPage({ params }: PageProps) {
  setRequestLocale(params.locale)
  return (
    <main className="min-h-screen" style={{ background: 'var(--gf-bg)' }}>
      <SiteHeader />
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />
      <div className="py-10 md:py-16 px-6">
        <DownloadSection withSectionChrome={false} />
      </div>
      <FooterSection />
    </main>
  )
}
