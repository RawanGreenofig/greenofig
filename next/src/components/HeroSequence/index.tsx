'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import { heroFrames } from '@/lib/tokens'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'
import { isInsideCapacitor } from '@/lib/is-capacitor'

interface HeroSettings {
  headline1?: string
  headline2?: string
  subline1?: string
  subline2?: string
  subline3?: string
  ctaLabel?: string
  secondHeadline1?: string
  secondHeadline2?: string
}
import { FrameCanvas, type FrameCanvasHandle } from './FrameCanvas'
import { WordReveal } from './WordReveal'
import { useScrollFrames } from './useScrollFrames'

const TOTAL = heroFrames.total
const STILL_FRAME = heroFrames.reducedMotionStill

// Light, single-layer shadow for legibility — no halo / backdrop / glow.
const TEXT_SHADOW = '0 2px 8px rgb(0 0 0 / 0.9)'

const framePath = (i: number) =>
  `/frames/frame${String(i + 1).padStart(3, '0')}.jpg`

/**
 * Hero scroll sequence.
 * Word triggers (per spec):
 *   5  "Nourish"
 *   9  "Better."             (lime accent)
 *   14 "Personalized nutrition"
 *   18 "plans that work"
 *   22 "for your body."
 *   30 all exit
 *   35 "Your healthiest self" + "starts here."
 *   38 CTA — "Book a Free Consultation"
 */
