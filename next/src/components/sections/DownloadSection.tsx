'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Apple,
  ChevronDown,
  Download,
  Plus,
  Share2,
  ShieldAlert,
  Smartphone,
} from 'lucide-react'

interface DownloadSectionProps {
  apkUrl?: string
  version?: string
  /** When true (default), wraps in <section> with marketing chrome. */
  withSectionChrome?: boolean
}

const DEFAULT_APK = 'https://greenofig.com/downloads/greenofig-0.0.1.apk'

/**
 * Reusable download section. Typography-led, single-column layout —
 * Android is the primary CTA (the actual native app) and iOS is a
 * secondary "Add to Home Screen" walkthrough below. Used on /download
 * and as a section on the marketing homepage.
 */
export function DownloadSection({
  apkUrl = DEFAULT_APK,
  version = '0.0.2',
  withSectionChrome = true,
}: DownloadSectionProps) {
  const t = useTranslations('download')

  const content = (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <header className="text-center mb-10 md:mb-12">
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
          {t('eyebrow')}
          <span
            className="inline-flex items-center gap-1 font-mono text-[10px] rounded-pill px-2 py-0.5"
            style={{
              background: 'rgba(132,217,61,0.12)',
              border: '1px solid rgba(132,217,61,0.3)',
            }}
            dir="ltr"
          >
            v{version}
          </span>
        </p>
        <h2
          className="mt-4 font-display font-bold text-fg-1 tracking-tight"
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 1.05,
            fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
          }}
        >
          {t('title')}
        </h2>
        <p className="mt-3 text-base md:text-lg text-fg-2">{t('subtitle')}</p>
      </header>

      {/* Android — primary path */}
      <div className="mb-12">
        <SecurityWarning />

        <a
          href={apkUrl}
          download
          className="group block w-full rounded-2xl text-center transition-all hover:-translate-y-px"
          style={{
            background: 'linear-gradient(180deg, var(--gf-lime-400) 0%, var(--gf-lime-500) 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.4) inset, 0 14px 36px rgba(132,217,61,0.32)',
            border: '1px solid var(--gf-lime-600)',
          }}
        >
          <span className="block px-6 py-5">
            <span className="inline-flex items-center gap-2.5 text-bg font-bold text-base md:text-lg">
              <Download className="w-5 h-5" strokeWidth={2.25} />
              {t('androidCta')}
            </span>
            <span className="block mt-1 text-bg/70 text-xs font-mono" dir="ltr">
              .apk · ~3.6 MB
            </span>
          </span>
        </a>

        <p className="mt-4 text-center text-xs text-fg-3">{t('androidNote')}</p>

        <p className="mt-3 inline-flex w-full items-start justify-center gap-2 text-center text-[11px] text-fg-3 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" color="#f59e0b" strokeWidth={1.75} />
          <span>{t('androidWarning')}</span>
        </p>
      </div>

      {/* Divider with iOS label */}
      <div className="relative flex items-center justify-center mb-8" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="px-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-eyebrow font-semibold text-fg-3">
          <Apple className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t('iosTitle')}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* iOS — secondary path */}
      <div>
        <p className="text-sm md:text-base text-fg-2 text-center mb-6">
          {t('iosIntro')}
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <IosStep n={1} text={t('iosStep1')} />
          <IosStep n={2} text={t('iosStep2')} icon={Share2} />
          <IosStep n={3} text={t('iosStep3')} icon={Plus} />
          <IosStep n={4} text={t('iosStep4')} />
        </ol>
        <p className="mt-5 text-center text-[11px] text-fg-3">
          {t('iosFootnote')}
        </p>
      </div>
    </div>
  )

  if (!withSectionChrome) return content
  return (
    <section id="download" className="relative z-10 w-full px-6 py-16 lg:py-24">
      {content}
    </section>
  )
}

function IosStep({
  n,
  text,
  icon: Icon,
}: {
  n: number
  text: string
  icon?: typeof Share2
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-xl px-4 py-3.5"
      style={{
        background: 'var(--gf-surface)',
        border: '1px solid var(--gf-border)',
      }}
    >
      <span
        className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold font-mono text-lime-400"
        style={{
          background: 'rgba(132,217,61,0.1)',
          border: '1px solid rgba(132,217,61,0.3)',
        }}
        dir="ltr"
      >
        {n}
      </span>
      <span className="flex-1 text-sm text-fg-1 inline-flex items-center gap-1.5 flex-wrap">
        {text}
        {Icon && (
          <Icon
            className="w-4 h-4 text-lime-400 shrink-0"
            strokeWidth={1.75}
          />
        )}
      </span>
    </li>
  )
}

type SecurityTab = 'samsung' | 'regular'

/**
 * Collapsible "Getting a security warning?" panel above the Android
 * download button. Two tabs (Samsung / Regular Android), each with
 * the full bypass walkthrough. Closed by default.
 */
function SecurityWarning() {
  const t = useTranslations('download')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<SecurityTab>('samsung')

  const samsungSteps = [
    t('samsungStep1'),
    t('samsungStep2'),
    t('samsungStep3'),
    t('samsungStep4'),
    t('samsungStep5'),
    t('samsungStep6'),
  ]
  const regularSteps = [
    t('regularStep1'),
    t('regularStep2'),
    t('regularStep3'),
    t('regularStep4'),
    t('regularStep5'),
    t('regularStep6'),
  ]
  const steps = tab === 'samsung' ? samsungSteps : regularSteps

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="security-warning-body"
        className="w-full flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors"
        style={{
          background: 'transparent',
          border: '1px solid var(--gf-border)',
        }}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-fg-2">
          <ShieldAlert className="w-3.5 h-3.5 text-amber" strokeWidth={1.75} />
          {t('securityToggle')}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-fg-3 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          id="security-warning-body"
          className="mt-2 rounded-lg p-4 space-y-3"
          style={{
            background: 'var(--gf-surface)',
            border: '1px solid var(--gf-border)',
          }}
        >
          <p className="text-xs text-fg-3">{t('securityIntro')}</p>

          <div
            role="tablist"
            className="inline-flex rounded-pill p-1 gap-1"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
            }}
          >
            <SecTab
              active={tab === 'samsung'}
              onClick={() => setTab('samsung')}
              label={t('samsungTitle')}
            />
            <SecTab
              active={tab === 'regular'}
              onClick={() => setTab('regular')}
              label={t('regularTitle')}
            />
          </div>

          <ol className="space-y-2 pt-1">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-fg-1 leading-relaxed">
                <span
                  className="shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold font-mono text-fg-2"
                  style={{ background: 'var(--gf-input-bg)' }}
                  dir="ltr"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function SecTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="rounded-pill px-3 h-7 text-[11px] font-semibold transition-colors"
      style={
        active
          ? {
              background: 'rgba(132,217,61,0.18)',
              color: '#a3e635',
              boxShadow: '0 0 0 1px rgba(132,217,61,0.4) inset',
            }
          : {
              background: 'transparent',
              color: 'var(--gf-fg-2)',
            }
      }
    >
      {label}
    </button>
  )
}

// Re-export Smartphone so anything that imported it from this file
// previously still resolves. Not used in the new render.
export { Smartphone }
