'use client'

import type { CSSProperties, ReactNode } from 'react'

interface WordRevealProps {
  /** Once true, the word slides up into view. */
  show: boolean
  /** Once true, the (already-shown) word slides further up and fades out. */
  exit?: boolean
  /** Stagger inside a line — ms */
  delay?: number
  className?: string
  children: ReactNode
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const DURATION_MS = 900

/**
 * Clip-path style word reveal — the parent <span> hides overflow, the
 * inner <span> animates translateY from 115% (off-screen below) into
 * place (0), and optionally exits up to -60px while fading.
 *
 * The clip wrapper is forced to `dir="ltr"` so RTL/LTR locales animate
 * identically (otherwise translateY can flip in some browsers under RTL
 * + writing-mode combinations). The inner span uses `unicode-bidi: isolate`
 * so Arabic text inside still renders right-to-left correctly.
 */
export function WordReveal({
  show,
  exit = false,
  delay = 0,
  className,
  children,
}: WordRevealProps) {
  const innerStyle: CSSProperties = {
    display: 'inline-block',
    transform: !show
      ? 'translateY(115%)'
      : exit
        ? 'translateY(-60px)'
        : 'translateY(0)',
    opacity: !show ? 1 : exit ? 0 : 1,
    transitionProperty: 'transform, opacity',
    transitionDuration: `${DURATION_MS}ms`,
    transitionTimingFunction: EASE,
    transitionDelay: `${delay}ms`,
    willChange: 'transform, opacity',
    unicodeBidi: 'isolate',
  }

  return (
    <span
      dir="ltr"
      className="inline-block overflow-hidden align-bottom"
      style={{ lineHeight: 1.05 }}
    >
      <span style={innerStyle} className={className}>
        {children}
      </span>
    </span>
  )
}
