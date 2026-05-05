'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

interface UseScrollFramesOpts {
  sectionRef: RefObject<HTMLElement>
  totalFrames: number
  ready: boolean
  onUpdate: (frameIdx: number, progress: number) => void
}

let lenisWired = false

/**
 * Wires a 500vh pinned scroll on the given section element.
 * Drives a `frame` value from 0 → totalFrames - 1 with scrub-tied
 * smoothing (0.5s lag) and calls `onUpdate(idx, progress)` on every tick.
 *
 * Skips entirely under prefers-reduced-motion, which lets the parent
 * fall back to a static frame.
 */
export function useScrollFrames({
  sectionRef,
  totalFrames,
  ready,
  onUpdate,
}: UseScrollFramesOpts) {
  useEffect(() => {
    const section = sectionRef.current
    if (!section || !ready) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    // Wire Lenis ↔ ScrollTrigger exactly once per session.
    const lenis = window.__lenis
    if (lenis && !lenisWired) {
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add((time: number) => {
        lenis.raf(time * 1000)
      })
      gsap.ticker.lagSmoothing(0)
      lenisWired = true
    }

    const obj = { f: 0 }
    const tween = gsap.to(obj, {
      f: totalFrames - 1,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=500%',
        scrub: 0.5,
        pin: true,
        invalidateOnRefresh: true,
      },
      onUpdate() {
        const idx = Math.round(obj.f)
        const progress = obj.f / (totalFrames - 1)
        onUpdate(idx, progress)
      },
    })

    // Re-measure once mounted images affect layout (loading screen fades out).
    ScrollTrigger.refresh()

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [sectionRef, totalFrames, ready, onUpdate])
}
