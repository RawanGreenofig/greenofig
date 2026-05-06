'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Menu, Search, ChevronDown, User, Settings, LogOut, Home } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { resolveDisplayName } from '@/lib/displayName'

// Use CSS vars so the topbar follows the dashboard theme toggle.
const TOPBAR_BG = 'var(--gf-surface)'
const TOPBAR_BORDER = 'var(--gf-border)'
const FIELD_BG = 'var(--gf-surface-raised)'
const FIELD_BORDER = 'var(--gf-border)'

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const { user, profile, signOut } = useAuth()
  const displayName = resolveDisplayName(profile, user, 'Guest')
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <header
      className="flex items-center gap-3 h-14 px-4 md:px-6 shrink-0"
      style={{
        background: TOPBAR_BG,
        borderBottom: `1px solid ${TOPBAR_BORDER}`,
      }}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('openSidebar')}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors"
        style={{ color: '#888' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#1f1f1f')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Search */}
      <div
        className="hidden sm:flex flex-1 max-w-md items-center gap-2 rounded-xl px-3 h-10"
        style={{ background: FIELD_BG, border: `1px solid ${FIELD_BORDER}` }}
      >
        <Search className="w-4 h-4" strokeWidth={1.75} style={{ color: '#555' }} />
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          aria-label={t('search')}
          className="flex-1 bg-transparent text-sm focus:outline-none"
          style={{ color: '#ffffff' }}
        />
      </div>
      <div className="sm:hidden flex-1" />

      {/* Back to site */}
      <Link
        href="/"
        aria-label={tNav('backToHome')}
        title={tNav('backToHome')}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full transition-colors"
        style={{
          background: FIELD_BG,
          border: `1px solid ${FIELD_BORDER}`,
          color: '#888',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#4ade80'
          e.currentTarget.style.borderColor = '#4ade80'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#888'
          e.currentTarget.style.borderColor = FIELD_BORDER
        }}
      >
        <Home className="w-4 h-4" strokeWidth={1.75} />
      </Link>

      <LanguageSwitcher />

      <NotificationBell label={t('notifications')} />


      {/* Avatar dropdown */}
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 pe-2 ps-0.5 h-10 rounded-full transition-colors"
          style={{
            background: FIELD_BG,
            border: `1px solid ${FIELD_BORDER}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#222')}
          onMouseLeave={(e) => (e.currentTarget.style.background = FIELD_BG)}
          aria-haspopup="menu"
          aria-expanded={open}
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
              lineHeight: '32px',
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
            className={cn(
              'hidden md:block w-4 h-4 transition-transform',
              open && 'rotate-180',
            )}
            strokeWidth={1.75}
            style={{ color: '#888' }}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute end-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-30"
            style={{
              background: TOPBAR_BG,
              border: `1px solid ${TOPBAR_BORDER}`,
              minWidth: 220,
            }}
          >
            {/* user header — flips to a tinted card in light mode */}
            <div
              className="m-2"
              style={{
                background: 'var(--gf-card-hover)',
                padding: '12px 16px',
                borderRadius: 10,
              }}
            >
              <p
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--gf-fg-1)' }}
              >
                {displayName}
              </p>
              {user?.email && (
                <p
                  className="mt-0.5 text-xs truncate"
                  style={{ color: 'var(--gf-fg-3)' }}
                  dir="ltr"
                >
                  {user.email}
                </p>
              )}
            </div>
            <DropItem
              href="/dashboard/settings"
              Icon={User}
              label={t('profile')}
              onClick={() => setOpen(false)}
            />
            <DropItem
              href="/dashboard/settings"
              Icon={Settings}
              label={tNav('settings')}
              onClick={() => setOpen(false)}
            />
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
              style={{
                color: '#dc2626',
                borderTop: `1px solid ${TOPBAR_BORDER}`,
                minHeight: 44,
              }}
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
          </div>
        )}
      </div>
    </header>
  )
}

/* ── Notification bell + dropdown ──────────────────────────────────
 * Self-contained component so the open/close state lives next to the
 * markup. Uses three hardcoded notifications by default — wire up to a
 * Supabase notifications table later when the schema lands. */
interface Notif {
  icon: string
  title: string
  body: string
  time: string
  unread?: boolean
}

const SEED_NOTIFS: Notif[] = [
  {
    icon: '🍎',
    title: 'New meal plan added',
    body: 'Dr. Rawan added your weekly plan',
    time: '1h',
    unread: true,
  },
  {
    icon: '💧',
    title: 'Hydration reminder',
    body: "You're 750ml short of today's goal",
    time: '2h',
    unread: true,
  },
  {
    icon: '⭐',
    title: 'Keep up your streak!',
    body: "You've logged meals 3 days in a row",
    time: '1d',
  },
]

function NotificationBell({ label }: { label: string }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>(SEED_NOTIFS)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const unreadCount = notifs.filter((n) => n.unread).length
  const markAllRead = () =>
    setNotifs((curr) => curr.map((n) => ({ ...n, unread: false })))

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center transition-colors"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          padding: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--gf-fg-2)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = 'var(--gf-fg-1)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = 'var(--gf-fg-2)')
        }
      >
        <Bell className="w-[22px] h-[22px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread`}
            style={{
              position: 'absolute',
              top: 6,
              insetInlineEnd: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid var(--gf-surface)',
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-30"
          style={{
            background: 'var(--gf-surface)',
            border: '1px solid var(--gf-border)',
            minWidth: 320,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <header
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--gf-border)' }}
          >
            <p
              className="font-semibold"
              style={{ fontSize: 14, color: 'var(--gf-fg-1)' }}
            >
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs hover:underline"
                style={{ color: '#60a5fa', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </header>

          <ul className="overflow-y-auto" style={{ maxHeight: 340 }}>
            {notifs.length === 0 ? (
              <li
                className="text-center py-12 text-sm"
                style={{ color: 'var(--gf-fg-3)' }}
              >
                No notifications yet
              </li>
            ) : (
              notifs.map((n, i) => (
                <li
                  key={i}
                  className="flex gap-3 px-4 py-3"
                  style={{
                    borderBottom:
                      i === notifs.length - 1
                        ? 'none'
                        : '1px solid var(--gf-border)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      width: 28,
                      flexShrink: 0,
                      textAlign: 'center',
                    }}
                  >
                    {n.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--gf-fg-1)',
                      }}
                    >
                      {n.title}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--gf-fg-2)',
                        marginTop: 2,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.body}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      style={{ fontSize: 11, color: 'var(--gf-fg-3)' }}
                    >
                      {n.time}
                    </span>
                    {n.unread && (
                      <span
                        aria-label="Unread"
                        className="w-2 h-2 rounded-full"
                        style={{ background: '#60a5fa' }}
                      />
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function DropItem({
  href,
  Icon,
  label,
  onClick,
}: {
  href: string
  Icon: typeof User
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
      style={{ color: 'var(--gf-fg-2)', minHeight: 44 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--gf-fg-1)'
        e.currentTarget.style.background = 'var(--gf-card-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--gf-fg-2)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}
