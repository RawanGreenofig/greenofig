'use client'

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { DashboardNavItem } from './nav'

const NAV_BG = '#0e1124'
const NAV_BORDER = '#252a45'
const FAB_BG = '#4ade80'
const FAB_BORDER = '#0d0f1a'
const ACTIVE = '#60a5fa'
const INACTIVE = '#4a5080'

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

        {/* Center FAB — larger, ringed in the page bg so it floats */}
        <Link
          href={fab.href}
          aria-label={t(fab.labelKey)}
          className="relative -mt-6 inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            width: 56,
            height: 56,
            background: FAB_BG,
            color: '#0d0f1a',
            border: `4px solid ${FAB_BORDER}`,
            boxShadow: '0 8px 24px rgb(74 222 128 / 0.25)',
          }}
        >
          <FabIcon className="w-6 h-6" strokeWidth={2.25} />
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
        'flex flex-col items-center justify-center gap-1 flex-1 min-w-0 px-1 transition-colors',
      )}
      style={{
        color: active ? ACTIVE : INACTIVE,
        minHeight: 56,
      }}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
      <span className="text-[10px] font-medium leading-none truncate max-w-full">
        {t(labelKey)}
      </span>
    </Link>
  )
}
