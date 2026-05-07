'use client'

import { useTranslations } from 'next-intl'
import { LogOut, Settings, ArrowLeft, Sun, Moon } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { Wordmark } from '@/components/Wordmark'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import { resolveDisplayName } from '@/lib/displayName'
import type { DashboardNavItem } from './nav'

// Use CSS vars so the theme toggle (dark/light) flips the sidebar
// alongside the rest of the dashboard. Each ref reads `var(--gf-...)`
// from globals.css; light-mode override is applied by ThemeProvider.
const SIDEBAR_BG = 'var(--gf-surface)'
const SIDEBAR_BORDER = 'var(--gf-border)'
const HOVER_BG = 'var(--gf-hover-bg)'
const ACTIVE_TEXT = 'var(--gf-primary-text)'
const INACTIVE_TEXT = 'var(--gf-fg-2)'
const HOVER_TEXT = 'var(--gf-fg-1)'
const GROUP_LABEL = 'var(--gf-fg-3)'

type SectionKey = 'main' | 'nutrition' | 'connect' | 'manage'

interface SectionDef {
  key: SectionKey
  label: string
  hrefs: string[]
}

const USER_SECTIONS: SectionDef[] = [
  {
    key: 'main',
    label: 'MAIN',
    hrefs: ['/dashboard', '/dashboard/scanner', '/dashboard/track', '/dashboard/progress'],
  },
  {
    key: 'nutrition',
    label: 'NUTRITION',
    hrefs: ['/dashboard/meal-plan', '/dashboard/recipes'],
  },
  {
    key: 'connect',
    label: 'CONNECT',
    hrefs: ['/dashboard/community', '/dashboard/messages'],
  },
  {
    key: 'manage',
    label: 'MANAGE',
    hrefs: ['/dashboard/store', '/dashboard/orders', '/dashboard/bookings', '/dashboard/settings'],
  },
]

/** Per-route icon tint + tile background. Each tile uses an
 * rgba(...,0.15) shade of the matching colour so the icon reads
 * against the sidebar surface without being a pure flat circle. */
