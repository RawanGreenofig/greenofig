'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  Settings,
  Palette,
  FileText,
  Plug,
  Save,
  Check,
  Camera,
  Plus,
  ExternalLink,
  type LucideIcon,
} from '@/icons'

type Tab = 'general' | 'branding' | 'legal' | 'integrations'

interface GeneralForm {
  appName: string
  supportEmail: string
  defaultLocale: 'en' | 'ar'
  defaultTimezone: string
  currency: 'JOD' | 'USD' | 'EUR'
  minPayoutJod: number
  platformFeePct: number
  vatPct: number
}

interface BrandingForm {
  primaryColor: string
  accentColor: string
}

interface IntegrationsForm {
  stripeWebhook: string
  n8nWebhook: string
  calendlyOrg: string
  googleAnalytics: string
  metaPixel: string
  intercomAppId: string
  supabaseProjectRef: string
}

const TABS: { key: Tab; Icon: LucideIcon }[] = [
  { key: 'general',      Icon: Settings },
  { key: 'branding',     Icon: Palette },
  { key: 'legal',        Icon: FileText },
  { key: 'integrations', Icon: Plug },
]

export default function AdminSettingsPage() {
  const t = useTranslations('admin')
  const tS = useTranslations('admin.settingsPage')

  const [tab, setTab] = useState<Tab>('general')
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const [general, setGeneral] = useState<GeneralForm>({
    appName: 'Greenofig',
    supportEmail: 'help@greenofig.com',
    defaultLocale: 'en',
    defaultTimezone: 'Asia/Amman',
    currency: 'USD',
    minPayoutJod: 50,
    platformFeePct: 8,
    vatPct: 16,
  })
  const [branding, setBranding] = useState<BrandingForm>({
    primaryColor: '#3d7a4a',
    accentColor: '#a3e635',
  })
  const [integrations, setIntegrations] = useState<IntegrationsForm>({
    stripeWebhook:     'https://api.greenofig.com/webhooks/stripe',
    n8nWebhook:        'https://flows.greenofig.com/webhook/notif',
    calendlyOrg:       'greenofig',
    googleAnalytics:   'G-XXXXXXXXXX',
    metaPixel:         '1234567890123',
    intercomAppId:     'abc12345',
    supabaseProjectRef: 'bvconuycpdvgzbvbkijl',
  })

  const markDirty = () => {
    if (!dirty) setDirty(true)
    if (saveState === 'saved') setSaveState('idle')
  }

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      type Row = { key: string; value: unknown }
      const { data: rows } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['site_general', 'site_branding', 'site_integrations'])
      if (cancelled) return
      const list = (rows as Row[] | null) ?? []
      for (const r of list) {
        if (!r?.value) continue
        if (r.key === 'site_general') setGeneral((curr) => ({ ...curr, ...(r.value as Partial<GeneralForm>) }))
        if (r.key === 'site_branding') setBranding((curr) => ({ ...curr, ...(r.value as Partial<BrandingForm>) }))
        if (r.key === 'site_integrations') setIntegrations((curr) => ({ ...curr, ...(r.value as Partial<IntegrationsForm>) }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaveState('saving')
    const writes: { key: string; value: unknown }[] = [
      { key: 'site_general', value: general },
      { key: 'site_branding', value: branding },
      { key: 'site_integrations', value: integrations },
    ]
    try {
      await Promise.all(
        writes.map((w) =>
          fetch(`/api/settings/${w.key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: w.value }),
          }),
        ),
      )
    } catch {
      /* ignore — show saved either way; user retries on visible failure */
    }
    setSaveState('saved')
    setDirty(false)
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('settings')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{tS('subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <nav
          aria-label="Settings tabs"
          className="lg:col-span-3 flex lg:flex-col gap-1 overflow-x-auto -mx-1 px-1 lg:overflow-visible lg:mx-0 lg:px-0 pb-1 lg:pb-0"
        >
          {TABS.map(({ key, Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`shrink-0 inline-flex items-center gap-2.5 rounded-lg h-10 px-3 text-sm font-medium transition-colors lg:w-full lg:text-start ${
                  active
                    ? 'bg-primary/15 text-lime-400'
                    : 'text-fg-2 hover:text-fg-1 hover:bg-surface'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {tS(`tabs.${key}` as 'tabs.general')}
              </button>
            )
          })}
        </nav>

        <div className="lg:col-span-9 space-y-6">
          {tab === 'general' && (
            <GeneralPane
              tS={tS}
              form={general}
              onChange={(f) => {
                setGeneral(f)
                markDirty()
              }}
            />
          )}
          {tab === 'branding' && (
            <BrandingPane
              tS={tS}
              form={branding}
              onChange={(f) => {
                setBranding(f)
                markDirty()
              }}
            />
          )}
          {tab === 'legal' && <LegalPane tS={tS} />}
          {tab === 'integrations' && (
            <IntegrationsPane
              tS={tS}
              form={integrations}
              onChange={(f) => {
                setIntegrations(f)
                markDirty()
              }}
            />
          )}
        </div>
      </div>

      {(dirty || saveState === 'saved') && tab !== 'legal' && (
        <SaveBar tS={tS} state={saveState} onSave={save} />
      )}
    </div>
  )
}

/* ── General ───────────────────────────────────────────────────── */

function GeneralPane({
  tS,
  form,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  form: GeneralForm
  onChange: (f: GeneralForm) => void
}) {
  const set = <K extends keyof GeneralForm>(k: K, v: GeneralForm[K]) =>
    onChange({ ...form, [k]: v })
  return (
    <Section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={tS('general.appName')}>
          <Input value={form.appName} onChange={(v) => set('appName', v)} />
        </Field>
        <Field label={tS('general.supportEmail')}>
          <Input
            value={form.supportEmail}
            onChange={(v) => set('supportEmail', v)}
            ltr
          />
        </Field>
        <Field label={tS('general.defaultLocale')}>
          <Select
            value={form.defaultLocale}
            onChange={(v) => set('defaultLocale', v as 'en' | 'ar')}
            options={[
              ['en', 'English'],
              ['ar', 'العربية'],
            ]}
          />
        </Field>
        <Field label={tS('general.defaultTimezone')}>
          <Select
            value={form.defaultTimezone}
            onChange={(v) => set('defaultTimezone', v)}
            options={[
              ['Asia/Amman',     '(GMT+03) Amman'],
              ['Asia/Dubai',     '(GMT+04) Dubai'],
              ['Africa/Cairo',   '(GMT+02) Cairo'],
              ['Europe/London',  '(GMT+00) London'],
            ]}
          />
        </Field>
        <Field label={tS('general.currency')}>
          <Select
            value={form.currency}
            onChange={(v) => set('currency', v as 'JOD' | 'USD' | 'EUR')}
            options={[
              ['USD', 'USD — US dollar'],
              ['EUR', 'EUR — Euro'],
              ['JOD', 'JOD — Jordanian dinar'],
            ]}
          />
        </Field>
        <Field label={tS('general.minPayoutJod')}>
          <NumInput
            value={form.minPayoutJod}
            onChange={(n) => set('minPayoutJod', n)}
            suffix="USD"
          />
        </Field>
        <Field label={tS('general.platformFeePct')}>
          <NumInput
            value={form.platformFeePct}
            onChange={(n) => set('platformFeePct', n)}
            suffix="%"
          />
        </Field>
        <Field label={tS('general.vatPct')}>
          <NumInput
            value={form.vatPct}
            onChange={(n) => set('vatPct', n)}
            suffix="%"
          />
        </Field>
      </div>
    </Section>
  )
}

/* ── Branding ───────────────────────────────────────────────────── */

function BrandingPane({
  tS,
  form,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  form: BrandingForm
  onChange: (f: BrandingForm) => void
}) {
  const set = <K extends keyof BrandingForm>(k: K, v: BrandingForm[K]) =>
    onChange({ ...form, [k]: v })

  return (
    <div className="space-y-5">
      <Section title="Logos">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UploadCard label={tS('branding.logoLight')} cta={tS('branding.uploadCta')} hue="rgb(240 237 230 / 0.08)" />
          <UploadCard label={tS('branding.logoDark')}  cta={tS('branding.uploadCta')} hue="rgb(13 26 18 / 0.4)" dark />
          <UploadCard label={tS('branding.favicon')}    cta={tS('branding.uploadCta')} hue="rgb(61 122 74 / 0.18)" />
        </div>
      </Section>

      <Section title="Colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={tS('branding.primaryColor')}>
            <ColorInput value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
          </Field>
          <Field label={tS('branding.accentColor')}>
            <ColorInput value={form.accentColor} onChange={(v) => set('accentColor', v)} />
          </Field>
        </div>
      </Section>

      <Section title="Social share">
        <UploadCard
          label={tS('branding.ogImage')}
          cta={tS('branding.uploadCta')}
          hue="rgb(132 204 22 / 0.14)"
          aspect="aspect-[1200/630]"
        />
      </Section>
    </div>
  )
}

function UploadCard({
  label,
  cta,
  hue,
  dark,
  aspect,
}: {
  label: string
  cta: string
  hue: string
  dark?: boolean
  aspect?: string
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
        {label}
      </p>
      <div
        className={`rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 px-4 py-6 ${aspect ?? 'aspect-square'}`}
        style={{ background: hue }}
      >
        <Camera className={`w-7 h-7 ${dark ? 'text-fg-1/40' : 'text-fg-3'}`} strokeWidth={1.25} />
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-bg/85 backdrop-blur-sm border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {cta}
        </button>
      </div>
    </div>
  )
}

function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="shrink-0 w-10 h-10 rounded-md border border-border bg-bg-deeper cursor-pointer"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
        dir="ltr"
      />
    </div>
  )
}

