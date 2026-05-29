'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { ease, motion as motionTokens } from '@/lib/tokens'
import { usePlatformSetting } from '@/lib/hooks/usePlatformSetting'

const VIDEO_SRC = '/hero-video/hero.mp4'
const POSTER_SRC = '/hero-video/hero-poster.webp'

// Token cubic-bezier as a Framer-compatible 4-tuple.
const EASE_OUT = [...ease.out] as [number, number, number, number]
const CINEMA = `${motionTokens.cinema}ms cubic-bezier(0.22,1,0.36,1)`

/** Admin-editable hero copy (same shape as the old HeroSequence). */
interface HeroSettings {
  headline1?: string
  headline2?: string
  subline1?: string
  subline2?: string
  subline3?: string
  ctaLabel?: string
}

// Framer Motion variants. Text fires AFTER a 600ms delay so it lands once
// the video has begun playing rather than over the first frame.
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.6, staggerChildren: 0.12 } },
}
const childVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
}

export function VideoHero() {
  const t = useTranslations('marketing')
  const isAr = useLocale() === 'ar'
  const prefersReduced = useReducedMotion()

  // /admin/site-editor → site_hero. English-only overrides (Arabic keeps
  // its translated copy), each falling back to the localized default.
  const { value: heroOv } = usePlatformSetting<HeroSettings>('site_hero')
  const line1 = (!isAr && heroOv?.headline1?.trim()) || t('heroEat')
  const line2 = (!isAr && heroOv?.headline2?.trim()) || t('heroReal')
  const subtitle =
    !isAr && (heroOv?.subline1 || heroOv?.subline2 || heroOv?.subline3)
      ? [heroOv.subline1, heroOv.subline2, heroOv.subline3]
          .filter((s) => s && s.trim().length > 0)
          .join(' ')
      : t('heroSub')
  const ctaLabel = (!isAr && heroOv?.ctaLabel?.trim()) || t('heroCta')
  const eyebrow = t('heroEyebrow')

  const videoRef = useRef<HTMLVideoElement>(null)
  // `ready` clears the blurred poster + shimmer once the video can play.
  const [ready, setReady] = useState(false)
  // Hide the scroll chevron after the first scroll.
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onReady = () => setReady(true)
    // Either event suffices; loadeddata covers browsers that block
    // autoplay (canplaythrough may never fire if playback can't start).
    v.addEventListener('canplaythrough', onReady)
    v.addEventListener('loadeddata', onReady)
    if (v.readyState >= 3) setReady(true)
    // Safety net: never leave the hero stuck behind blur/shimmer.
    const fallback = window.setTimeout(() => setReady(true), 2500)
    return () => {
      v.removeEventListener('canplaythrough', onReady)
      v.removeEventListener('loadeddata', onReady)
      window.clearTimeout(fallback)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 24) setScrolled(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      aria-label={`${line1} ${line2}`}
      className="relative w-full h-[100svh] min-h-[560px] overflow-hidden"
    >
      {/* Preload hint — scoped to the homepage by living in this component. */}
      <link rel="preload" as="video" href={VIDEO_SRC} type="video/mp4" />

      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER_SRC}
        style={{
          // Blur-up: starts softly blurred + scaled, resolves once ready.
          filter: ready ? 'blur(0px)' : 'blur(16px) saturate(1.1)',
          transform: ready ? 'scale(1)' : 'scale(1.04)',
          transition: `filter ${CINEMA}, transform ${CINEMA}`,
        }}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>

      {/* Poster fallback — also covers autoplay-blocked mobile; fades out
          once the video is ready. */}
      <Image
        src={POSTER_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden
        className="object-cover transition-opacity duration-700 ease-out"
        style={{ opacity: ready ? 0 : 1, filter: 'blur(18px) scale(1.08)' }}
      />

      {/* Buffering shimmer until ready. */}
      {!ready && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse"
          style={{
            background:
              'linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)',
          }}
        />
      )}

      {/* Soft radial vignette so the text stays legible — no solid layer. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 38%, rgba(13,26,18,0.45) 100%)',
        }}
      />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial={prefersReduced ? 'visible' : 'hidden'}
        animate="visible"
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.span
          variants={childVariants}
          className="mb-6 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md"
        >
          {eyebrow}
        </motion.span>

        <motion.h1
          variants={childVariants}
          className="font-display font-bold leading-[1.02] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 120px)' }}
        >
          <span
            className="block"
            style={{ color: '#f2f7ea', textShadow: '0 2px 24px rgba(13,26,18,0.55)' }}
          >
            {line1}
          </span>
          <span
            className="block"
            style={{ color: '#bdf25c', textShadow: '0 2px 28px rgba(13,26,18,0.5)' }}
          >
            {line2}
          </span>
        </motion.h1>

        <motion.p
          variants={childVariants}
          className="mt-6 max-w-xl font-medium opacity-80"
          style={{
            fontSize: 'clamp(16px, 2vw, 22px)',
            color: '#eef5e6',
            textShadow: '0 1px 12px rgba(13,26,18,0.6)',
          }}
        >
          {subtitle}
        </motion.p>

        <motion.div variants={childVariants} className="mt-9">
          <a href="#booking" className="btn-primary">
            {ctaLabel}
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator — bounces, fades after the first scroll. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-7 z-10 flex justify-center transition-opacity duration-500"
        style={{ opacity: scrolled ? 0 : 1 }}
      >
        <ChevronDown
          className={`h-7 w-7 text-white/70${prefersReduced ? '' : ' animate-bounce'}`}
          strokeWidth={1.75}
        />
      </div>
    </section>
  )
}

export default VideoHero
