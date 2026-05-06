'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { usePathname } from '@/i18n/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import {
  USER_NAV,
  USER_MOBILE_TABS,
  USER_MOBILE_FAB,
  NUTRITIONIST_NAV,
  NUTRITIONIST_MOBILE_TABS,
  NUTRITIONIST_MOBILE_FAB,
  ADMIN_NAV,
  ADMIN_MOBILE_TABS,
  ADMIN_MOBILE_FAB,
} from './nav'

export type DashboardRole = 'user' | 'nutritionist' | 'admin'

export interface DashboardShellProps {
  children: ReactNode
  /**
   * Pick the nav set inside the client. We can't pass nav arrays from a
   * server component because the Lucide icons in them are functions and
   * RSC payloads can't serialise functions across the boundary.
   */
  role?: DashboardRole
}

const NAV_BY_ROLE = {
  user:         { nav: USER_NAV,         tabs: USER_MOBILE_TABS,         fab: USER_MOBILE_FAB },
  nutritionist: { nav: NUTRITIONIST_NAV, tabs: NUTRITIONIST_MOBILE_TABS, fab: NUTRITIONIST_MOBILE_FAB },
  admin:        { nav: ADMIN_NAV,        tabs: ADMIN_MOBILE_TABS,        fab: ADMIN_MOBILE_FAB },
} as const

/**
 * Wraps every authenticated dashboard page (user / nutritionist / admin).
 * - Fixed 240px sidebar on md+; off-canvas drawer on mobile
 * - Topbar with search + notifications + avatar dropdown
 * - Mobile bottom tab bar with center FAB
 *
 * RTL: the sidebar drawer slides in from the start side automatically
 * because we use logical inset (`inset-y-0 start-0`).
 */
export function DashboardShell({
  children,
  role = 'user',
}: DashboardShellProps) {
  const { nav: navItems, tabs: mobileTabs, fab: mobileFab } = NAV_BY_ROLE[role]
  const t = useTranslations('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div
      data-theme="dashboard"
      className="flex h-screen text-fg-1"
      style={{ background: '#0a0a0a' }}
    >
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0">
        <Sidebar navItems={navItems} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label={t('closeSidebar')}
            onClick={() => setDrawerOpen(false)}
            className="md:hidden fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: 'rgb(0 0 0 / 0.7)' }}
          />
          <aside className="md:hidden fixed inset-y-0 start-0 z-50 w-72 max-w-[80vw] shadow-2xl">
            <div className="absolute end-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t('closeSidebar')}
                className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-surface-raised text-fg-2 hover:text-fg-1"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>
            <Sidebar
              navItems={navItems}
              onItemClick={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onOpenMenu={() => setDrawerOpen(true)} />
        <main
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
          // Custom cursor disabled in dashboards; let native cursor through
          data-cursor="ignore"
          style={{ background: '#0a0a0a' }}
        >
          {children}
        </main>
      </div>

      <MobileNav tabs={mobileTabs} fab={mobileFab} />
    </div>
  )
}
