'use client'

import { useEffect, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isInsideCapacitor } from '@/lib/is-capacitor'

let registered = false

/**
 * Registers GSAP plugins exactly once per session and configures the
 * ticker to play well with Lenis smooth scrolling.
 *
 * Inside the Capacitor Android WebView we skip registration entirely
 * AND kill any ScrollTrigger instances that managed to attach before
 * we got here — ScrollTrigger's scroll-jacking handler is one of the
 * known causes of mid-page scroll lockup on Android.
 */
export function GSAPProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (isInsideCapacitor()) {
      // Tear down anything that may have registered before we mounted
      // (StrictMode, fast refresh, an out-of-order useEffect race).
      try {
        const all = ScrollTrigger.getAll?.()
        if (all && all.length) all.forEach((t) => t.kill())
        // Disable scroll-based animations globally for this session.
        gsap.ticker.lagSmoothing(0)
      } catch {
        /* ScrollTrigger may not have been registered — safe to ignore. */
      }
      return
    }
    if (registered) return
    gsap.registerPlugin(ScrollTrigger)
    gsap.ticker.lagSmoothing(0)
    registered = true
  }, [])

  return <>{children}</>
}
