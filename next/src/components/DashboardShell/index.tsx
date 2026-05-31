'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { usePathname } from '@/i18n/navigation'
import { ThemeProvider } from '@/components/ThemeProvider'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'
import { FigyChat } from '@/components/FigyChat'
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
  CLINIC_MOBILE_TABS,
  CLINIC_MOBILE_FAB,
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
  const { nav: navItems, tabs: roleTabs, fab: roleFab } = NAV_BY_ROLE[role]
  const t = useTranslations('dashboard')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const { tier, profile } = useAuth()
  // Linked walk-in clinic clients get a clinic-specific mobile bottom bar
  // (Home + My Plan + Appointments + Payments, Messages FAB) so their own
  // pages are reachable on a phone — not the online-product tabs.
  const isClinicClient =
    role === 'user' &&
    !!(profile as { is_clinic_client?: boolean } | null)?.is_clinic_client
  const mobileTabs = isClinicClient ? CLINIC_MOBILE_TABS : roleTabs
  const mobileFab = isClinicClient ? CLINIC_MOBILE_FAB : roleFab
  // Gate the real tier behind a mount flag. SSR + first client render
  // both emit data-tier="free" so React's reconciler is happy; the
  // tier-driven CSS tokens swap on the next paint after mount. Using
  // suppressHydrationWarning alone doesn't work for ATTRIBUTE drift —
  // it only silences text-content mismatches.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // Customer chrome reflects their tier; staff chrome (admin/nutritionist)
  // is role-driven only, so force data-tier='free' for staff. Otherwise
  // staff accounts that happen to have tier='vip' in profiles (because
  // the column is NOT NULL) would render with vip-yellow chrome bleeding
  // through any role override that doesn't set every token.
  const isStaff = role === 'admin' || role === 'nutritionist'
  const rawTier = (mounted ? tier ?? 'free' : 'free') as
    | 'free'
    | 'basic'
    | 'premium'
    | 'vip'
  const dataTier: 'free' | 'basic' | 'premium' | 'vip' = isStaff ? 'free' : rawTier

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock body scroll while the dashboard drawer is open on mobile, and
  // ALWAYS restore on unmount — otherwise a navigation that unmounts the
  // shell mid-animation can leave the body locked in 'overflow: hidden'.
  useEffect(() => {
    const prev = document.body.style.overflow
    if (drawerOpen) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  return (
    <ThemeProvider>
    {/*
      data-tier flips from 'free' (no session on the server) to the real
      tier on the client once useAuth() hydrates. React threw a "Prop
      data-tier did not match" warning. suppressHydrationWarning marks
      this attribute drift as intentional — the CSS tokens scoped to
      [data-tier="..."] just re-evaluate on the next paint.
     */}
    <div
      data-theme="dashboard"
      data-tier={dataTier}
      data-role={role}
      suppressHydrationWarning
      className="flex h-screen overflow-hidden text-fg-1"
      style={{ background: 'var(--gf-bg)' }}
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
          <aside
            className="md:hidden fixed inset-y-0 start-0 z-50 w-72 max-w-[80vw] shadow-2xl"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div
              className="absolute end-3 z-10"
              style={{ top: 'calc(12px + env(safe-area-inset-top))' }}
            >
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
          className="dashboard-main flex-1 overflow-y-auto overscroll-contain pb-20 md:pb-0"
          // Custom cursor disabled in dashboards; let native cursor through
          data-cursor="ignore"
          style={{
            background: 'var(--gf-bg)',
            scrollbarGutter: 'stable',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </main>
      </div>

      <MobileNav tabs={mobileTabs} fab={mobileFab} />
      <FigyChat />
    </div>
    </ThemeProvider>
  )
}
