import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import Logo from './Logo'

const footerLinks = {
  product: [
    { href: '/features', label: 'footer.features' },
    { href: '/pricing', label: 'footer.pricing' },
    { href: '/download', label: 'footer.download' },
  ],
  company: [
    { href: '/about', label: 'footer.about' },
    { href: '/blog', label: 'footer.blog' },
    { href: '/careers', label: 'footer.careers' },
  ],
  resources: [
    { href: '/help', label: 'footer.helpCenter' },
    { href: '/community', label: 'footer.community' },
    { href: '/webinars', label: 'footer.webinars' },
  ],
  legal: [
    { href: '/privacy', label: 'footer.privacy' },
    { href: '/terms', label: 'footer.terms' },
    { href: '/cookies', label: 'footer.cookies' },
  ],
}

const socialLinks = [
  { href: 'https://facebook.com', icon: Facebook, label: 'Facebook' },
  { href: 'https://twitter.com', icon: Twitter, label: 'Twitter' },
  { href: 'https://instagram.com', icon: Instagram, label: 'Instagram' },
  { href: 'https://linkedin.com', icon: Linkedin, label: 'LinkedIn' },
  { href: 'https://youtube.com', icon: Youtube, label: 'YouTube' },
]

export function Footer() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-card border-t" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="section-container py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="col-span-2">
            <Logo showText className="mb-4" />
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              {t('app.description')}
            </p>

            {/* Newsletter */}
            <div className="mb-6">
              <h4 className="font-semibold text-sm mb-2">{t('footer.newsletter')}</h4>
              <p className="text-xs text-muted-foreground mb-3">
                {t('footer.newsletterText')}
              </p>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <Input
                  type="email"
                  placeholder={t('footer.emailPlaceholder')}
                  className="flex-1 h-9 text-sm"
                />
                <Button size="sm" type="submit">
                  {t('footer.subscribe')}
                </Button>
              </form>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.product')}</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.company')}</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.resources')}</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t(link.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {t('app.name')}. {t('footer.allRightsReserved')}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {t('footer.madeWith')} <Heart className="h-4 w-4 text-destructive fill-destructive" /> {t('footer.forYourHealth')}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
