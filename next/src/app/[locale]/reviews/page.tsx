import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { ReviewsBrowser } from '@/components/reviews/ReviewsBrowser'
import { SiteHeader } from '@/components/SiteHeader'
import { FooterSection } from '@/components/sections/FooterSection'

export const metadata: Metadata = {
  title: 'Customer reviews | Greenofig',
  description:
    'Read real reviews from Greenofig members and share your own experience. Star ratings, photos, and detailed feedback from people working with our certified clinical nutritionists.',
}

export default function ReviewsPage({
  params,
}: {
  params: { locale: string }
}) {
  setRequestLocale(params.locale)
  return (
    <main className="bg-bg min-h-screen">
      <SiteHeader />
      <div className="h-16" />
      <ReviewsBrowser />
      <FooterSection />
    </main>
  )
}
