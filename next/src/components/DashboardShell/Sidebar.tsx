'use client'

import { useTranslations } from 'next-intl'
import { LogOut, Settings, Home, ArrowLeft } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { Wordmark } from '@/components/Wordmark'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { resolveDisplayName } from '@/lib/displayName'
import type { DashboardNavItem } from './nav'

const SIDEBAR_BG = '#0e0e0e'
const SIDEBAR_BORDER = '#1a1a1a'
const ACTIVE_BG = '#161616'
const HOVER_BG = '#161616'
const ACCENT = '#4ade80'
const INACTIVE_TEXT = '#666666'
const ACTIVE_TEXT = '#ffffff'

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

  // Root-level hrefs only match on EXACT pathname so "/dashboard" doesn't
  // also light up when the user is on "/dashboard/track" or any other
  // dashboard subpage. Children use the normal startsWith match so deep
  // routes (e.g. /admin/users/123) still highlight their parent ("/admin/users").
  const ROOT_HREFS = ['/dashboard', '/nutritionist', '/admin']
  const isActive = (href: string) => {
    if (ROOT_HREFS.includes(href)) return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const displayName = resolveDisplayName(profile, user, 'Guest')
  const email = user?.email ?? ''
  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

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

      {/* ── Nav items ──────────────────────────────────────── */}
      <ul className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {/* Home (back to marketing site) is the first item. */}
        <li>
          <Link
            href="/"
            onClick={onItemClick}
            className="group mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            style={{ color: INACTIVE_TEXT }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = HOVER_BG
              e.currentTarget.style.color = ACTIVE_TEXT
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = INACTIVE_TEXT
            }}
          >
            <Home className="w-4 h-4 flex-shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate text-sm font-medium leading-none">
              {tNav('home')}
            </span>
          </Link>
        </li>

        {navItems.map(({ href, labelKey, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onItemClick}
                className={cn(
                  'group mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative',
                )}
                style={{
                  background: active ? ACTIVE_BG : 'transparent',
                  color: active ? ACTIVE_TEXT : INACTIVE_TEXT,
                  borderInlineStart: active
                    ? `2px solid ${ACCENT}`
                    : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = HOVER_BG
                    e.currentTarget.style.color = ACTIVE_TEXT
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = INACTIVE_TEXT
                  }
                }}
                aria-current={active ? 'page' : undefined}
              >
                {/* Active state per spec is bg + border-l + text only.
                 * Icon inherits currentColor so it never becomes a green
                 * circle that reads as a separate decorative dot. */}
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="flex-1 truncate text-sm font-medium leading-none">
                  {t(labelKey)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* ── Bottom: user card → settings, then back link, then sign out ── */}
      <div
        className="p-3 space-y-1"
        style={{ borderTop: `1px solid ${SIDEBAR_BORDER}` }}
      >
        <Link
          href="/dashboard/settings"
          onClick={onItemClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
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
              background: '#1a2e1f',
              color: ACCENT,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: '36px',
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
            <p
              className="text-sm font-medium truncate"
              style={{ color: ACTIVE_TEXT }}
            >
              {displayName}
            </p>
            {email && (
              <p
                className="text-xs truncate"
                style={{ color: '#666' }}
                dir="ltr"
              >
                {email}
              </p>
            )}
          </div>
          <Settings
            className="w-4 h-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: '#666' }}
          />
        </Link>

        <Link
          href="/"
          onClick={onItemClick}
          className="flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
          style={{ color: '#666' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = ACTIVE_TEXT
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#666'
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
          className="w-full flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-colors"
          style={{ color: '#666' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f87171'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#666'
          }}
        >
          <LogOut className="w-4 h-4" strokeWidth={1.75} />
          <span>{tNav('signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
