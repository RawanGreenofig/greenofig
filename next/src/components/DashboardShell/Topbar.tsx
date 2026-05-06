'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Menu, Search, ChevronDown, User, Settings, LogOut, Home } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { resolveDisplayName } from '@/lib/displayName'

const TOPBAR_BG = '#0e0e0e'
const TOPBAR_BORDER = '#1a1a1a'
const FIELD_BG = '#161616'
const FIELD_BORDER = '#222222'

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

      <button
        type="button"
        aria-label={t('notifications')}
        className="relative w-10 h-10 rounded-full transition-colors flex items-center justify-center"
        style={{
          background: FIELD_BG,
          border: `1px solid ${FIELD_BORDER}`,
          color: '#888',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.background = '#222'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#888'
          e.currentTarget.style.background = FIELD_BG
        }}
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        <span
          className="absolute top-2 end-2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#e8912a' }}
        />
      </button>

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
            {/* user header */}
            <div
              className="px-4 py-3"
              style={{ borderBottom: `1px solid ${TOPBAR_BORDER}` }}
            >
              <p className="text-sm font-medium" style={{ color: '#fff' }}>
                {displayName}
              </p>
              {user?.email && (
                <p
                  className="mt-0.5 text-xs truncate"
                  style={{ color: '#666' }}
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
                color: '#ef4444',
                borderTop: `1px solid ${TOPBAR_BORDER}`,
                minHeight: 44,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e2238'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
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
      style={{ color: '#8b92b8', minHeight: 44 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#fff'
        e.currentTarget.style.background = '#1e2238'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#8b92b8'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}