export function HeroSequence() {
  const t = useTranslations('marketing')
  const isAr = useLocale() === 'ar'
  // /admin/site-editor → site_hero. Editor is single-language so we
  // only apply the override on the English locale; Arabic keeps its
  // translated copy. Each field falls back to the translated default
  // when empty so a partial save doesn't blank the rest.
  const { value: heroOv } = usePlatformSetting<HeroSettings>('site_hero')
  const heroEat    = (!isAr && heroOv?.headline1?.trim()) || t('heroEat')
  const heroReal   = (!isAr && heroOv?.headline2?.trim()) || t('heroReal')
  const heroSub    =
    !isAr && (heroOv?.subline1 || heroOv?.subline2 || heroOv?.subline3)
      ? [heroOv.subline1, heroOv.subline2, heroOv.subline3]
          .filter((s) => s && s.trim().length > 0)
          .join(' ')
      : t('heroSub')
  const heroSecond1 = (!isAr && heroOv?.secondHeadline1?.trim()) || t('heroSecond1')
  const heroSecond2 = (!isAr && heroOv?.secondHeadline2?.trim()) || t('heroSecond2')
  const heroCta     = (!isAr && heroOv?.ctaLabel?.trim()) || t('heroCta')
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<FrameCanvasHandle>(null)

  const [framesLoaded, setFramesLoaded] = useState(0)
  const [frames, setFrames] = useState<HTMLImageElement[] | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [staticMode, setStaticMode] = useState(false)
  const [inCap, setInCap] = useState(false)

  useEffect(() => {
    if (isInsideCapacitor()) {
      // eslint-disable-next-line no-console
      console.log('[gf-cap] HeroSequence: Capacitor detected, switching to static hero')
      setInCap(true)
      setStaticMode(true)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowCpu = (navigator.hardwareConcurrency || 4) < 4
    if (reduced || lowCpu) setStaticMode(true)
  }, [])

  useEffect(() => {
    // Inside Capacitor we render the static hero — no canvas, no
    // scrub, no preloaded frames. Skipping the fetch saves ~40+
    // image requests and prevents the loading-screen flash that
    // briefly mounts a fixed full-viewport overlay (which by
    // itself can lock WebView scroll).
    if (isInsideCapacitor()) return

    let cancelled = false
    const imgs: HTMLImageElement[] = []
    let loaded = 0

    const promises = Array.from({ length: TOTAL }, (_, i) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image()
        img.decoding = 'async'
        img.src = framePath(i)
        img.onload = () => {
          loaded += 1
          if (!cancelled) setFramesLoaded(loaded)
          resolve(img)
        }
        img.onerror = () => reject(new Error(`Failed to load ${framePath(i)}`))
        imgs[i] = img
      })
    })

    Promise.all(promises)
      .then(() => {
        if (cancelled) return
        setFrames(imgs)
      })
      .catch(() => {
        if (cancelled) return
        setFrames(imgs.filter(Boolean))
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleFrameUpdate = useCallback((idx: number) => {
    canvasRef.current?.setFrame(idx)
    setCurrentFrame(idx)
  }, [])

  useScrollFrames({
    sectionRef,
    totalFrames: TOTAL,
    ready: !!frames && !staticMode,
    onUpdate: handleFrameUpdate,
  })

  useEffect(() => {
    if (!frames) return
    const initial = staticMode ? STILL_FRAME : 0
    canvasRef.current?.setFrame(initial)
    setCurrentFrame(initial)
  }, [frames, staticMode])

  const isLoading = framesLoaded < TOTAL
  const progressPct = Math.round((framesLoaded / TOTAL) * 100)

  // ── Capacitor branch ─────────────────────────────────────────────
  // Inside the Android app the full hero (fixed canvas + fixed word
  // overlay + ScrollTrigger pin) breaks the WebView's native scroll.
  // Render a flow-positioned static hero instead: single section, no
  // fixed children, no animations. Detection is both UA-based and
  // state-based so the swap also happens if window.Capacitor lands
  // a bit later than navigator.userAgent.
  if (inCap || isInsideCapacitor()) {
    // eslint-disable-next-line no-console
    console.log('[gf-cap] HeroSequence: rendering static hero (no fixed children)')
    return (
      <section
        aria-label="Hero — Nourish Better."
        className="relative w-full overflow-hidden"
        style={{ background: '#d4eac6' }}
      >
        <div className="relative w-full" style={{ aspectRatio: '16 / 10' }}>
          <Image
            src={framePath(STILL_FRAME)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Soft bottom gradient to ground the text */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(212,234,198,0) 35%, rgba(212,234,198,0.88) 100%)',
            }}
          />
        </div>

        <div className="px-6 -mt-16 relative z-10 pb-12 max-w-screen-md mx-auto text-center">
          <h1
            className="font-display font-bold text-fg-1"
            style={{
              fontSize: 'clamp(40px, 9vw, 88px)',
              lineHeight: 0.98,
              letterSpacing: '-0.03em',
              textShadow: TEXT_SHADOW,
              fontVariationSettings:
                "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {heroEat}{' '}
            <span className="text-lime-400">{heroReal}</span>
          </h1>
          <p
            className="mt-5 text-base md:text-lg text-fg-1"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {heroSub}
          </p>
          <Link
            href="/#booking"
            className="mt-7 inline-flex items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-12 px-6 text-sm border border-lime-600/60"
            style={{ boxShadow: '0 8px 28px rgba(61,107,42,0.32)' }}
          >
            {heroCta}
            <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} strokeWidth={2} />
          </Link>
        </div>
      </section>
    )
  }

  // ── Word reveal triggers ──────────────────────────────────────────
  const f = staticMode ? heroFrames.cta : currentFrame
  const showWord1 = f >= heroFrames.word1
  const showWord2 = f >= heroFrames.word2
  const showSub = f >= heroFrames.sub
  const exitInitial = f >= heroFrames.exit
  const showSecond = f >= heroFrames.second1
  const showCta = f >= heroFrames.cta

  return (
    <>
      {/* Loading screen — logo only on deep green, 2px bar at the very bottom */}
      <div
        aria-hidden={!isLoading}
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0d1a12',
          display: isLoading ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: isLoading ? 'auto' : 'none',
        }}
      >
        <Image
          src="/logo.png"
          alt="Greenofig"
          width={120}
          height={120}
          priority
          style={{ objectFit: 'contain' }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            background: '#3d7a4a',
            width: `${progressPct}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <section
        ref={sectionRef}
        className="relative h-screen w-full overflow-hidden"
        aria-label="Hero — Nourish Better."
      >
        {/* Static <img> fallback for reduced-motion / low-CPU devices */}
        {staticMode && (
          <Image
            src={framePath(STILL_FRAME)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}

        {/* Live canvas — only mount once frames are loaded and not static */}
        {frames && !staticMode && (
          <FrameCanvas ref={canvasRef} frames={frames} initialFrame={0} />
        )}

        {/* Word overlay */}
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center px-6">
          <div
            className="grid grid-cols-1 grid-rows-1 text-center"
            style={{ textShadow: TEXT_SHADOW }}
          >
            {/* Initial headline group */}
            <div className="row-start-1 col-start-1 flex flex-col items-center gap-6">
              <h1
                className="font-display font-bold text-fg-1"
                style={{
                  fontSize: 'clamp(72px, 13vw, 180px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.04em',
                  fontVariationSettings:
                    "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
                }}
              >
                <WordReveal show={showWord1} exit={exitInitial}>
                  {heroEat}
                </WordReveal>{' '}
                <WordReveal
                  show={showWord2}
                  exit={exitInitial}
                  delay={120}
                  className="text-lime-400"
                >
                  {heroReal}
                </WordReveal>
              </h1>

              <div
                className="text-center"
                style={{
                  opacity: showSub && !exitInitial ? 1 : 0,
                  transition:
                    'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <p
                  className="inline-flex items-center justify-center font-sans font-medium"
                  style={{
                    color: '#1c2e20',
                    fontSize: 'clamp(15px, 2.2vw, 20px)',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                    opacity: 1,
                    padding: '12px 24px',
                    borderRadius: 9999,
                    background: 'rgba(168, 210, 138, 0.72)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(100, 160, 80, 0.4)',
                    boxShadow: '0 4px 20px rgba(40, 90, 40, 0.12)',
                  }}
                >
                  <WordReveal show={showSub} exit={exitInitial}>
                    {heroSub}
                  </WordReveal>
                </p>
              </div>
            </div>

            {/* Final headline group — overlays the initial group */}
            <div className="row-start-1 col-start-1 flex flex-col items-center gap-8">
              <h2
                className="font-display font-bold text-fg-1"
                style={{
                  fontSize: 'clamp(56px, 9vw, 132px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.04em',
                  fontVariationSettings:
                    "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
                }}
              >
                <WordReveal show={showSecond}>{heroSecond1}</WordReveal>{' '}
                <WordReveal show={showSecond} delay={120} className="text-lime-400">
                  {heroSecond2}
                </WordReveal>
              </h2>

              {/* CTA — fades + rises, then becomes interactive */}
              <div
                className="transition-all ease-out"
                style={{
                  transitionDuration: '800ms',
                  opacity: showCta ? 1 : 0,
                  transform: showCta ? 'translateY(0)' : 'translateY(16px)',
                  pointerEvents: showCta ? 'auto' : 'none',
                }}
              >
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded-pill px-6 h-12 text-base font-semibold text-bg shadow-lime-glow transition-all duration-normal ease-out hover:-translate-y-px bg-gradient-to-b from-lime-400 to-lime-600 border border-lime-600/60"
                >
                  {heroCta}
                  <ArrowRight
                    strokeWidth={2.25}
                    className="w-4 h-4 transition-transform duration-normal ease-out rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