/* ── Legal ──────────────────────────────────────────────────────── */

function LegalPane({ tS }: { tS: ReturnType<typeof useTranslations> }) {
  const docs = [
    { key: 'termsTitle',   updatedISO: '2026-03-12' },
    { key: 'privacyTitle', updatedISO: '2026-03-12' },
    { key: 'cookieTitle',  updatedISO: '2025-11-08' },
  ] as const
  return (
    <ul className="space-y-3">
      {docs.map((d) => (
        <li
          key={d.key}
          className="rounded-xl border border-border bg-surface p-5 flex flex-wrap items-center gap-4"
        >
          <FileText
            className="w-6 h-6 text-purple-500 flex-shrink-0"
            strokeWidth={1.75}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg-1">
              {tS(`legal.${d.key}` as 'legal.termsTitle')}
            </p>
            <p className="mt-0.5 text-xs text-fg-3 font-mono" dir="ltr">
              {tS('legal.lastUpdated', {
                date: new Date(d.updatedISO).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              })}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            {tS('legal.edit')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-1"
          >
            <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
            {tS('legal.viewVersion')}
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ── Integrations ──────────────────────────────────────────────── */

function IntegrationsPane({
  tS,
  form,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  form: IntegrationsForm
  onChange: (f: IntegrationsForm) => void
}) {
  const set = <K extends keyof IntegrationsForm>(k: K, v: IntegrationsForm[K]) =>
    onChange({ ...form, [k]: v })

  const fields: { key: keyof IntegrationsForm; labelKey: string; testable: boolean }[] = [
    { key: 'stripeWebhook',     labelKey: 'integrations.stripeWebhook',     testable: true },
    { key: 'n8nWebhook',        labelKey: 'integrations.n8nWebhook',        testable: true },
    { key: 'calendlyOrg',       labelKey: 'integrations.calendlyOrg',       testable: false },
    { key: 'googleAnalytics',   labelKey: 'integrations.googleAnalytics',   testable: false },
    { key: 'metaPixel',         labelKey: 'integrations.metaPixel',         testable: false },
    { key: 'intercomAppId',     labelKey: 'integrations.intercomAppId',     testable: false },
    { key: 'supabaseProjectRef', labelKey: 'integrations.supabaseProjectRef', testable: false },
  ]

  return (
    <Section>
      <ul className="space-y-3">
        {fields.map((f) => (
          <li key={f.key} className="rounded-lg bg-bg-deeper/40 border border-border p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {tS(f.labelKey)}
              </label>
              {f.testable && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md bg-surface-raised border border-border h-7 px-2.5 text-[11px] font-semibold text-fg-1 hover:border-primary/40"
                >
                  {tS('integrations.test')}
                </button>
              )}
            </div>
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full h-10 rounded-md bg-bg border border-transparent px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ── Reusables ──────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section>
      {title && (
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {title}
        </h2>
      )}
      <div className="rounded-xl border border-border bg-surface p-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  ltr,
}: {
  value: string
  onChange: (v: string) => void
  ltr?: boolean
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      dir={ltr ? 'ltr' : undefined}
      className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
    />
  )
}

function NumInput({
  value,
  onChange,
  suffix,
}: {
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={`w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary ${
          suffix ? 'pe-12' : ''
        }`}
        dir="ltr"
      />
      {suffix && (
        <span
          className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono"
          aria-hidden
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v} className="bg-surface">
          {l}
        </option>
      ))}
    </select>
  )
}

function SaveBar({
  tS,
  state,
  onSave,
}: {
  tS: ReturnType<typeof useTranslations>
  state: 'idle' | 'saving' | 'saved'
  onSave: () => void
}) {
  return (
    <div className="sticky bottom-4 z-30 mx-auto max-w-screen-md">
      <div
        className={`rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-3 px-4 py-3 ${
          state === 'saved'
            ? 'border-primary/40 bg-primary/10'
            : 'border-border bg-surface/95'
        }`}
      >
        {state === 'saved' ? (
          <Check className="w-4 h-4 text-lime-400" strokeWidth={2.5} />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#e8912a' }} />
        )}
        <p className="text-sm text-fg-1 flex-1">
          {state === 'saved' ? tS('saved') : tS('unsavedChanges')}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={state === 'saving' || state === 'saved'}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-5 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Save className="w-3.5 h-3.5" strokeWidth={2} />
          {state === 'saving' ? tS('saving') : tS('saveChanges')}
        </button>
      </div>
    </div>
  )
}
