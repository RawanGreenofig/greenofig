'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Menu, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const { user, profile, signOut } = useAuth()
  const initials =
    (profile?.full_name ?? user?.email ?? '?')
      .split(' ')
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
    <header className="flex items-center gap-3 h-16 px-4 md:px-6 bg-bg border-b border-border shrink-0">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('openSidebar')}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-fg-2 hover:bg-surface-raised hover:text-fg-1 transition-colors"
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Search — hidden on small mobile */}
      <div className="hidden sm:flex flex-1 max-w-md items-center gap-2 rounded-full bg-surface border border-border px-3 h-10">
        <Search className="w-4 h-4 text-fg-3" strokeWidth={1.75} />
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          aria-label={t('search')}
          className="flex-1 bg-transparent text-sm text-fg-1 placeholder:text-fg-3 focus:outline-none"
        />
      </div>
      <div className="sm:hidden flex-1" />

      <LanguageSwitcher />

      <button
        type="button"
        aria-label={t('notifications')}
        className="relative w-10 h-10 rounded-full bg-surface border border-border text-fg-2 hover:bg-surface-raised hover:text-fg-1 transition-colors flex items-center justify-center"
      >
        <Bell className="w-4 h-4" strokeWidth={1.75} />
        <span className="absolute top-2 end-2 w-1.5 h-1.5 rounded-full bg-amber" />
      </button>

      {/* Avatar dropdown */}
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 pe-2 ps-0.5 h-10 rounded-full bg-surface border border-border hover:bg-surface-raised transition-colors"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-500 to-lime-600 text-bg flex items-center justify-center text-xs font-bold">
            {initials}
          </span>
          <ChevronDown
            className={cn('hidden md:block w-4 h-4 text-fg-3 transition-transform', open && 'rotate-180')}
            strokeWidth={1.75}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute end-0 mt-2 w-52 rounded-xl border border-border bg-surface shadow-lg overflow-hidden z-30"
          >
            <DropItem href="/dashboard/settings" Icon={User} label={t('profile')} onClick={() => setOpen(false)} />
            <DropItem href="/dashboard/settings" Icon={Settings} label={tNav('settings')} onClick={() => setOpen(false)} />
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg-2 hover:bg-surface-raised hover:text-fg-1 transition-colors border-t border-border"
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
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-fg-2 hover:bg-surface-raised hover:text-fg-1 transition-colors"
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}
