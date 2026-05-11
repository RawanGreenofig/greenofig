'use client'

import { useTranslations } from 'next-intl'
import { Apple, Download, Share2, Plus, AlertTriangle, Smartphone } from 'lucide-react'

interface DownloadSectionProps {
  /** APK download URL — defaults to the GitHub release link but
   *  overridable so the homepage and /download page can point at
   *  the same artifact even if the path moves. */
  apkUrl?: string
  /** App version label shown in the badge. Source of truth lives
   *  in next/package.json, but the section keeps a fallback. */
  version?: string
  /** When true (default), wraps the section in a <section> with
   *  the standard padded marketing chrome. Set to false when
   *  embedding inside the dedicated page that already has its
   *  own container. */
  withSectionChrome?: boolean
}

// Pinned to the specific v0.0.2 release because that's where the
// signed APK currently lives. Switch to /releases/latest/download/
// once subsequent tagged releases consistently produce a same-named
// asset.
const DEFAULT_APK =
  'https://github.com/RawanGreenofig/greenofig/releases/download/v0.0.2/greenofig-0.0.1.apk'

/**
 * Reusable download section. Renders the headline, version badge,
 * Android download card, and iPhone "Add to Home Screen" walkthrough.
 * Used on:
 *
 *   - the homepage at /  (just below the store section)
 *   - the dedicated page at /download
 *
 * Server-rendered — no client state. Translations come from the
 * `download` and `nav` namespaces in messages/{en,ar}.json.
 */
export function DownloadSection({
  apkUrl = DEFAULT_APK,
  version = '0.0.2',
  withSectionChrome = true,
}: DownloadSectionProps) {
  const t = useTranslations('download')

  const content = (
    <div className="max-w-screen-xl mx-auto">
      <header className="text-center mb-10 md:mb-12 max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
          <Smartphone className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t('eyebrow')}
        </p>
        <h2
          className="mt-3 font-display font-bold text-fg-1 tracking-tight"
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 1.05,
            fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
          }}
        >
          {t('title')}
        </h2>
        <p className="mt-3 text-base md:text-lg text-fg-2">{t('subtitle')}</p>
        <p
          className="mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-eyebrow font-bold rounded-pill px-3 py-1.5"
          style={{
            color: '#a3e635',
            background: 'rgba(132,217,61,0.12)',
            border: '1px solid rgba(132,217,61,0.3)',
          }}
          dir="ltr"
        >
          {t('versionLabel')} v{version}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
        {/* Android card */}
        <article
          className="rounded-2xl border p-6 md:p-7 flex flex-col"
          style={{
            background:
              'linear-gradient(135deg, rgba(132,217,61,0.06) 0%, var(--gf-surface) 60%)',
            borderColor: 'rgba(132,217,61,0.35)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px rgba(0,0,0,0.28)',
          }}
        >
          <header className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(132,217,61,0.16)',
                boxShadow: '0 0 0 1px rgba(132,217,61,0.3) inset',
              }}
            >
              <AndroidGlyph className="w-5 h-5 text-lime-400" />
            </div>
            <h3 className="font-display text-xl font-bold text-fg-1 tracking-tight">
              {t('androidTitle')}
            </h3>
          </header>

          <a
            href={apkUrl}
            download
            className="inline-flex items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-12 px-6 text-sm border border-lime-600/60 transition-all hover:brightness-110"
            style={{ boxShadow: '0 8px 28px rgba(132,217,61,0.32)' }}
          >
            <Download className="w-4 h-4" strokeWidth={2} />
            {t('androidCta')}
          </a>

          <p className="mt-4 text-xs text-fg-3">{t('androidNote')}</p>

          <div
            className="mt-4 rounded-lg p-3 flex items-start gap-2.5"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <AlertTriangle
              className="w-4 h-4 mt-0.5 shrink-0"
              strokeWidth={1.75}
              color="#f59e0b"
            />
            <p className="text-xs text-amber leading-relaxed">
              {t('androidWarning')}
            </p>
          </div>
        </article>

        {/* iOS card */}
        <article
          className="rounded-2xl border border-border p-6 md:p-7 flex flex-col"
          style={{
            background: 'var(--gf-surface)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 40px rgba(0,0,0,0.22)',
          }}
        >
          <header className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(255,255,255,0.04)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.08) inset',
              }}
            >
              <Apple className="w-5 h-5 text-fg-1" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-xl font-bold text-fg-1 tracking-tight">
              {t('iosTitle')}
            </h3>
          </header>

          <p className="text-sm text-fg-2 mb-4">{t('iosIntro')}</p>

          <ol className="space-y-3 flex-1">
            <Step n={1} text={t('iosStep1')} />
            <Step n={2} text={t('iosStep2')} icon={Share2} />
            <Step n={3} text={t('iosStep3')} icon={Plus} />
            <Step n={4} text={t('iosStep4')} />
          </ol>

          <p className="mt-4 text-[11px] text-fg-3">{t('iosFootnote')}</p>
        </article>
      </div>
    </div>
  )

  if (!withSectionChrome) return content
  return (
    <section
      id="download"
      className="relative z-10 w-full px-6 py-16 lg:py-24"
    >
      {content}
    </section>
  )
}

function Step({
  n,
  text,
  icon: Icon,
}: {
  n: number
  text: string
  icon?: typeof Share2
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold font-mono"
        style={{
          background: 'rgba(132,217,61,0.12)',
          color: '#a3e635',
          border: '1px solid rgba(132,217,61,0.3)',
        }}
        dir="ltr"
      >
        {n}
      </span>
      <p className="text-sm text-fg-1 leading-relaxed inline-flex items-center gap-1.5 flex-wrap">
        {text}
        {Icon && (
          <Icon
            className="w-3.5 h-3.5 text-fg-3 shrink-0"
            strokeWidth={1.75}
          />
        )}
      </p>
    </li>
  )
}

/** Tiny inline glyph that reads as the Android robot silhouette
 *  without copying anyone's brand artwork — two rounded antennae +
 *  a dome head. Drawn from basic geometry, fully ours. */
function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 5.5l-1.4-2.4a.5.5 0 0 1 .87-.5L8 5.05A8.6 8.6 0 0 1 12 4c1.45 0 2.8.36 4 1.05l1.53-2.45a.5.5 0 0 1 .87.5L17 5.5A6.3 6.3 0 0 1 19.5 11H4.5A6.3 6.3 0 0 1 7 5.5zm2 3.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8zm6 0a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8zM4.5 12h15v5.5a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2V12zM2 13a1.5 1.5 0 0 1 3 0v5a1.5 1.5 0 0 1-3 0v-5zm17 0a1.5 1.5 0 0 1 3 0v5a1.5 1.5 0 0 1-3 0v-5zM9.5 21a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1-3 0V21zm5 0a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1-3 0V21z" />
    </svg>
  )
}
