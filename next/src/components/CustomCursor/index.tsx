'use client'

import { useEffect, useRef } from 'react'

/**
 * Lightweight custom cursor: a single fixed lime dot that lerps behind
 * the pointer with mix-blend-difference for legibility on any background.
 *
 * One passive mousemove listener, one rAF loop, zero React state.
 * Hidden on touch / coarse pointers — those devices don't have a cursor.
 */
export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let x = 0
    let y = 0
    let tx = 0
    let ty = 0
    let rafId = 0

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
    }

    const tick = () => {
      x += (tx - x) * 0.12
      y += (ty - y) * 0.12
      if (dot.current) {
        dot.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      }
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={dot}
      id="gf-cursor"
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: 'var(--gf-lime-400)',
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
        mixBlendMode: 'difference',
        transition: 'width 0.2s, height 0.2s',
      }}
    />
  )
}
