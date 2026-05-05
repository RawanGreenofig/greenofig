'use client'

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { DashboardNavItem } from './nav'

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
    href === pathname || (href !== '/dashboard' && href !== '/nutritionist' && href !== '/admin' && pathname.startsWith(`${href}/`))

  // Inject the FAB at center (between index 1 and 2 of 4 tabs).
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border"
    >
      <div className="flex items-end justify-around px-3 pt-2 pb-3 max-w-screen-md mx-auto">
        {tabs.slice(0, 2).map((item) => (
          <TabButton key={item.href} item={item} active={isActive(item.href)} t={t} />
        ))}

        <Link
          href={fab.href}
          aria-label={t(fab.labelKey)}
          className="-mt-8 inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60"
        >
          <FabIcon className="w-6 h-6" strokeWidth={2} />
          <span className="sr-only">{t(fab.labelKey)}</span>
          <Plus aria-hidden className="hidden" />
        </Link>

        {tabs.slice(2).map((item) => (
          <TabButton key={item.href} item={item} active={isActive(item.href)} t={t} />
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
        'flex flex-col items-center gap-1 min-w-[48px] py-1 transition-colors',
        active ? 'text-lime-400' : 'text-fg-2 hover:text-fg-1',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
      <span className="text-[10px] font-medium">{t(labelKey)}</span>
    </Link>
  )
}
