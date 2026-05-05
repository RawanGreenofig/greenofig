'use client'

import Image from 'next/image'
import { useState } from 'react'

const FALLBACK =
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'

interface Props {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

/**
 * Image with a single-shot fallback to a generic Unsplash food photo
 * if the source fails to load. Used by blog listing/article cards so
 * a broken Unsplash URL doesn't leave a hole in the layout.
 */
export function ArticleImage({
  src,
  alt,
  width = 800,
  height = 450,
  className = 'w-full h-full object-cover',
  priority = false,
}: Props) {
  const [current, setCurrent] = useState(src)
  return (
    <Image
      src={current}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized
      onError={() => {
        if (current !== FALLBACK) setCurrent(FALLBACK)
      }}
    />
  )
}
