import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Mail, ArrowRight } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader'
import { FooterSection } from '@/components/sections/FooterSection'
import { ContactForm } from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact | Greenofig',
  description:
    'Get in touch with Greenofig — questions about plans, billing, or your nutrition journey. We typically reply within one business day.',
  alternates: { canonical: 'https://greenofig.com/contact' },
  openGraph: {
    url: 'https://greenofig.com/contact',
    title: 'Contact | Greenofig',
    description:
      'Questions about plans, billing, or your nutrition journey? Send us a note — we reply within one business day.',
    type: 'website',
  },
}

export default function ContactPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  const title = isAr ? 'تواصل معنا' : 'Contact us'
  const subtitle = isAr
    ? 'نحن هنا للمساعدة. نرد عادةً خلال يوم عمل واحد.'
    : 'We’re here to help. We typically reply within one business day.'

  return (
    <main className="min-h-screen" style={{ background: 'var(--gf-bg)' }}>
      <SiteHeader />
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <header className="max-w-2xl mb-10 md:mb-12">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {isAr ? 'تواصل' : 'Contact'}
          </p>
          <h1
            className="mt-2 font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(32px, 4.5vw, 48px)',
              lineHeight: 1.1,
              fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {title}
          </h1>
          <p className="mt-3 text-base md:text-lg text-fg-2">{subtitle}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Form (primary) */}
          <ContactForm isAr={isAr} />

          {/* Direct contact options (secondary) */}
          <aside className="space-y-4">
            <EmailCard
              label={isAr ? 'صحة وتغذية' : 'Health & nutrition'}
              hint={
                isAr
                  ? 'أسئلة عن خطتك، أو مكالمتك التعريفية.'
                  : 'Questions about your plan or your free intro call.'
              }
              email="health@greenofig.com"
            />
            <EmailCard
              label={isAr ? 'الدعم العام' : 'General support'}
              hint={
                isAr
                  ? 'فوترة، حساب، أو أي استفسار آخر.'
                  : 'Billing, your account, or anything else.'
              }
              email="support@greenofig.com"
            />
            <EmailCard
              label={isAr ? 'الوظائف' : 'Careers'}
              hint={
                isAr
                  ? 'تقدم بطلب للانضمام إلى فريق Greenofig.'
                  : 'Apply to join the Greenofig team.'
              }
              email="careers@greenofig.com"
            />

            <Link
              href="/#booking"
              className="block rounded-2xl p-5 transition-all hover:-translate-y-px"
              style={{
                background:
                  'radial-gradient(circle at 50% 0%, rgba(132,217,61,0.08) 0%, var(--gf-surface) 60%)',
                border: '1px solid rgba(132,217,61,0.35)',
              }}
            >
              <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
                {isAr ? 'ابدأ رحلتك' : 'Start your journey'}
              </p>
              <p className="mt-1.5 text-sm font-semibold text-fg-1">
                {isAr ? 'تقييم صحي مجاني — ١٥ سؤالاً' : 'Free 15-question health assessment'}
              </p>
              <p className="mt-1 text-xs text-fg-3">
                {isAr
                  ? 'احصل على كتاب إلكتروني وستتواصل معك كوتش التغذية روان شخصياً.'
                  : 'Get a free ebook and Nutrition Coach Rawan will personally reach out.'}
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-lime-400">
                {isAr ? 'ابدأ التقييم' : 'Start the assessment'}
                <ArrowRight
                  className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </p>
            </Link>
          </aside>
        </div>
      </div>

      <FooterSection />
    </main>
  )
}

function EmailCard({
  label,
  hint,
  email,
}: {
  label: string
  hint: string
  email: string
}) {
  return (
    <a
      href={`mailto:${email}`}
      className="block rounded-2xl border border-border p-4 transition-colors hover:border-lime-400/40"
      style={{ background: 'var(--gf-surface)' }}
    >
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-eyebrow font-semibold text-fg-3">
        <Mail className="w-3 h-3" strokeWidth={2} />
        {label}
      </p>
      <p
        className="mt-1.5 text-sm font-semibold text-lime-400 break-all"
        dir="ltr"
      >
        {email}
      </p>
      <p className="mt-1 text-xs text-fg-3">{hint}</p>
    </a>
  )
}
