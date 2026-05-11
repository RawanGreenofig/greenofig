import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Greenofig — Personalized Nutrition Plans',
  description:
    'See Greenofig pricing for personalized nutrition coaching with Nutrition Coach Rawan Othman — Free, Basic, Premium, and VIP plans with meal plans, AI food scanning, and 1-on-1 consultations.',
  alternates: { canonical: 'https://greenofig.com/pricing' },
  openGraph: {
    url: 'https://greenofig.com/pricing',
    title: 'Pricing | Greenofig — Personalized Nutrition Plans',
    description:
      'Free, Basic, Premium, and VIP nutrition coaching plans with Nutrition Coach Rawan Othman.',
    type: 'website',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
