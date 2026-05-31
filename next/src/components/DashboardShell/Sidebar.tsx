'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LogOut, Settings, ArrowLeft, Sun, Moon } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { Wordmark } from '@/components/Wordmark'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/components/ThemeProvider'
import { resolveDisplayName } from '@/lib/displayName'
import { CLINIC_NAV_ITEMS, type DashboardNavItem } from './nav'

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

type SectionKey = 'clinic' | 'main' | 'nutrition' | 'connect' | 'manage'

interface SectionDef {
  key: SectionKey
  label: string
  hrefs: string[]
}

const USER_SECTIONS: SectionDef[] = [
  {
    // Only populated for linked walk-in clinic clients (the items are
    // injected below). Empty → filtered out for everyone else.
    key: 'clinic',
    label: 'MY CLINIC',
    hrefs: ['/dashboard/my-plan', '/dashboard/appointments', '/dashboard/my-payments'],
  },
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
  '/dashboard':              { color: '#a3e635', bg: 'rgba(132,204,22,0.15)' },
  '/dashboard/my-plan':      { color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  '/dashboard/appointments': { color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  '/dashboard/my-payments':  { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
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
  // Pull `tier` from useAuth (not `profile?.tier`) so the cached
  // tier is used during the brief window before the profile row
  // loads. Otherwise the sidebar would show "FREE" while the
  // topbar/settings (which already consume the cached tier) show
  // the real tier — the badges would disagree mid-render.
  const { user, profile, tier: authTier, role, signOut } = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  // The sidebar's bottom user card flashed "free" then "vip" on every
  // dashboard load because profile loads asynchronously. Gate the
  // user-derived strings (initials, name, tier label, email) behind
  // a mount flag so the first paint is empty and the real data
  // fades in once. Pill colours come from CSS vars on the dashboard
  // root (`[data-tier='X']`) so they auto-flip with no JS lookup.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

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
  // authTier comes from useAuth which seeds from the localStorage
  // cache, so it's already 'vip' on the first client paint for
  // returning users. Falling back to profile?.tier covers the
  // edge case of a fresh sign-up with no cached tier yet.
  const tier = (authTier ?? profile?.tier ?? 'free') as
    | 'free'
    | 'basic'
    | 'premium'
    | 'vip'
  // Admin/nutritionist chrome shows the role; only customer accounts
  // show their tier on the pill. While role is still loading we
  // render empty rather than falling back to a cached tier value —
  // otherwise an admin signing in right after a VIP user briefly
  // sees 'vip' from the prior session's localStorage cache.
  const pillLabel =
    role === 'admin'
      ? 'admin'
      : role === 'nutritionist'
        ? 'nutritionist'
        : role === 'user'
          ? tier
          : ''
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  // Hide head-coach-only links (earnings, store curation, analytics)
  // from employee nutritionists. The head coach has is_head_coach=true.
  const isHeadCoach = !!profile?.is_head_coach
  let visibleNavItems = navItems.filter(
    (n) => !n.headCoachOnly || isHeadCoach,
  )

  // Walk-in clinic clients (linked to a coach) get their own "My clinic"
  // group: their assigned plan/recipes, their appointments, and their
  // payments. Injected here and grouped by the 'clinic' section above.
  const isClinicClient = !!(profile as { is_clinic_client?: boolean } | null)?.is_clinic_client
  if (isClinicClient && visibleNavItems.some((n) => n.href === '/dashboard')) {
    const homeIdx = visibleNavItems.findIndex((n) => n.href === '/dashboard')
    visibleNavItems = [
      ...visibleNavItems.slice(0, homeIdx + 1),
      ...CLINIC_NAV_ITEMS,
      ...visibleNavItems.slice(homeIdx + 1),
    ]
  }

  // Group nav items by URL prefix (only for the user role; nutritionist /
  // admin nav lists are smaller and stay flat).
  const isUserRole = visibleNavItems.some((n) => n.href.startsWith('/dashboard'))
  const grouped: { section: SectionDef | null; items: DashboardNavItem[] }[] =
    isUserRole
      ? USER_SECTIONS.map((section) => ({
          section,
          items: visibleNavItems.filter((n) => section.hrefs.includes(n.href)),
        })).filter((g) => g.items.length > 0)
      : [{ section: null, items: visibleNavItems }]

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
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--gf-primary-text)',
              flexShrink: 0,
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 18,
            }}
            suppressHydrationWarning
          >
            {mounted ? initials.slice(0, 2).toUpperCase() : ''}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: HOVER_TEXT, minHeight: 18 }}
                suppressHydrationWarning
              >
                {mounted ? displayName : ''}
              </p>
              <span
                className="tier-pill shrink-0"
                style={{
                  opacity: mounted ? 1 : 0,
                  minWidth: 36,
                }}
                suppressHydrationWarning
              >
                {mounted ? pillLabel : ''}
              </span>
            </div>
            {email && (
              <p
                className="text-xs truncate mt-0.5"
                style={{ color: GROUP_LABEL }}
                dir="ltr"
                suppressHydrationWarning
              >
                {mounted ? email : ''}
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
