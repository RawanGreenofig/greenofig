import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { HeroSequence } from '@/components/HeroSequence'
import { CapacitorHomeGate } from '@/components/CapacitorHomeGate'
import { SiteHeader } from '@/components/SiteHeader'
import { StatsSection } from '@/components/sections/StatsSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { ServicesSection } from '@/components/sections/ServicesSection'
import { ReviewsSection } from '@/components/sections/ReviewsSection'
import { CommunitySection } from '@/components/sections/CommunitySection'
import { StoreSection } from '@/components/sections/StoreSection'
import { DownloadSection } from '@/components/sections/DownloadSection'
import { ConsultationQuiz } from '@/components/sections/ConsultationQuiz'
import { FooterSection } from '@/components/sections/FooterSection'

interface PageProps {
  params: { locale: string }
}

export const metadata: Metadata = {
  alternates: { canonical: 'https://greenofig.com/' },
  openGraph: { url: 'https://greenofig.com/' },
}

/**
 * Marketing homepage. Section order follows the AIDA flow:
 * hero → stats → about → services → reviews → community → store → booking → footer.
 */
export default function Home({ params }: PageProps) {
  setRequestLocale(params.locale)

  return (
    <main className="bg-bg">
      {/* Skip the marketing homepage entirely when the visitor is
          inside the Capacitor Android app — they don't need the
          download page, they're already in the app. Renders a
          splash + redirects to /dashboard or /sign-in. No-op in a
          regular browser. */}
      <CapacitorHomeGate />
      <SiteHeader />
      <HeroSequence />
      <StatsSection />
      <AboutSection />
      <ServicesSection />
      <ReviewsSection />
      <CommunitySection />
      <StoreSection />
      <DownloadSection />
      <ConsultationQuiz />
      <FooterSection />
    </main>
  )
}
