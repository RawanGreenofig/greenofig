'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'
import { isInsideCapacitor } from '@/lib/is-capacitor'

/**
 * Mounts a single Lenis smooth-scroll instance for the document.
 * Hero step 5 will hook this into GSAP ScrollTrigger via gsap.ticker.
 *
 * Skipped on:
 *   - prefers-reduced-motion
 *   - dashboard / admin / nutritionist routes — their inner <main> scrolls,
 *     and a body-level smooth-wheel interceptor fights the inner scroll
 *     container, leaving the page feeling frozen to the mouse wheel.
 *   - the Capacitor WebView (Android APK) — Lenis hijacks wheel/touch
 *     events which intermittently kills native scroll inside the
 *     WebView. Detected via the UA tag we set in capacitor.config.ts
 *     (`GreenofigApp/...`) and the `window.Capacitor` runtime global.
 */
const APP_PATH_RX = /^\/(?:[a-z]{2}\/)?(dashboard|admin|nutritionist|onboarding|sign-in|sign-up|reset-password|forgot-password)/

/**
 * Tag <html> with `in-capacitor` when running inside the Android
 * WebView so globals.css can apply WebView-specific scroll fixes
 * (touch-action: pan-y on the body, pan-x on horizontal scrollers)
 * without polluting the browser experience.
 */
function useCapacitorBodyClass() {
  useEffect(() => {
    if (!isInsideCapacitor()) return
    const root = document.documentElement
    root.classList.add('in-capacitor')
    return () => root.classList.remove('in-capacitor')
  }, [])
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAppShell = !!pathname && APP_PATH_RX.test(pathname)
  useCapacitorBodyClass()

  useEffect(() => {
    if (isAppShell) return
    if (isInsideCapacitor()) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // Expose for GSAP step 5 (typed below)
    window.__lenis = lenis

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      delete window.__lenis
    }
  }, [isAppShell])

  return <>{children}</>
}

declare global {
  interface Window {
    __lenis?: Lenis
  }
}
