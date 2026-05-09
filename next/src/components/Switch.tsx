'use client'

/**
 * Toggle switch shared across all dashboards. Visual matches the polished
 * version that already shipped on /dashboard/settings — chunky 44×24 track,
 * 18×18 thumb that slides to start-2 / end-2, lime-500 when on, frosted
 * white when off. Fully keyboard accessible (Space + Enter toggle).
 *
 * Used by: nutritionist/settings, nutritionist/store, admin/store, and
 * any new toggles. admin/feature-flags keeps a local copy for its
 * danger-dot variant.
 */
export function Switch({
  on,
  onChange,
  ariaLabel,
  disabled,
}: {
  on: boolean
  onChange: (v: boolean) => void
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange(!on)}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!on)
        }
      }}
      style={{
        width: 44,
        minWidth: 44,
        height: 24,
        borderRadius: 12,
        backgroundColor: on ? '#84cc16' : 'rgba(255,255,255,0.12)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 200ms',
        flexShrink: 0,
        display: 'inline-block',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#fff',
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          transition: 'left 200ms',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  )
}
