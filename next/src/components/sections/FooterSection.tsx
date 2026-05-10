'use client'

import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Facebook, Instagram, Linkedin, Twitter, type LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'
import { ease } from '@/lib/tokens'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'

interface FooterSettings {
  tagline?: string
  supportEmail?: string
  supportPhone?: string
  address?: string
  instagram?: string
  youtube?: string
  tiktok?: string
}

const EASE_OUT: [number, number, number, number] = [...ease.out]

export function FooterSection() {
  const t = useTranslations('marketing')
  const tNav = useTranslations('nav')
  // Top-level footerNavigate / footerAccount / footerLegal namespaces
  const tRoot = useTranslations()
  const tLegal = useTranslations('legal')
  const year = new Date().getFullYear()
  void useLocale
  // Admin overrides from /admin/site-editor → site_footer. Each field
  // falls back to the existing translation/hardcoded value when the
  // override is empty, so a partial edit doesn't blank the rest.
  const { value: footerOv } = usePlatformSetting<FooterSettings>('site_footer')
  const tagline = footerOv?.tagline?.trim() || t('footerTagline')
  const supportEmail = footerOv?.supportEmail?.trim() || 'health@greenofig.com'
  const supportPhone = footerOv?.supportPhone?.trim() || ''
  const address = footerOv?.address?.trim() || ''
  const instagram = footerOv?.instagram?.trim() || 'https://instagram.com'
  const youtube = footerOv?.youtube?.trim() || ''
  const tiktok = footerOv?.tiktok?.trim() || ''

  return (
    <footer
      id="footer"
      className="relative w-full bg-bg-deeper border-t border-border overflow-hidden"
    >
      {/* Giant wordmark watermark — sits behind footer content */}
      <motion.div
        aria-hidden
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 1.4, ease: EASE_OUT }}
        viewport={{ once: true, margin: '-100px' }}
        className="absolute inset-x-0 bottom-0 z-0 pointer-events-none select-none flex items-end justify-center"
      >
        <span
          className="font-display font-bold text-fg-1 leading-none tracking-tight"
          style={{
            fontSize: '15vw',
            opacity: 0.04,
            transform: 'translateY(10%)',
          }}
        >
          GREENOFIG
        </span>
      </motion.div>

      <div className="relative z-10 max-w-screen-xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
          {/* Col 1 — brand */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1 max-w-xs">
            <Link href="/" aria-label="Greenofig">
              <Wordmark size="lg" />
            </Link>
            <p className="mt-3 text-sm text-fg-2 leading-relaxed">
              {tagline}
            </p>
            {/* Email + phone + address — overrides from site_footer */}
            <div className="mt-5 space-y-1.5 text-xs">
              <a
                href={`mailto:${supportEmail}`}
                className="block text-fg-2 hover:text-lime-400 transition-colors"
              >
                {supportEmail}
              </a>
              {supportPhone && (
                <a
                  href={`tel:${supportPhone.replace(/\s+/g, '')}`}
                  className="block text-fg-2 hover:text-lime-400 transition-colors"
                  dir="ltr"
                >
                  {supportPhone}
                </a>
              )}
              {address && <p className="text-fg-3">{address}</p>}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <SocialLink href={instagram} icon={Instagram} label="Instagram" />
              <SocialLink href="https://twitter.com"   icon={Twitter}   label="Twitter / X" />
              <SocialLink href="https://linkedin.com"  icon={Linkedin}  label="LinkedIn" />
              <SocialLink href="https://facebook.com"  icon={Facebook}  label="Facebook" />
              {/* youtube/tiktok URLs are stored in settings but the icon
                  set ships Twitter/Linkedin/Facebook — those edit fields
                  are reserved for a future expanded social row. */}
              {youtube || tiktok ? null : null}
            </div>
          </div>

          {/* Col 2 — Navigate */}
          <FooterCol title={tRoot('footerNavigate')}>
            <FooterLink href="/" label={tNav('home')} />
            <FooterLink href="/about" label={tNav('about')} />
            <FooterLink href="/#services" label={tNav('services')} />
            <FooterLink href="/pricing" label={tNav('pricing')} />
            <FooterLink href="/#community" label={tNav('community')} />
            <FooterLink href="/#store" label={tNav('store')} />
            <FooterLink href="/blog" label={tNav('blog')} />
            <FooterLink href="/reviews" label={tNav('reviews')} />
            <FooterLink href="/careers" label={tNav('careers')} />
          </FooterCol>

          {/* Col 3 — Account */}
          <FooterCol title={tRoot('footerAccount')}>
            <FooterLink href="/sign-in" label={tNav('signIn')} />
            <FooterLink href="/sign-up" label={tNav('createAccount')} />
            <FooterLink href="/dashboard" label={tNav('dashboard')} />
            <FooterLink href="/dashboard/settings" label={tNav('settings')} />
          </FooterCol>

          {/* Col 4 — Legal */}
          <FooterCol title={tRoot('footerLegal')}>
            <FooterLink href="/privacy" label={tLegal('privacy')} />
            <FooterLink href="/terms" label={tLegal('terms')} />
            <FooterLink href="/cookies" label={tLegal('cookies')} />
            <FooterLink href="/accessibility" label={tLegal('accessibility')} />
          </FooterCol>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-6 border-t border-border flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-4 text-xs text-fg-2">
          <p>{t('footerCopy', { year })}</p>
          <div className="flex items-center gap-4">
            <span>{t('footerCredit')}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-fg-3 mb-4">
        {title}
      </p>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  )
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-fg-2 hover:text-lime-400 transition-colors duration-fast ease-out"
      >
        {label}
      </Link>
    </li>
  )
}

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: LucideIcon
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-pill border border-border text-fg-2 hover:border-lime-500 hover:text-lime-500 transition-colors duration-fast ease-out"
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
    </a>
  )
}
