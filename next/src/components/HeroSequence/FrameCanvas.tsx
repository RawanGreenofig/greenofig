'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

export interface FrameCanvasHandle {
  setFrame: (idx: number) => void
}

interface FrameCanvasProps {
  frames: HTMLImageElement[]
  initialFrame?: number
}

/** Cap dpr at 1.5 — full retina is overkill for this 1920×1080 source. */
const MAX_DPR = 1.5

/**
 * Fixed full-viewport <canvas> that draws one of the preloaded frames.
 * - object-fit: cover behaviour (manual scale math)
 * - devicePixelRatio aware (capped at 1.5)
 * - Imperative API so the parent's scroll loop can drive frame updates
 *   without re-rendering React on every tick.
 */
export const FrameCanvas = forwardRef<FrameCanvasHandle, FrameCanvasProps>(
  function FrameCanvas({ frames, initialFrame = 0 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const currentFrameRef = useRef(initialFrame)

    const draw = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = frames[currentFrameRef.current]
      if (!img || !img.complete) return

      const cw = canvas.width
      const ch = canvas.height
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      if (!iw || !ih) return

      // object-fit: cover — scale to fill, center, no distortion.
      const scale = Math.max(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale
      const dx = (cw - dw) / 2
      const dy = (ch - dh) / 2

      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(img, dx, dy, dw, dh)
    }, [frames])

    useImperativeHandle(
      ref,
      () => ({
        setFrame(idx: number) {
          const clamped = Math.max(0, Math.min(frames.length - 1, idx))
          if (clamped === currentFrameRef.current) return
          currentFrameRef.current = clamped
          draw()
        },
      }),
      [frames, draw],
    )

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const resize = () => {
        const w = window.innerWidth
        const h = window.innerHeight
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
        draw()
      }

      resize()
      window.addEventListener('resize', resize)
      return () => window.removeEventListener('resize', resize)
    }, [draw])

    // First paint once frames arrive
    useEffect(() => {
      draw()
    }, [draw])

    return (
      <canvas
        ref={canvasRef}
        aria-hidden
        className="fixed inset-0 z-0 h-screen w-screen"
        style={{ willChange: 'transform' }}
      />
    )
  },
)
