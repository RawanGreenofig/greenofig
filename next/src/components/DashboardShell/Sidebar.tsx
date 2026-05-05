'use client'

import { useTranslations } from 'next-intl'
import { LogOut } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { Wordmark } from '@/components/Wordmark'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import type { DashboardNavItem } from './nav'

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
  const { signOut } = useAuth()

  const ROOT_HREFS = ['/dashboard', '/nutritionist', '/admin']
  const isActive = (href: string) =>
    ROOT_HREFS.includes(href)
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav className="flex h-full w-full flex-col bg-surface border-e border-border">
      <div className="flex items-center px-5 h-16 border-b border-border">
        <Link href="/" aria-label="Greenofig" onClick={onItemClick}>
          <Wordmark size="md" />
        </Link>
      </div>

      <ul className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(({ href, labelKey, Icon }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onItemClick}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-fast ease-out',
                  active
                    ? 'bg-primary/15 text-lime-400 font-medium'
                    : 'text-fg-2 hover:bg-surface-raised hover:text-fg-1',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className="w-5 h-5 shrink-0"
                  strokeWidth={active ? 2 : 1.75}
                />
                <span className="flex-1 truncate">{t(labelKey)}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="p-3 border-t border-border">
        <button
          type="button"
          onClick={() => {
            void signOut()
            onItemClick?.()
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-fg-2 hover:bg-surface-raised hover:text-fg-1 transition-colors duration-fast ease-out"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.75} />
          <span>{tNav('signOut')}</span>
        </button>
      </div>
    </nav>
  )
}
