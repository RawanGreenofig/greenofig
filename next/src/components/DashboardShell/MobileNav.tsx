'use client'

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { DashboardNavItem } from './nav'

// All chrome reads from CSS vars so the bar tracks the dashboard
// theme automatically. FAB stays a literal lime gradient — that's
// the brand action color, not a theme token.
const NAV_BG = 'var(--gf-surface)'
const NAV_BORDER = 'var(--gf-border)'
const ACTIVE = '#a3e635'
const INACTIVE = 'var(--gf-fg-3)'

export function MobileNav({
  tabs,
  fab,
}: {
  tabs: DashboardNavItem[]
  fab: DashboardNavItem
}) {
  const t = useTranslations()
  const pathname = usePathname()
  const FabIcon = fab.Icon

  const isActive = (href: string) =>
    href === pathname ||
    (href !== '/dashboard' &&
      href !== '/nutritionist' &&
      href !== '/admin' &&
      pathname.startsWith(`${href}/`))

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 backdrop-blur-md"
      style={{
        background: `${NAV_BG}f0`,
        borderTop: `1px solid ${NAV_BORDER}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-end justify-around px-3 pt-1 pb-2 max-w-screen-md mx-auto">
        {tabs.slice(0, 2).map((item) => (
          <TabButton
            key={item.href}
            item={item}
            active={isActive(item.href)}
            t={t}
          />
        ))}

        {/* Center FAB — lime gradient, ringed in the page bg so it
         * lifts above the bar. Slightly raised with a soft glow. */}
        <Link
          href={fab.href}
          aria-label={t(fab.labelKey)}
          className="relative inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            width: 56,
            height: 56,
            marginTop: -20,
            background:
              'linear-gradient(to bottom, var(--gf-primary-text, #a3e635), var(--gf-primary-dark, #65a30d))',
            color: 'var(--gf-bg, #080e08)',
            border: '3px solid var(--gf-bg)',
            boxShadow: '0 4px 16px rgba(163, 230, 53, 0.4)',
          }}
        >
          <FabIcon className="w-6 h-6" strokeWidth={2.5} />
          <span className="sr-only">{t(fab.labelKey)}</span>
          <Plus aria-hidden className="hidden" />
        </Link>

        {tabs.slice(2).map((item) => (
          <TabButton
            key={item.href}
            item={item}
            active={isActive(item.href)}
            t={t}
          />
        ))}
      </div>
    </nav>
  )
}

function TabButton({
  item,
  active,
  t,
}: {
  item: DashboardNavItem
  active: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const { Icon, labelKey, href } = item
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center flex-1 min-w-0 px-1 transition-colors',
      )}
      style={{
        color: active ? ACTIVE : INACTIVE,
        minHeight: 56,
        gap: 4,
      }}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        className="shrink-0"
        strokeWidth={active ? 2 : 1.75}
        size={22}
      />
      <span className="text-[10px] font-medium leading-none truncate max-w-full">
        {t(labelKey)}
      </span>
    </Link>
  )
}
