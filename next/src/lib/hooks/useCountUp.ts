'use client'

import { useEffect, useRef, useState } from 'react'

interface Options {
  target: number
  duration?: number // ms
  rootMargin?: string
}

/**
 * Counts 0 → target with an ease-out curve when the returned ref's
 * element first enters the viewport. Fires exactly once.
 *
 * Pure DOM (IntersectionObserver + rAF) — no library.
 */
export function useCountUp<T extends Element = HTMLDivElement>({
  target,
  duration = 2000,
  rootMargin = '0px 0px -10% 0px',
}: Options) {
  const ref = useRef<T | null>(null)
  const [value, setValue] = useState(0)
  const fired = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof window === 'undefined') return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setValue(target)
      fired.current = true
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || fired.current) continue
          fired.current = true
          observer.disconnect()

          const start = performance.now()
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration)
            // ease-out: cubic
            const eased = 1 - Math.pow(1 - t, 3)
            setValue(Math.round(eased * target))
            if (t < 1) requestAnimationFrame(tick)
            else setValue(target)
          }
          requestAnimationFrame(tick)
        }
      },
      { rootMargin, threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [target, duration, rootMargin])

  return { ref, value }
}
