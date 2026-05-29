import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * Greenofig wordmark. Logo image + Space Grotesk 700 text — "Greeno" in
 * neon green, "fig" in neon fig-violet, each with a thin dark edge + soft
 * glow so the neon reads on both the light pistachio site and the dark
 * dashboard. Image fallback: `/logo.png` from public/.
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
        style={{ fontFamily: 'var(--font-space-grotesk), var(--font-inter), system-ui, sans-serif' }}
      >
        <span
          style={{
            color: '#39ff7a',
            textShadow:
              '0 0 1px rgba(20,45,28,0.9), 0 0 10px rgba(57,255,122,0.55)',
          }}
        >
          Greeno
        </span>
        <span
          style={{
            color: '#d96bff',
            textShadow:
              '0 0 1px rgba(45,20,55,0.9), 0 0 10px rgba(217,107,255,0.55)',
          }}
        >
          fig
        </span>
      </span>
    </span>
  )
}
