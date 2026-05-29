import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * Greenofig wordmark. Logo image + Cormorant 700 serif text — "Greeno" in
 * the button lime (#a3e635), "fig" in deep plum (--gf-wordmark-fig,
 * which lifts to a brighter plum on the dark dashboard).
 * Image fallback: `/logo.png` from public/.
 *
 * Three sizes:
 *   sm — GhostBar mobile, footer mobile (24px logo, base text)
 *   md — GhostBar desktop, hero (32px logo, lg text)
 *   lg — Footer desktop (40px logo, 2xl text)
 */
export function Wordmark({
  className,
  size = 'md',
  hideTextOnMobile = false,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  /** When true, only the logo shows on mobile, text appears at sm+ */
  hideTextOnMobile?: boolean
}) {
  const logoPx = size === 'sm' ? 24 : size === 'lg' ? 40 : 32
  const textSize =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
        ? 'text-2xl lg:text-3xl'
        : 'text-lg lg:text-xl'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 leading-none select-none',
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt=""
        aria-hidden
        width={logoPx}
        height={logoPx}
        priority
        className="object-contain"
        style={{ width: logoPx, height: logoPx }}
      />
      <span
        className={cn(
          'font-sans font-bold tracking-tight',
          textSize,
          hideTextOnMobile && 'hidden sm:inline',
        )}
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        {/* "Greeno" matches the .btn-primary lime (#a3e635). */}
        <span style={{ color: '#a3e635' }}>Greeno</span>
        <span style={{ color: 'var(--gf-wordmark-fig)' }}>fig</span>
      </span>
    </span>
  )
}
