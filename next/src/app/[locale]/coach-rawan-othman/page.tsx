import type { Metadata } from 'next'
import Image from 'next/image'
import { getLocale, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { NUTRITIONIST } from '@/lib/tokens'
import { SiteHeader } from '@/components/SiteHeader'
import { FooterSection } from '@/components/sections/FooterSection'
import { BLOG_ARTICLES } from '@/lib/blog-seed'

export const metadata: Metadata = {
  title: 'Nutrition Coach Rawan Othman | Certified Nutritionist | Greenofig',
  description:
    'Meet Nutrition Coach Rawan Othman, head coach at Greenofig and certified nutritionist. 3 years of practice, 500+ clients, evidence-based personalized nutrition.',
  alternates: { canonical: 'https://greenofig.com/coach-rawan-othman' },
  openGraph: {
    url: 'https://greenofig.com/coach-rawan-othman',
    title: 'Nutrition Coach Rawan Othman | Certified Nutritionist',
    description:
      '3 years of practice, 500+ clients, evidence-based personalized nutrition. Head coach of the Greenofig team.',
    type: 'profile',
    images: [
      {
        url: '/images/dr-rawan-othman.jpg',
        width: 1200,
        height: 630,
        alt: 'Nutrition Coach Rawan Othman — Certified Nutritionist',
      },
    ],
  },
}

interface PageProps {
  params: { locale: string }
}

/**
 * /coach-rawan-othman — dedicated author profile page. Separate SEO
 * target that ranks for branded searches like "Nutrition Coach Rawan Othman"
 * and "Greenofig nutritionist". Also the destination for the byline
 * link on every blog article author card.
 */
export default async function CoachRawanPage({ params }: PageProps) {
  setRequestLocale(params.locale)
  const locale = (await getLocale()) as 'en' | 'ar'
  const isAr = locale === 'ar'

  const recentArticles = BLOG_ARTICLES.slice(0, 3)

  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: NUTRITIONIST.name,
    alternateName: NUTRITIONIST.nameAr,
    jobTitle: NUTRITIONIST.role.split('·')[0].trim(),
    description: NUTRITIONIST.bio.long,
    image: 'https://greenofig.com/images/dr-rawan-othman.jpg',
    url: 'https://greenofig.com/coach-rawan-othman',
    worksFor: {
      '@type': 'Organization',
      name: 'Greenofig',
      url: 'https://greenofig.com',
    },
    hasCredential: NUTRITIONIST.credentials.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c,
    })),
    knowsAbout: [
      'Personalized nutrition',
      'Personalized meal planning',
      'Weight management',
      'Sports nutrition',
      'Sustainable healthy eating',
    ],
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--gf-bg)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <SiteHeader />
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero — compact so the name, role, and CTAs fit one viewport
            on most laptops without scrolling. */}
        <header className="flex flex-row items-center md:items-start gap-5 md:gap-6">
          <div
            className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden bg-surface-raised shrink-0"
            style={{
              boxShadow:
                '0 0 0 1px var(--gf-border), 0 0 0 4px rgba(132,217,61,0.12), 0 12px 28px rgba(0,0,0,0.28)',
            }}
          >
            <Image
              src="/images/dr-rawan-othman.jpg"
              alt={isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
              width={112}
              height={112}
              className="w-full h-full object-cover object-top"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
              {isAr ? 'فريق غرينوفيغ' : 'Greenofig Team'}
            </p>
            <h1
              className="mt-1.5 font-display font-bold text-fg-1 tracking-tight inline-flex items-center gap-2 flex-wrap"
              style={{
                fontSize: 'clamp(22px, 3.5vw, 36px)',
                lineHeight: 1.1,
                fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
              }}
            >
              {isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
              <BadgeCheck className="w-5 h-5 md:w-6 md:h-6 text-lime-400 shrink-0" strokeWidth={2} />
            </h1>
            <p className="mt-1.5 text-sm md:text-base text-fg-2">
              {isAr ? NUTRITIONIST.roleAr : NUTRITIONIST.role}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href="/#booking"
                className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm border border-lime-600/60 transition-all hover:brightness-110"
                style={{ boxShadow: '0 6px 22px rgba(132,217,61,0.28)' }}
              >
                {isAr ? 'احجز استشارة' : 'Book a consultation'}
                <ArrowRight
                  className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center gap-1.5 rounded-pill border border-border h-10 px-5 text-sm font-semibold text-fg-1 hover:border-lime-400/50 hover:text-lime-400 transition-colors"
                style={{ background: 'var(--gf-input-bg)' }}
              >
                {isAr ? 'اقرأ المقالات' : 'Read the articles'}
              </Link>
            </div>
          </div>
        </header>

        {/* Bio */}
        <section className="mt-8 md:mt-10 max-w-3xl">
          <h2 className="font-display font-bold text-2xl text-fg-1 mb-4">
            {isAr ? 'عن كوتش التغذية روان' : 'About Nutrition Coach Rawan'}
          </h2>
          <p className="text-base md:text-lg text-fg-2 leading-relaxed">
            {isAr ? NUTRITIONIST.bio.longAr : NUTRITIONIST.bio.long}
          </p>
        </section>

        {/* Credentials */}
        <section className="mt-8 max-w-3xl">
          <h2 className="font-display font-bold text-2xl text-fg-1 mb-4">
            {isAr ? 'الخبرات والشهادات' : 'Credentials & experience'}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {(isAr ? NUTRITIONIST.credentialsAr : NUTRITIONIST.credentials).map(
              (c) => (
                <li
                  key={c}
                  className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-1"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(132,217,61,0.05) 0%, var(--gf-surface) 60%)',
                  }}
                >
                  <BadgeCheck
                    className="w-4 h-4 text-lime-400 mb-2"
                    strokeWidth={1.75}
                  />
                  {c}
                </li>
              ),
            )}
          </ul>
        </section>

        {/* Areas of expertise */}
        <section className="mt-8 max-w-3xl">
          <h2 className="font-display font-bold text-2xl text-fg-1 mb-4">
            {isAr ? 'مجالات التخصص' : 'Areas of expertise'}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(isAr
              ? [
                  'التغذية',
                  'تخطيط الوجبات الشخصية',
                  'إدارة الوزن',
                  'تغذية الرياضيين',
                  'العادات الغذائية المستدامة',
                ]
              : [
                  'Personalized nutrition',
                  'Personalized meal planning',
                  'Weight management',
                  'Sports nutrition',
                  'Sustainable healthy eating',
                ]
            ).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-xs font-medium text-fg-1 rounded-pill h-8 px-3"
                style={{
                  background: 'rgba(132,217,61,0.08)',
                  border: '1px solid rgba(132,217,61,0.25)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Recent articles */}
        {recentArticles.length > 0 && (
          <section className="mt-8 max-w-3xl">
            <h2 className="font-display font-bold text-2xl text-fg-1 mb-4">
              {isAr ? 'مقالات حديثة' : 'Recent articles'}
            </h2>
            <ul className="space-y-2.5">
              {recentArticles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/blog/${a.slug}` as `/blog/${string}`}
                    className="group flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3 transition-colors hover:border-lime-400/40"
                    style={{ background: 'var(--gf-surface)' }}
                  >
                    <span className="text-sm text-fg-1 group-hover:text-lime-400 transition-colors">
                      {isAr ? a.titleAr : a.title}
                    </span>
                    <ArrowRight
                      className={`w-4 h-4 text-fg-3 group-hover:text-lime-400 transition-colors shrink-0 mt-0.5 ${isAr ? 'rotate-180' : ''}`}
                      strokeWidth={1.75}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <section
          className="mt-10 rounded-2xl p-7 md:p-8 text-center max-w-3xl mx-auto"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(132,217,61,0.08) 0%, var(--gf-surface) 60%)',
            border: '1px solid rgba(132,217,61,0.35)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
          }}
        >
          <h2 className="font-display font-bold text-2xl md:text-3xl text-fg-1 mb-3 tracking-tight">
            {isAr
              ? 'ابدأ رحلتك مع كوتش التغذية روان'
              : 'Start your journey with Nutrition Coach Rawan'}
          </h2>
          <p className="text-fg-2 mb-6 max-w-md mx-auto">
            {isAr
              ? '٣٠ دقيقة. ١-١. مجاناً للعملاء الجدد.'
              : '30 minutes. 1-on-1. Free for new clients.'}
          </p>
          <Link
            href="/#booking"
            className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-12 px-7 text-base border border-lime-600/60 transition-all hover:brightness-110"
            style={{ boxShadow: '0 8px 28px rgba(132,217,61,0.32)' }}
          >
            {isAr ? 'احجز استشارة' : 'Book a consultation'}
            <ArrowRight
              className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`}
              strokeWidth={2}
            />
          </Link>
        </section>
      </div>

      <FooterSection />
    </main>
  )
}
