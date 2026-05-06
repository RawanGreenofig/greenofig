'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Menu, X, ChevronDown, LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Wordmark } from '@/components/Wordmark'
import { useAuth } from '@/context/AuthContext'

/**
 * Premium marketing navbar.
 * - Transparent over the hero, frosted-charcoal once the user has scrolled
 *   past 16px so it stays legible on every section.
 * - Center nav links on md+, hamburger drawer on mobile.
 * - Right side is auth-aware: signed-out shows "Sign in" + "Get started",
 *   signed-in shows an avatar dropdown with Dashboard/Settings/Sign out.
 *
 * Used on every standalone marketing page (pricing, blog, legal, etc.).
 */
export function SiteHeader() {
  const t = useTranslations('nav')
  const { user, profile, signOut, isLoading } = useAuth()
  const pathname = usePathname()

  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const initials =
    (profile?.full_name ?? user?.email ?? '?')
      .split(/\s+|@/)[0]
      .slice(0, 2)
      .toUpperCase() || '?'

  const navLinks: { href: string; label: string }[] = [
    { href: '/#about', label: t('about') },
    { href: '/pricing', label: t('pricing') },
    { href: '/blog', label: t('blog') },
    { href: '/#store', label: t('store') },
  ]

  const headerStyle: React.CSSProperties = scrolled
    ? {
        background: 'rgba(8,8,8,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #222',
      }
    : {
        background: 'transparent',
        borderBottom: '1px solid transparent',
      }

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-200"
        style={headerStyle}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" aria-label="Greenofig" className="shrink-0">
            <Wordmark size="md" />
          </Link>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-[#888] hover:text-white transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex">
              <LanguageSwitcher />
            </span>

            {!isLoading && user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="inline-flex items-center gap-2 pe-3 ps-1 h-10 rounded-full transition-colors"
                  style={{ background: '#111', border: '1px solid #222' }}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden select-none"
                    style={{ background: '#1a2e1f', color: '#4ade80', lineHeight: 1 }}
                  >
                    {initials.slice(0, 2)}
                  </span>
                  <ChevronDown
                    className="hidden md:block w-4 h-4 text-[#666]"
                    strokeWidth={1.75}
                  />
                </button>
                <div
                  role="menu"
                  aria-hidden={!menuOpen}
                  className={`absolute end-0 top-12 w-56 rounded-2xl overflow-hidden z-30 transition-all duration-200 ${
                    menuOpen
                      ? 'opacity-100 scale-100 pointer-events-auto'
                      : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                  style={{
                    background: '#111',
                    border: '1px solid #222',
                    transformOrigin: 'top right',
                  }}
                >
                    {user.email && (
                      <div
                        className="px-4 py-3"
                        style={{ borderBottom: '1px solid #1a1a1a' }}
                      >
                        <p className="text-xs text-[#666]">
                          {profile?.full_name ?? t('dashboard')}
                        </p>
                        <p
                          className="text-xs text-white truncate mt-0.5"
                          dir="ltr"
                        >
                          {user.email}
                        </p>
                      </div>
                    )}
                    <DropLink
                      href="/dashboard"
                      Icon={LayoutDashboard}
                      label={t('dashboard')}
                      onClick={() => setMenuOpen(false)}
                    />
                    <DropLink
                      href="/dashboard/settings"
                      Icon={Settings}
                      label={t('settings')}
                      onClick={() => setMenuOpen(false)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        void signOut()
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#888] transition-colors"
                      style={{ borderTop: '1px solid #1a1a1a' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444'
                        e.currentTarget.style.background = '#1a1a1a'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#888'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.75} />
                      <span>{t('signOut')}</span>
                    </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden sm:inline-flex items-center text-sm text-[#888] hover:text-white transition-colors duration-200"
                >
                  {t('signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="hidden sm:inline-flex items-center justify-center text-sm font-semibold px-4 py-2 rounded-full transition-colors duration-200"
                  style={{ background: '#4ade80', color: '#000' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#86efac')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4ade80')}
                >
                  {t('getStarted')}
                </Link>
              </>
            )}

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('openMenu')}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
              style={{ background: '#111', border: '1px solid #222', color: '#fff' }}
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — always mounted so the slide+fade animation runs
       *  on both open and close. `pointer-events-none` keeps it inert
       *  while hidden so it doesn't trap clicks. */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          drawerOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        role="dialog"
        aria-modal
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          aria-label={t('closeMenu')}
          tabIndex={drawerOpen ? 0 : -1}
          onClick={() => setDrawerOpen(false)}
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        />
        <div
          className={`absolute top-0 end-0 h-full w-72 max-w-[80vw] flex flex-col transform transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : 'rtl:-translate-x-full ltr:translate-x-full'
          }`}
          style={{
            background: '#0e0e0e',
            borderInlineStart: '1px solid #222',
          }}
        >
          <div
            className="px-5 h-16 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid #1a1a1a' }}
          >
            <Link href="/" aria-label="Greenofig">
              <Wordmark size="md" />
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label={t('closeMenu')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: '#1a1a1a', border: '1px solid #222', color: '#fff' }}
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
          <nav className="flex-1 px-5 py-4 flex flex-col gap-1 overflow-y-auto">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setDrawerOpen(false)}
                className="py-4 text-base font-medium text-white"
                style={{ borderBottom: '1px solid #1a1a1a' }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div
            className="p-5 flex items-center gap-3"
            style={{ borderTop: '1px solid #1a1a1a' }}
          >
            <LanguageSwitcher />
            {!user ? (
              <>
                <Link
                  href="/sign-in"
                  className="flex-1 inline-flex items-center justify-center text-sm text-white py-3 rounded-xl"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                >
                  {t('signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="flex-1 inline-flex items-center justify-center text-sm font-semibold py-3 rounded-xl"
                  style={{ background: '#4ade80', color: '#000' }}
                >
                  {t('getStarted')}
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center text-sm font-semibold py-3 rounded-xl"
                style={{ background: '#4ade80', color: '#000' }}
              >
                {t('dashboard')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function DropLink({
  href,
  Icon,
  label,
  onClick,
}: {
  href: string
  Icon: typeof LayoutDashboard
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#888] transition-colors"
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#fff'
        e.currentTarget.style.background = '#1a1a1a'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#888'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}
