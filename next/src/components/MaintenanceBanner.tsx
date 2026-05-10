'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, Megaphone } from '@/icons'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'

/**
 * Site-wide banner shown at the top of every page. Two layers:
 *  1. maintenance_mode → amber AlertTriangle banner (high priority)
 *  2. site_announcement → lime Megaphone banner with admin-authored copy
 * Maintenance wins if both are set. Reads via realtime so flipping the
 * toggle in /admin/store propagates to every open tab instantly.
 *
 * Returns null while loading or when neither is set, so SSR and the
 * unauthenticated marketing pages stay clean.
 */
export function MaintenanceBanner() {
  const { value: maintenance, isLoading: maintLoading } =
    usePlatformSetting<boolean>('maintenance_mode')
  const { value: announcement, isLoading: annLoading } =
    usePlatformSetting<string>('site_announcement')
  const t = useTranslations('maintenanceBanner')

  if (maintLoading || annLoading) return null

  if (maintenance === true) {
    return (
      <Bar bg="#fbbf24" Icon={AlertTriangle}>
        {t('message')}
      </Bar>
    )
  }
  if (typeof announcement === 'string' && announcement.trim().length > 0) {
    return (
      <Bar bg="#a3e635" Icon={Megaphone}>
        {announcement}
      </Bar>
    )
  }
  return null
}

function Bar({
  bg,
  Icon,
  children,
}: {
  bg: string
  Icon: typeof AlertTriangle
  children: React.ReactNode
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: bg,
        color: '#0d1a12',
        fontWeight: 600,
        fontSize: 13,
        lineHeight: 1.3,
        textAlign: 'center',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} color="#0d1a12" />
      <span>{children}</span>
    </div>
  )
}
