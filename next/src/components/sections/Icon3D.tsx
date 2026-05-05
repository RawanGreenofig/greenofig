import Image from 'next/image'
import { buildIconUrl } from '@/lib/constants'

export interface Icon3DProps {
  /** Hash-name slug, e.g. "634b4b-crown" */
  id: string
  /** Display size in CSS pixels (also passed to next/image). */
  size?: number
  className?: string
  /** Decorative by default. Pass alt text only when meaningful. */
  alt?: string
}

/** Single source of truth for the brand 3dicons CDN. */
export function Icon3D({ id, size = 48, className, alt = '' }: Icon3DProps) {
  return (
    <Image
      src={buildIconUrl(id)}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      className={className}
      style={{ width: size, height: size }}
    />
  )
}
