'use client'

import { useState } from 'react'
import { Check, Copy, Linkedin, Mail, Quote, Share2, Twitter } from 'lucide-react'

interface Props {
  url: string
  title: string
  author: string
  publishedAt: string
  isAr: boolean
}

/**
 * Per-article share + citation block. Two purposes:
 *
 *  1. Share buttons spread the post on Twitter / LinkedIn / Email
 *     and copy-to-clipboard. Each share link points at the canonical
 *     /blog/<slug> URL so backlinks accrue to that exact page.
 *
 *  2. The Cite-this-article block formats a journalist-friendly
 *     citation (APA-style) the user can copy. Reduces friction when
 *     a reporter wants to reference a Coach Rawan article.
 */
export function ShareAndCite({ url, title, author, publishedAt, isAr }: Props) {
  const [copied, setCopied] = useState<'link' | 'cite' | null>(null)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const twitter = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&via=greenofig`
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  const email = `mailto:?subject=${encodedTitle}&body=${encodedUrl}`

  const year = new Date(publishedAt).getFullYear()
  const month = new Date(publishedAt).toLocaleString(isAr ? 'ar' : 'en', {
    month: 'long',
  })
  // APA-ish: Author (Year, Month). Title. Greenofig. URL
  const citation = `${author} (${year}, ${month}). ${title}. Greenofig. ${url}`

  const copy = async (text: string, which: 'link' | 'cite') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      /* noop — clipboard blocked, show no feedback */
    }
  }

  return (
    <section className="max-w-3xl mx-auto mt-12 space-y-4">
      {/* Share row */}
      <div
        className="rounded-2xl border border-border bg-surface p-5 flex flex-wrap items-center gap-3"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.2)' }}
      >
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-eyebrow font-semibold text-fg-3">
          <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          {isAr ? 'شارك' : 'Share'}
        </span>
        <div className="flex-1" />
        <ShareBtn href={twitter} label="X" Icon={Twitter} />
        <ShareBtn href={linkedin} label="LinkedIn" Icon={Linkedin} />
        <ShareBtn href={email} label="Email" Icon={Mail} />
        <button
          type="button"
          onClick={() => void copy(url, 'link')}
          aria-label={isAr ? 'انسخ الرابط' : 'Copy link'}
          className="inline-flex items-center gap-1.5 rounded-pill border border-border h-9 px-3 text-xs font-semibold text-fg-1 hover:border-lime-400/50 hover:text-lime-400 transition-colors"
          style={{ background: 'var(--gf-input-bg)' }}
        >
          {copied === 'link' ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
              {isAr ? 'تم النسخ' : 'Copied'}
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
              {isAr ? 'انسخ الرابط' : 'Copy link'}
            </>
          )}
        </button>
      </div>

      {/* Cite block */}
      <div
        className="rounded-2xl border border-border bg-surface p-5"
        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.2)' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <Quote className="w-4 h-4 text-lime-400 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg-1">
              {isAr ? 'استشهد بهذه المقالة' : 'Cite this article'}
            </p>
            <p className="text-xs text-fg-3 mt-0.5">
              {isAr
                ? 'للصحفيين والباحثين — صيغة جاهزة للاقتباس.'
                : 'For journalists and researchers — ready to paste into a citation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void copy(citation, 'cite')}
            className="inline-flex items-center gap-1.5 rounded-pill border border-border h-8 px-3 text-[11px] font-semibold text-fg-1 hover:border-lime-400/50 hover:text-lime-400 transition-colors shrink-0"
            style={{ background: 'var(--gf-input-bg)' }}
          >
            {copied === 'cite' ? (
              <>
                <Check className="w-3 h-3" strokeWidth={2} />
                {isAr ? 'تم النسخ' : 'Copied'}
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" strokeWidth={1.75} />
                {isAr ? 'انسخ' : 'Copy'}
              </>
            )}
          </button>
        </div>
        <p
          className="font-mono text-[12px] leading-relaxed text-fg-2 rounded-lg px-3 py-2.5"
          style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
          dir="ltr"
        >
          {citation}
        </p>
      </div>
    </section>
  )
}

function ShareBtn({
  href,
  label,
  Icon,
}: {
  href: string
  label: string
  Icon: typeof Twitter
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Share on ${label}`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-fg-1 hover:border-lime-400/50 hover:text-lime-400 transition-colors"
      style={{ background: 'var(--gf-input-bg)' }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
    </a>
  )
}
