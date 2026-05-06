'use client'

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { DashboardNavItem } from './nav'

const NAV_BG = '#111111'
const NAV_BORDER = '#222222'
const ACCENT = '#4ade80'
const INACTIVE = '#888888'

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
      }}
    >
      <div className="flex items-end justify-around px-3 pt-2 pb-3 max-w-screen-md mx-auto">
        {tabs.slice(0, 2).map((item) => (
          <TabButton
            key={item.href}
            item={item}
            active={isActive(item.href)}
            t={t}
          />
        ))}

        <Link
          href={fab.href}
          aria-label={t(fab.labelKey)}
          className="-mt-8 inline-flex items-center justify-center w-14 h-14 rounded-full"
          style={{
            background: ACCENT,
            color: '#0a0a0a',
            boxShadow: '0 4px 20px rgb(74 222 128 / 0.35)',
          }}
        >
          <FabIcon className="w-6 h-6" strokeWidth={2} />
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
        'flex flex-col items-center gap-1 min-w-[48px] py-1 transition-colors',
      )}
      style={{ color: active ? ACCENT : INACTIVE }}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
      <span className="text-[10px] font-medium">{t(labelKey)}</span>
    </Link>
  )
}
