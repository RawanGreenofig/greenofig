'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/cn'
import type { DashboardNavItem } from './nav'

const ACTIVE = 'hsl(var(--primary))'
const INACTIVE = 'hsl(var(--muted-foreground))'

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
      className="md:hidden fixed inset-x-0 bottom-0 z-30 glass-effect"
      style={{
        borderRadius: 0,
        borderTop: '1px solid hsl(var(--border))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-3 pt-2 pb-2 max-w-screen-md mx-auto">
        {tabs.slice(0, 2).map((item) => (
          <TabButton
            key={item.href}
            item={item}
            active={isActive(item.href)}
            t={t}
          />
        ))}

        {/* Center FAB — lime gradient. Plain navigation to the
         * scanner page (or whatever the role's FAB target is). */}
        <Link
          href={fab.href}
          aria-label={t(fab.labelKey)}
          className="rounded-full transition-transform active:scale-95"
          style={{
            width: 56,
            height: 56,
            marginTop: -22,
            background:
              'linear-gradient(135deg, hsl(var(--primary)), hsl(100, 70%, 45%))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow: '0 8px 24px hsl(var(--primary) / 0.45)',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            lineHeight: 0,
          }}
        >
          <FabIcon size={24} strokeWidth={2.25} style={{ display: 'block' }} />
          <span className="sr-only">{t(fab.labelKey)}</span>
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
        'flex flex-col items-center justify-center flex-1 min-w-0 px-1 py-1 transition-colors rounded-xl',
      )}
      style={{
        color: active ? ACTIVE : INACTIVE,
        background: active ? 'hsl(var(--primary) / 0.12)' : 'transparent',
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
