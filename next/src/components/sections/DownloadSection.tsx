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

const LIME = '#a3e635'
const SKY = '#06b6d4'
const AMBER = '#f59e0b'

/**
 * Download section. Marketing-page background (var(--gf-bg)) with
 * dashboard-style cards inside — same chrome as the admin/nutritionist
 * panels (rounded-2xl border border-border, bare lucide icons in
 * metric tints, no decorative SVGs).
 *
 * Used on /download (full page) and on the homepage as a section.
 */
export function DownloadSection({
  apkUrl = DEFAULT_APK,
  version = '0.0.2',
  withSectionChrome = true,
}: DownloadSectionProps) {
  const t = useTranslations('download')

  const content = (
    <div className="max-w-screen-xl mx-auto">
      {/* Page header — matches dashboard h1 style */}
      <header className="text-center mb-10 md:mb-12 max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 text-[10px] uppercase tracking-eyebrow font-semibold text-lime-400">
          <Smartphone className="w-3 h-3" strokeWidth={1.75} />
          {t('eyebrow')}
          <span
            className="inline-flex items-center font-mono text-[10px] rounded-pill px-2 py-0.5"
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

      {/* Two dashboard-style cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
        {/* Android */}
        <DashboardCard
          Icon={Smartphone}
          iconTint={LIME}
          title={t('androidTitle')}
          subtitle={t('androidNote')}
        >
          <SecurityWarning />

          <a
            href={apkUrl}
            download
            className="w-full inline-flex items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-5 text-sm border border-lime-600/60 transition-all hover:brightness-110"
            style={{ boxShadow: '0 6px 22px rgba(132,217,61,0.28)' }}
          >
            <Download className="w-4 h-4" strokeWidth={2.25} />
            {t('androidCta')}
          </a>

          <p className="mt-3 flex items-start gap-2 text-[11px] text-fg-3 leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" color={AMBER} strokeWidth={1.75} />
            <span>{t('androidWarning')}</span>
          </p>
        </DashboardCard>

        {/* iOS */}
        <DashboardCard
          Icon={Apple}
          iconTint={SKY}
          title={t('iosTitle')}
          subtitle={t('iosIntro')}
        >
          <ol className="space-y-2.5">
            <IosStep n={1} text={t('iosStep1')} />
            <IosStep n={2} text={t('iosStep2')} icon={Share2} />
            <IosStep n={3} text={t('iosStep3')} icon={Plus} />
            <IosStep n={4} text={t('iosStep4')} />
          </ol>
          <p className="mt-4 text-[11px] text-fg-3">{t('iosFootnote')}</p>
        </DashboardCard>
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

/** Dashboard-style card. Matches the admin panel chrome —
 *  rounded-2xl border border-border, bare lucide icon in the
 *  metric tint, small title + subtitle header. */
function DashboardCard({
  Icon,
  iconTint,
  title,
  subtitle,
  children,
}: {
  Icon: typeof Smartphone
  iconTint: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <article
      className="rounded-2xl border border-border p-5 flex flex-col"
      style={{
        background: 'var(--gf-surface)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 22px rgba(0,0,0,0.22)',
      }}
    >
      <header className="mb-4 flex items-start gap-2">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} color={iconTint} />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg-1">{title}</h3>
          {subtitle && <p className="text-[11px] text-fg-3 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      {children}
    </article>
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
    <li className="flex items-center gap-2.5">
      <span
        className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-bold font-mono"
        style={{
          background: 'rgba(132,217,61,0.1)',
          color: LIME,
          border: '1px solid rgba(132,217,61,0.3)',
        }}
        dir="ltr"
      >
        {n}
      </span>
      <span className="text-sm text-fg-1 inline-flex items-center gap-1.5 flex-wrap">
        {text}
        {Icon && (
          <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} color={SKY} />
        )}
      </span>
    </li>
  )
}

type SecurityTab = 'samsung' | 'regular'

/** Collapsible amber-bordered security-warning helper. */
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
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="security-warning-body"
        className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors"
        style={{
          background: 'transparent',
          border: '1px solid var(--gf-border)',
        }}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-fg-2">
          <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} color={AMBER} />
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
          className="mt-2 rounded-lg p-3.5 space-y-3"
          style={{
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
          }}
        >
          <p className="text-xs text-fg-3">{t('securityIntro')}</p>

          <div
            role="tablist"
            className="inline-flex rounded-pill p-1 gap-1"
            style={{
              background: 'var(--gf-surface)',
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

          <ol className="space-y-2">
            {steps.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm text-fg-1 leading-relaxed"
              >
                <span
                  className="shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold font-mono text-fg-2"
                  style={{ background: 'var(--gf-surface)' }}
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
              color: LIME,
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
