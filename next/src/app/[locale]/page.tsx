import { setRequestLocale } from 'next-intl/server'
import { HeroSequence } from '@/components/HeroSequence'
import { SiteHeader } from '@/components/SiteHeader'
import { StatsSection } from '@/components/sections/StatsSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { ServicesSection } from '@/components/sections/ServicesSection'
import { ReviewsSection } from '@/components/sections/ReviewsSection'
import { CommunitySection } from '@/components/sections/CommunitySection'
import { StoreSection } from '@/components/sections/StoreSection'
import { ConsultationQuiz } from '@/components/sections/ConsultationQuiz'
import { FooterSection } from '@/components/sections/FooterSection'

interface PageProps {
  params: { locale: string }
}

/**
 * Marketing homepage. Section order follows the AIDA flow:
 * hero → stats → about → services → reviews → community → store → booking → footer.
 */
export default function Home({ params }: PageProps) {
  setRequestLocale(params.locale)

  return (
    <main className="bg-bg">
      <SiteHeader />
      <HeroSequence />
      <StatsSection />
      <AboutSection />
      <ServicesSection />
      <ReviewsSection />
      <CommunitySection />
      <StoreSection />
      <ConsultationQuiz />
      <FooterSection />
    </main>
  )
}
