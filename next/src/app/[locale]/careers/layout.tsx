import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers | Greenofig — Join the nutrition team',
  description:
    'Open roles at Greenofig. Join Nutrition Coach Rawan Othman and the coaching team building the most personal, science-led nutrition platform in the region.',
  alternates: { canonical: 'https://greenofig.com/careers' },
  openGraph: {
    url: 'https://greenofig.com/careers',
    title: 'Careers | Greenofig — Join the nutrition team',
    description:
      'Open roles at Greenofig. Help build the most personal, science-led nutrition platform in the region.',
    type: 'website',
  },
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
