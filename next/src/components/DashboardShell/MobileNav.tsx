'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
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
  const router = useRouter()
  const FabIcon = fab.Icon
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const isActive = (href: string) =>
    href === pathname ||
    (href !== '/dashboard' &&
      href !== '/nutritionist' &&
      href !== '/admin' &&
      pathname.startsWith(`${href}/`))

  // FAB behaviour: if the FAB destination is the food scanner, open
  // the device camera directly instead of just navigating. After the
  // user picks/captures a photo, stash it in sessionStorage as a data
  // URL and route to /dashboard/scanner — the scanner page reads
  // sessionStorage on mount and auto-processes the image.
  const isScannerFab = fab.href === '/dashboard/scanner'
  const onFabClick = (e: React.MouseEvent) => {
    if (!isScannerFab) return
    e.preventDefault()
    cameraInputRef.current?.click()
  }
  const onCameraPick = async (file: File | null | undefined) => {
    if (!file) return
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = String(reader.result ?? '')
        try {
          window.sessionStorage.setItem('gf_scanner_pending', dataUrl)
        } catch {
          /* fine — fall through to plain navigation */
        }
        router.push('/dashboard/scanner')
      }
      reader.readAsDataURL(file)
    } catch {
      router.push('/dashboard/scanner')
    }
  }

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
      <div className="flex items-end justify-around px-3 pt-1 pb-2 max-w-screen-md mx-auto">
        {tabs.slice(0, 2).map((item) => (
          <TabButton
            key={item.href}
            item={item}
            active={isActive(item.href)}
            t={t}
          />
        ))}

        {/* Center FAB — lime gradient. Camera FAB triggers a hidden
         * file input with capture='environment' so the device camera
         * opens directly. Other FABs navigate normally. */}
        {isScannerFab && (
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => void onCameraPick(e.target.files?.[0])}
          />
        )}
        <Link
          href={fab.href}
          aria-label={t(fab.labelKey)}
          onClick={onFabClick}
          className="relative inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            width: 56,
            height: 56,
            marginTop: -20,
            background:
              'linear-gradient(135deg, hsl(var(--primary)), hsl(100, 70%, 45%))',
            color: 'hsl(var(--primary-foreground))',
            border: '3px solid hsl(var(--background))',
            boxShadow: '0 8px 24px hsl(var(--primary) / 0.45)',
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
