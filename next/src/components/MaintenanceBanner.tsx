'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle } from '@/icons'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'

/**
 * Site-wide banner shown at the top of every page when an admin has
 * flipped the `maintenance_mode` row in `platform_settings` to true.
 * Reads via the realtime hook, so flipping the toggle in
 * /admin/store propagates to every open tab without a refresh.
 *
 * Returns null while the setting is loading or when not enabled, so
 * SSR and the unauthenticated marketing pages stay clean.
 */
export function MaintenanceBanner() {
  const { value, isLoading } = usePlatformSetting<boolean>('maintenance_mode')
  const t = useTranslations('maintenanceBanner')
  if (isLoading || value !== true) return null
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        background: '#fbbf24',
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
      <AlertTriangle
        className="w-4 h-4 shrink-0"
        strokeWidth={2}
        color="#0d1a12"
      />
      <span>{t('message')}</span>
    </div>
  )
}
