'use client'

/**
 * Single-toggle switch used across the dashboards. Lime when on, dim
 * surface with a border when off. The thumb is a small light circle
 * that slides between the two ends.
 *
 * Lifted out of nutritionist/settings/page.tsx so admin/feature-flags,
 * admin/store, nutritionist/store and any new toggles can share one
 * implementation instead of inlining a tenth variation each.
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
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`shrink-0 relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        on ? 'bg-lime-400' : 'bg-bg-deeper border border-border'
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-bg shadow transition-all ${
          on ? 'start-[18px]' : 'start-0.5'
        }`}
      />
    </button>
  )
}
