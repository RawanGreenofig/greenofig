'use client'

import { useEffect, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/**
 * Registers GSAP plugins exactly once per session and configures the
 * ticker to play well with Lenis smooth scrolling.
 */
export function GSAPProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (registered) return
    gsap.registerPlugin(ScrollTrigger)
    gsap.ticker.lagSmoothing(0)
    registered = true
  }, [])

  return <>{children}</>
}
