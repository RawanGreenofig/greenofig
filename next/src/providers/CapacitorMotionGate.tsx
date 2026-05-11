'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { isInsideCapacitor } from '@/lib/is-capacitor'

/**
 * Inside the Capacitor Android WebView, neutralize framer-motion
 * scroll-triggered animations so they can't compete with the
 * native WebView scroll handler:
 *
 *  1. MotionConfig reducedMotion="always" → all transitions render
 *     as instant snaps to the final state.
 *
 *  2. IntersectionObserver patch → every observed element is
 *     reported as already-intersecting on the next tick. This is
 *     what makes `whileInView` resolve immediately on mount
 *     instead of waiting for a scroll event. Without it the
 *     element still listens to touchmove (waiting for the
 *     scroll-to-reveal moment), which is what was stealing the
 *     gesture.
 *
 *  In a regular browser this component is a passthrough — zero
 *  effect on the desktop / mobile-web experience.
 */
export function CapacitorMotionGate({ children }: { children: ReactNode }) {
  const [neutralized, setNeutralized] = useState(false)

  useEffect(() => {
    if (!isInsideCapacitor()) return
    if (typeof window === 'undefined') return

    // Patch IntersectionObserver so framer-motion's whileInView
    // (and any other library using IO for reveal animations)
    // resolves instantly. We wrap the original constructor so it
    // still works for anything that genuinely needs intersection
    // tracking — we just *also* schedule an immediate "everything
    // is intersecting" callback for the elements that get observed.
    const Original = window.IntersectionObserver
    if (Original && !('__greenofigPatched' in Original)) {
      class PatchedIO extends Original {
        observe(target: Element) {
          super.observe(target)
          // Defer to the next tick so consumers can read the
          // observer's state before we report the synthetic entry.
          setTimeout(() => {
            const entry = {
              isIntersecting: true,
              intersectionRatio: 1,
              target,
              boundingClientRect: target.getBoundingClientRect(),
              intersectionRect: target.getBoundingClientRect(),
              rootBounds: null,
              time: performance.now(),
            } as unknown as IntersectionObserverEntry
            try {
              // @ts-expect-error — calling the original callback
              this.callback?.([entry], this)
            } catch {
              /* observer may not have a `callback` ref — that's fine */
            }
          }, 0)
        }
      }
      // Mark so we don't double-patch on fast-refresh.
      Object.defineProperty(PatchedIO, '__greenofigPatched', { value: true })
      // Re-expose the original-name semantics.
      ;(window as unknown as { IntersectionObserver: typeof Original })
        .IntersectionObserver = PatchedIO as unknown as typeof Original
    }

    setNeutralized(true)
  }, [])

  if (!neutralized) return <>{children}</>
  return (
    <MotionConfig reducedMotion="always" transition={{ duration: 0 }}>
      {children}
    </MotionConfig>
  )
}
