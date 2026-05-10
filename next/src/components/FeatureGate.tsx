'use client'

import { Power } from '@/icons'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'

/**
 * Site-wide feature gate driven by `platform_settings.<key>`. Default-on:
 * a missing or null value renders children normally. Only an explicit
 * `false` / `'false'` shows the disabled notice.
 *
 * Used to gate full pages (bookings, scanner, community, research desk)
 * so the admin can flip a feature off in /admin/store without having to
 * deploy code. Consumer-side; the actual data isn't deleted.
 */
export function FeatureGate({
  settingKey,
  label,
  children,
}: {
  settingKey: string
  label: string
  children: React.ReactNode
}) {
  const { value, isLoading } = usePlatformSetting<boolean | string>(settingKey)
  if (isLoading) return null
  const disabled = value === false || value === 'false'
  if (!disabled) return <>{children}</>
  return (
    <div className="px-4 md:px-8 py-12 max-w-screen-md mx-auto">
      <div
        className="rounded-xl border border-border bg-surface p-8 md:p-10 text-center"
        style={{ background: 'var(--gf-surface)' }}
      >
        <Power
          className="w-10 h-10 mx-auto"
          strokeWidth={1.5}
          color="var(--gf-fg-3)"
        />
        <h2 className="mt-4 text-lg font-semibold text-fg-1">
          {label} is currently unavailable
        </h2>
        <p className="mt-2 text-sm text-fg-2">
          An admin has temporarily disabled this feature. Please check back
          soon.
        </p>
      </div>
    </div>
  )
}
