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
  // Mobile drawer uses a two-state machine so the closing animation
  // can run before the panel unmounts:
  //   drawerVisible — panel is in the DOM (mounted)
  //   drawerOpen    — panel is animating into view / open
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const openDrawer = () => {
    setDrawerVisible(true)
    // Next frame so the initial styles flush before we toggle to open,
    // which guarantees the transition runs (you can't transition from
    // a brand-new element's first computed style).
    requestAnimationFrame(() => setDrawerOpen(true))
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    // Wait for the 350ms transition to finish before unmounting.
    setTimeout(() => setDrawerVisible(false), 350)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
    setDrawerVisible(false)
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll while the mobile drawer is mounted. Always restore on
  // unmount so a nav-away never leaves the page in a frozen state.
  useEffect(() => {
    const prev = document.body.style.overflow
    if (drawerVisible) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerVisible])

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
        background: 'rgba(5, 20, 5, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }
    : {
        background: 'rgba(5, 20, 5, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-200"
        style={{
          ...headerStyle,
          paddingTop: 'env(safe-area-inset-top)',
        }}
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
                className="text-sm transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.8)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#ffffff')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')
                }
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
                  className="inline-flex items-center h-10 rounded-full transition-colors"
                  style={{
                    gap: 10,
                    paddingInlineStart: 8,
                    paddingInlineEnd: 14,
                    minWidth: 'fit-content',
                    whiteSpace: 'nowrap',
                    background: scrolled ? '#1a1a1a' : 'rgba(255,255,255,0.08)',
                    border: scrolled
                      ? '1px solid #2a2a2a'
                      : '1px solid rgba(255,255,255,0.15)',
                    color: '#ffffff',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = scrolled
                      ? '#222'
                      : 'rgba(255,255,255,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = scrolled
                      ? '#1a1a1a'
                      : 'rgba(255,255,255,0.08)'
                  }}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#1a2e1f',
                      color: '#4ade80',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      textAlign: 'center',
                      flexShrink: 0,
                      overflow: 'hidden',
                      userSelect: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {initials.slice(0, 2).toUpperCase()}
                  </span>
                  <ChevronDown
                    className="hidden md:block w-4 h-4 text-[#666]"
                    strokeWidth={1.75}
                  />
                </button>
                <div
                  role="menu"
                  aria-hidden={!menuOpen}
                  className={`absolute end-0 top-14 rounded-2xl overflow-hidden z-30 transition-all duration-200 ${
                    menuOpen
                      ? 'opacity-100 scale-100 pointer-events-auto'
                      : 'opacity-0 scale-95 pointer-events-none'
                  }`}
                  style={{
                    background: '#111',
                    border: '1px solid #222',
                    transformOrigin: 'top right',
                    minWidth: 220,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                    {user.email && (
                      <div
                        className="px-3 py-3 mb-1 flex items-center gap-3"
                        style={{ borderBottom: '1px solid #222' }}
                      >
                        <span
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: '#1a2e1f',
                            color: '#4ade80',
                            fontSize: 12,
                            fontWeight: 700,
                            lineHeight: 1,
                            textAlign: 'center',
                            flexShrink: 0,
                            overflow: 'hidden',
                            userSelect: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {initials.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate"
                            style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}
                          >
                            {profile?.full_name ?? t('dashboard')}
                          </p>
                          <p
                            className="truncate"
                            style={{ fontSize: 11, color: '#666', marginTop: 2 }}
                            dir="ltr"
                          >
                            {user.email}
                          </p>
                        </div>
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
                      className="w-full flex items-center rounded-[10px] text-sm font-medium transition-colors"
                      style={{
                        color: '#f87171',
                        gap: 12,
                        padding: '10px 16px',
                        minHeight: 44,
                        minWidth: 180,
                        whiteSpace: 'nowrap',
                        marginTop: 4,
                        borderTop: '1px solid #222',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          'rgba(248,113,113,0.08)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span>{t('signOut')}</span>
                    </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden sm:inline-flex items-center text-sm transition-colors duration-200"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#ffffff')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')
                  }
                >
                  {t('signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-primary hidden sm:inline-flex"
                  style={{
                    height: 40,
                    padding: '0 20px',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {t('getStarted')}
                </Link>
              </>
            )}

            {/* Hamburger */}
            <button
              type="button"
              onClick={openDrawer}
              aria-label={t('openMenu')}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
              style={{ background: '#111', border: '1px solid #222', color: '#fff' }}
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer — side panel that slides from the end edge with
       * a backdrop fade. Mounted only while drawerVisible so the
       * close animation has time to run before unmount. */}
      {drawerVisible && (
        <>
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={closeDrawer}
            className="md:hidden fixed inset-0 transition-opacity duration-300"
            style={{
              zIndex: 40,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              opacity: drawerOpen ? 1 : 0,
            }}
          />

          <div
            role="dialog"
            aria-modal
            className="md:hidden fixed inset-y-0 end-0 flex flex-col"
            style={{
              zIndex: 50,
              width: 280,
              maxWidth: '85vw',
              background: 'rgba(8, 20, 10, 0.85)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderInlineStart: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
              transition:
                'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
              padding: '64px 24px 32px',
            }}
          >
            <button
              type="button"
              onClick={closeDrawer}
              aria-label={t('closeMenu')}
              className="inline-flex items-center justify-center"
              style={{
                position: 'absolute',
                top: 16,
                insetInlineEnd: 16,
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </button>

            <nav className="flex flex-col">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={closeDrawer}
                  className="block transition-colors duration-200"
                style={{
                  padding: '16px 0',
                  fontSize: 18,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.85)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#4ade80')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')
                }
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-3">
            {!user ? (
              <>
                <Link
                  href="/sign-in"
                  className="text-center transition-colors"
                  style={{
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    padding: '12px 0',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  {t('signIn')}
                </Link>
                <Link
                  href="/sign-up"
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 12,
                  }}
                >
                  {t('getStarted')}
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="btn-primary"
                style={{ width: '100%', height: 48, borderRadius: 12 }}
              >
                {t('dashboard')}
              </Link>
            )}
            </div>
          </div>
        </>
      )}
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
      className="flex items-center rounded-[10px] text-sm font-medium transition-colors"
      style={{
        color: '#fff',
        gap: 12,
        padding: '10px 16px',
        minHeight: 44,
        minWidth: 180,
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1a1a')}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'transparent')
      }
    >
      <Icon
        className="w-4 h-4 shrink-0"
        strokeWidth={1.75}
        style={{ color: '#888' }}
      />
      <span>{label}</span>
    </Link>
  )
}