const ICON_TINT: Record<string, { color: string; bg: string }> = {
  '/dashboard':           { color: '#a3e635', bg: 'rgba(132,204,22,0.15)' },
  '/dashboard/scanner':   { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  '/dashboard/track':     { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  '/dashboard/progress':  { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  '/dashboard/meal-plan': { color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  '/dashboard/recipes':   { color: '#fb7185', bg: 'rgba(251,113,133,0.15)' },
  '/dashboard/community': { color: '#a3e635', bg: 'rgba(132,204,22,0.15)' },
  '/dashboard/messages':  { color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  '/dashboard/store':     { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  '/dashboard/orders':    { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  '/dashboard/bookings':  { color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  '/dashboard/settings':  { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
}

export function Sidebar({
  navItems,
  onItemClick,
}: {
  navItems: DashboardNavItem[]
  onItemClick?: () => void
}) {
  const t = useTranslations()
  const tNav = useTranslations('nav')
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()

  // Root-level hrefs only match on EXACT pathname so "/dashboard" doesn't
  // also light up when the user is on "/dashboard/track" or any other
  // dashboard subpage. Children use the normal startsWith match so deep
  // routes (e.g. /admin/users/123) still highlight their parent.
  const ROOT_HREFS = ['/dashboard', '/nutritionist', '/admin']
  const isActive = (href: string) => {
    if (ROOT_HREFS.includes(href)) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const displayName = resolveDisplayName(profile, user, 'Guest')
  const email = user?.email ?? ''
  const tier = (profile?.tier ?? 'free') as 'free' | 'basic' | 'premium' | 'vip'
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  // Group nav items by URL prefix (only for the user role; nutritionist /
  // admin nav lists are smaller and stay flat).
  const isUserRole = navItems.some((n) => n.href.startsWith('/dashboard'))
  const grouped: { section: SectionDef | null; items: DashboardNavItem[] }[] =
    isUserRole
      ? USER_SECTIONS.map((section) => ({
          section,
          items: navItems.filter((n) => section.hrefs.includes(n.href)),
        })).filter((g) => g.items.length > 0)
      : [{ section: null, items: navItems }]

  return (
    <nav
      className="flex h-full w-full flex-col"
      style={{
        background: SIDEBAR_BG,
        borderInlineEnd: `1px solid ${SIDEBAR_BORDER}`,
      }}
    >
      {/* ── Top: logo (links to /) ─────────────────────────── */}
      <div
        className="flex items-center px-5 h-16"
        style={{ borderBottom: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <Link href="/" aria-label="Greenofig" onClick={onItemClick}>
          <Wordmark size="md" />
        </Link>
      </div>

      {/* ── Nav items, grouped ─────────────────────────────────
       * No standalone "Home" link at the top of the sidebar — the
       * MAIN group's first item ("Today") already routes to /dashboard,
       * and the "Back to site" link at the bottom handles exiting to
       * the marketing homepage. Two "Home" items both pointing at
       * /dashboard was confusing. */}
      <ul className="flex-1 overflow-y-auto py-3">
        {grouped.map(({ section, items }) => (
          <div key={section?.key ?? 'flat'}>
            {section && (
              <p
                className="px-4 pt-5 pb-1 text-[10px] uppercase font-semibold select-none"
                style={{ letterSpacing: '0.15em', color: GROUP_LABEL }}
              >
                {section.label}
              </p>
            )}
            {items.map(({ href, labelKey, Icon }) => {
              const active = isActive(href)
              const tint = ICON_TINT[href] ?? {
                color: '#94a3b8',
                bg: 'rgba(148,163,184,0.15)',
              }
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onItemClick}
                    className={`group mx-2 flex items-center gap-3 px-3 py-[11px] text-[14px] transition-all ${
                      active ? 'dash-sidebar-active' : ''
                    }`}
                    style={{
                      color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
                      fontWeight: active ? 600 : 500,
                      borderRadius: 10,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = HOVER_BG
                        e.currentTarget.style.color = HOVER_TEXT
                        e.currentTarget.style.transform = 'translateX(2px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = INACTIVE_TEXT
                        e.currentTarget.style.transform = 'translateX(0)'
                      }
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon
                      className="w-5 h-5 flex-shrink-0"
                      strokeWidth={1.75}
                      style={{
                        color: active ? 'var(--gf-primary-text)' : tint.color,
                      }}
                    />
                    <span className="flex-1 truncate text-[14px] leading-none">
                      {t(labelKey)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </div>
        ))}
      </ul>

      {/* ── Bottom: user card → settings, then back link, then sign out ── */}
      <div
        className="p-3 mt-auto flex flex-col"
        style={{
          borderTop: `1px solid ${SIDEBAR_BORDER}`,
          rowGap: 6,
        }}
      >
        <Link
          href="/dashboard/settings"
          onClick={onItemClick}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
          style={{ color: INACTIVE_TEXT }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = HOVER_BG
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4ade80, #60a5fa)',
              color: '#ffffff',
              fontSize: 12,
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: HOVER_TEXT }}
              >
                {displayName}
              </p>
              <span
                className="shrink-0 inline-flex items-center"
                style={{
                  background: 'var(--tier-badge-bg, #1f2937)',
                  color: 'var(--tier-badge-text, #9ca3af)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                {tier}
              </span>
            </div>
            {email && (
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: GROUP_LABEL }}
                dir="ltr"
              >
                {email}
              </p>
            )}
          </div>
          <Settings
            className="w-4 h-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: GROUP_LABEL }}
          />
        </Link>

        <Link
          href="/"
          onClick={onItemClick}
          className="flex items-center gap-2 rounded-lg p-2 text-[13px] font-medium transition-colors"
          style={{ color: GROUP_LABEL, minHeight: 36 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = HOVER_TEXT
            e.currentTarget.style.background = HOVER_BG
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = GROUP_LABEL
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>{tNav('backToHome')}</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            void signOut()
            onItemClick?.()
          }}
          className="w-full flex items-center gap-2 rounded-lg p-2 text-[13px] font-medium transition-colors"
          style={{ color: '#dc2626', minHeight: 36 }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'rgba(220,38,38,0.08)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'transparent')
          }
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          <span>{tNav('signOut')}</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={theme === 'light'}
          className="w-full flex items-center gap-2 rounded-lg p-2 text-[13px] font-medium transition-colors"
          style={{ color: GROUP_LABEL, minHeight: 36 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = HOVER_TEXT
            e.currentTarget.style.background = HOVER_BG
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = GROUP_LABEL
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" strokeWidth={1.75} />
          ) : (
            <Moon className="w-4 h-4" strokeWidth={1.75} />
          )}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </nav>
  )
}
