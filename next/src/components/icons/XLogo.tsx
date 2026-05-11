import type { SVGProps } from 'react'

/**
 * X (formerly Twitter) social icon. Drawn from scratch as two
 * crossing diagonal strokes — basic geometry, no copied artwork,
 * licensable as your own. Lucide-react still ships only the legacy
 * Twitter bird, so this fills the gap with a lucide-style API
 * (className + strokeWidth).
 */
export function XLogo({
  className,
  strokeWidth = 2,
  ...rest
}: SVGProps<SVGSVGElement> & { strokeWidth?: number | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d="M4 4 L20 20" />
      <path d="M20 4 L4 20" />
    </svg>
  )
}
