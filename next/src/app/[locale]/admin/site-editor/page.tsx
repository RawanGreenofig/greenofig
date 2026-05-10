'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  Sparkles,
  Info,
  CreditCard,
  HelpCircle,
  Layers,
  Save,
  Plus,
  X,
  Eye,
  Check,
  type LucideIcon,
} from '@/icons'

type Tab = 'hero' | 'about' | 'pricing' | 'faq' | 'footer'

interface HeroDraft {
  headline1: string
  headline2: string
  subline1: string
  subline2: string
  subline3: string
  ctaLabel: string
  secondHeadline1: string
  secondHeadline2: string
}

interface AboutDraft {
  name: string
  role: string
  bio: string
  credentials: string
}

interface PricingTier {
  name: string
  monthlyJod: number
  yearlyJod: number
  tagline: string
  features: string
}

interface FaqRow {
  id: string
  question: string
  answer: string
}

interface FooterDraft {
  tagline: string
  supportEmail: string
  supportPhone: string
  address: string
  instagram: string
  youtube: string
  tiktok: string
}

const TABS: { key: Tab; Icon: LucideIcon }[] = [
  { key: 'hero',    Icon: Sparkles },
  { key: 'about',   Icon: Info },
  { key: 'pricing', Icon: CreditCard },
  { key: 'faq',     Icon: HelpCircle },
  { key: 'footer',  Icon: Layers },
]

export default function AdminSiteEditorPage() {
  const t = useTranslations('admin')
  const tS = useTranslations('admin.siteEditorPage')

  const [tab, setTab] = useState<Tab>('hero')
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const [hero, setHero] = useState<HeroDraft>({
    headline1: 'Nourish',
    headline2: 'Better.',
    subline1: 'Personalized nutrition',
    subline2: 'plans that work',
    subline3: 'for your body.',
    ctaLabel: 'Book a Free Consultation',
    secondHeadline1: 'Your healthiest self',
    secondHeadline2: 'starts here.',
  })
  const [about, setAbout] = useState<AboutDraft>({
    name: 'Coach Rawan Othman',
    role: 'Clinical Nutritionist · MSc, RD',
    bio: "I help women in the Levant rebuild their relationship with food. Mediterranean-rooted, evidence-led, no shame.",
    credentials:
      'MSc Clinical Nutrition — University of Jordan\nRegistered Dietitian — Jordanian MoH\nCertified Functional Nutrition Practitioner',
  })
  const [pricing, setPricing] = useState<PricingTier[]>([
    { name: 'Free',    monthlyJod: 0,  yearlyJod: 0,    tagline: 'Get started',   features: 'Limited scanner\nRead-only community' },
    { name: 'Basic',   monthlyJod: 9,  yearlyJod: 90,   tagline: 'Track your day', features: 'Unlimited scanner\nFood + water tracking\nRecipe library' },
    { name: 'Premium', monthlyJod: 19, yearlyJod: 190,  tagline: 'Personalized',   features: 'Custom meal plans\n10% store discount\nPriority AI' },
    { name: 'VIP',     monthlyJod: 49, yearlyJod: 490,  tagline: 'Concierge',      features: 'Direct messages with Coach Rawan\n15% store discount\nMonthly 1:1 review' },
  ])
  const [faq, setFaq] = useState<FaqRow[]>([
    { id: 'f1', question: 'Is the meal plan customized for my body?',                  answer: 'Yes — Coach Rawan personalizes every plan after your intake form and intro call.' },
    { id: 'f2', question: 'Can I switch between English and Arabic?',                  answer: 'Anytime. Your account preferences sync everything from menus to plan text.' },
    { id: 'f3', question: 'What if I need to pause my subscription?',                  answer: 'You can pause for up to 60 days from Settings → Subscription with no fee.' },
    { id: 'f4', question: 'How long until I see results?',                              answer: 'Most clients feel a difference in week 2 and see body composition shifts by week 6.' },
  ])
  const [footer, setFooter] = useState<FooterDraft>({
    tagline: 'Mediterranean nutrition, made for your kitchen.',
    supportEmail: 'help@greenofig.com',
    supportPhone: '+962 79 555 0000',
    address: 'Amman, Jordan',
    instagram: 'https://instagram.com/greenofig',
    youtube:   'https://youtube.com/@greenofig',
    tiktok:    'https://tiktok.com/@greenofig',
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
      const keys = ['site_hero', 'site_about', 'site_pricing', 'site_faq', 'site_footer']
      const { data: rows } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', keys)
      if (cancelled) return
      const list = (rows as Row[] | null) ?? []
      for (const r of list) {
        if (!r?.value) continue
        if (r.key === 'site_hero') setHero((curr) => ({ ...curr, ...(r.value as Partial<HeroDraft>) }))
        if (r.key === 'site_about') setAbout((curr) => ({ ...curr, ...(r.value as Partial<AboutDraft>) }))
        if (r.key === 'site_pricing' && Array.isArray(r.value)) setPricing(r.value as PricingTier[])
        if (r.key === 'site_faq' && Array.isArray(r.value)) setFaq(r.value as FaqRow[])
        if (r.key === 'site_footer') setFooter((curr) => ({ ...curr, ...(r.value as Partial<FooterDraft>) }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const save = async () => {
    setSaveState('saving')
    const writes: { key: string; value: unknown }[] = [
      { key: 'site_hero', value: hero },
      { key: 'site_about', value: about },
      { key: 'site_pricing', value: pricing },
      { key: 'site_faq', value: faq },
      { key: 'site_footer', value: footer },
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
      /* show saved state regardless — user can retry on visible failure */
    }
    setSaveState('saved')
    setDirty(false)
    window.setTimeout(() => setSaveState('idle'), 1500)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('siteEditor')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tS('subtitle')}</p>
        </div>
      </header>

      {/* Tabs */}
      <nav
        aria-label="Site sections"
        className="flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1 border-b border-border"
      >
        {TABS.map(({ key, Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`shrink-0 inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium transition-colors relative ${
                active ? 'text-fg-1' : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={active ? 2 : 1.75} />
              {tS(`tabs.${key}` as 'tabs.hero')}
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-0.5 bg-lime-400 rounded-pill"
                />
              )}
            </button>
          )
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          {tab === 'hero' && (
            <HeroPane
              tS={tS}
              draft={hero}
              onChange={(d) => {
                setHero(d)
                markDirty()
              }}
            />
          )}
          {tab === 'about' && (
            <AboutPane
              tS={tS}
              draft={about}
              onChange={(d) => {
                setAbout(d)
                markDirty()
              }}
            />
          )}
          {tab === 'pricing' && (
            <PricingPane
              tS={tS}
              tiers={pricing}
              onChange={(t) => {
                setPricing(t)
                markDirty()
              }}
            />
          )}
          {tab === 'faq' && (
            <FaqPane
              tS={tS}
              rows={faq}
              onChange={(r) => {
                setFaq(r)
                markDirty()
              }}
            />
          )}
          {tab === 'footer' && (
            <FooterPane
              tS={tS}
              draft={footer}
              onChange={(d) => {
                setFooter(d)
                markDirty()
              }}
            />
          )}
        </div>

        {/* Preview */}
        <aside className="lg:col-span-1">
          <article className="rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-4">
            <header className="flex items-center justify-between gap-3 mb-3">
              <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold inline-flex items-center gap-1.5">
                <Eye className="w-3 h-3" strokeWidth={2} />
                {tS('preview')}
              </p>
            </header>
            <p className="text-[10px] text-fg-3 mb-4 leading-relaxed">
              {tS('previewHint')}
            </p>

            {tab === 'hero' && <HeroPreview draft={hero} />}
            {tab === 'about' && <AboutPreview draft={about} />}
            {tab === 'pricing' && <PricingPreview tiers={pricing} />}
            {tab === 'faq' && <FaqPreview rows={faq} />}
            {tab === 'footer' && <FooterPreview draft={footer} />}
          </article>
        </aside>
      </div>

      {(dirty || saveState === 'saved') && (
        <SaveBar
          tS={tS}
          state={saveState}
          onSave={save}
          onDiscard={() => {
            setDirty(false)
            setSaveState('idle')
          }}
        />
      )}
    </div>
  )
}

/* ── Editor panes ──────────────────────────────────────────────── */

function HeroPane({
  tS,
  draft,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  draft: HeroDraft
  onChange: (d: HeroDraft) => void
}) {
  const set = <K extends keyof HeroDraft>(k: K, v: HeroDraft[K]) =>
    onChange({ ...draft, [k]: v })
  return (
    <Section title={tS('hero.section')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={tS('hero.headline1')}>
          <Input value={draft.headline1} onChange={(v) => set('headline1', v)} />
        </Field>
        <Field label={tS('hero.headline2')} hint={tS('hero.headline2Hint')}>
          <Input value={draft.headline2} onChange={(v) => set('headline2', v)} />
        </Field>
        <Field label={tS('hero.subline1')}>
          <Input value={draft.subline1} onChange={(v) => set('subline1', v)} />
        </Field>
        <Field label={tS('hero.subline2')}>
          <Input value={draft.subline2} onChange={(v) => set('subline2', v)} />
        </Field>
        <Field label={tS('hero.subline3')}>
          <Input value={draft.subline3} onChange={(v) => set('subline3', v)} />
        </Field>
        <Field label={tS('hero.ctaLabel')}>
          <Input value={draft.ctaLabel} onChange={(v) => set('ctaLabel', v)} />
        </Field>
        <Field label={tS('hero.secondHeadline1')}>
          <Input value={draft.secondHeadline1} onChange={(v) => set('secondHeadline1', v)} />
        </Field>
        <Field label={tS('hero.secondHeadline2')}>
          <Input value={draft.secondHeadline2} onChange={(v) => set('secondHeadline2', v)} />
        </Field>
      </div>
    </Section>
  )
}

function AboutPane({
  tS,
  draft,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  draft: AboutDraft
  onChange: (d: AboutDraft) => void
}) {
  const set = <K extends keyof AboutDraft>(k: K, v: AboutDraft[K]) =>
    onChange({ ...draft, [k]: v })
  return (
    <Section title={tS('about.section')}>
      <div className="space-y-4">
        <Field label={tS('about.name')}>
          <Input value={draft.name} onChange={(v) => set('name', v)} />
        </Field>
        <Field label={tS('about.role')}>
          <Input value={draft.role} onChange={(v) => set('role', v)} />
        </Field>
        <Field label={tS('about.bio')}>
          <Textarea
            value={draft.bio}
            onChange={(v) => set('bio', v)}
            rows={5}
          />
        </Field>
        <Field label={tS('about.credentials')}>
          <Textarea
            value={draft.credentials}
            onChange={(v) => set('credentials', v)}
            rows={4}
            mono
          />
        </Field>
      </div>
    </Section>
  )
}

function PricingPane({
  tS,
  tiers,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  tiers: PricingTier[]
  onChange: (t: PricingTier[]) => void
}) {
  const update = (i: number, patch: Partial<PricingTier>) => {
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  return (
    <div className="space-y-4">
      {tiers.map((tier, i) => (
        <Section key={i} title={`${tS('pricing.section')} · ${tier.name}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label={tS('pricing.tier')}>
              <Input value={tier.name} onChange={(v) => update(i, { name: v })} />
            </Field>
            <Field label={tS('pricing.monthlyPrice')}>
              <Input
                type="number"
                value={String(tier.monthlyJod)}
                onChange={(v) => update(i, { monthlyJod: Number(v || 0) })}
              />
            </Field>
            <Field label={tS('pricing.yearlyPrice')}>
              <Input
                type="number"
                value={String(tier.yearlyJod)}
                onChange={(v) => update(i, { yearlyJod: Number(v || 0) })}
              />
            </Field>
            <Field label={tS('pricing.tagline')} className="md:col-span-3">
              <Input value={tier.tagline} onChange={(v) => update(i, { tagline: v })} />
            </Field>
            <Field
              label={tS('pricing.features')}
              hint={tS('pricing.featuresHint')}
              className="md:col-span-3"
            >
              <Textarea
                value={tier.features}
                onChange={(v) => update(i, { features: v })}
                rows={4}
              />
            </Field>
          </div>
        </Section>
      ))}
    </div>
  )
}

function FaqPane({
  tS,
  rows,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  rows: FaqRow[]
  onChange: (r: FaqRow[]) => void
}) {
  const add = () =>
    onChange([
      ...rows,
      { id: `faq-${Date.now()}`, question: '', answer: '' },
    ])
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id))
  const update = (id: string, patch: Partial<FaqRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  return (
    <Section
      title={tS('faq.section')}
      action={
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {tS('faq.addRow')}
        </button>
      }
    >
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className="rounded-lg bg-bg-deeper/40 border border-border p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span
                className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center bg-primary/15 text-lime-400 text-[11px] font-bold mt-0.5"
                dir="ltr"
              >
                {i + 1}
              </span>
              <Input
                value={row.question}
                onChange={(v) => update(row.id, { question: v })}
                placeholder={tS('faq.question')}
              />
              <button
                type="button"
                onClick={() => remove(row.id)}
                aria-label={tS('faq.remove')}
                className="shrink-0 w-9 h-9 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <Textarea
              value={row.answer}
              onChange={(v) => update(row.id, { answer: v })}
              placeholder={tS('faq.answer')}
              rows={2}
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function FooterPane({
  tS,
  draft,
  onChange,
}: {
  tS: ReturnType<typeof useTranslations>
  draft: FooterDraft
  onChange: (d: FooterDraft) => void
}) {
  const set = <K extends keyof FooterDraft>(k: K, v: FooterDraft[K]) =>
    onChange({ ...draft, [k]: v })
  return (
    <Section title={tS('footer.section')}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={tS('footer.tagline')} className="md:col-span-2">
          <Input value={draft.tagline} onChange={(v) => set('tagline', v)} />
        </Field>
        <Field label={tS('footer.supportEmail')}>
          <Input value={draft.supportEmail} onChange={(v) => set('supportEmail', v)} ltr />
        </Field>
        <Field label={tS('footer.supportPhone')}>
          <Input value={draft.supportPhone} onChange={(v) => set('supportPhone', v)} ltr />
        </Field>
        <Field label={tS('footer.address')}>
          <Input value={draft.address} onChange={(v) => set('address', v)} />
        </Field>
        <Field label={tS('footer.instagram')}>
          <Input value={draft.instagram} onChange={(v) => set('instagram', v)} ltr />
        </Field>
        <Field label={tS('footer.youtube')}>
          <Input value={draft.youtube} onChange={(v) => set('youtube', v)} ltr />
        </Field>
        <Field label={tS('footer.tiktok')}>
          <Input value={draft.tiktok} onChange={(v) => set('tiktok', v)} ltr />
        </Field>
      </div>
    </Section>
  )
}

/* ── Previews ──────────────────────────────────────────────────── */

function HeroPreview({ draft }: { draft: HeroDraft }) {
  return (
    <div className="rounded-lg bg-bg-deeper p-4 text-center">
      <p className="font-display text-2xl font-bold text-fg-1 tracking-tight" style={{ lineHeight: 0.95, letterSpacing: '-0.04em' }}>
        {draft.headline1}{' '}
        <span className="text-lime-400">{draft.headline2}</span>
      </p>
      <p className="mt-3 text-xs text-fg-2 leading-relaxed">
        {draft.subline1} {draft.subline2} {draft.subline3}
      </p>
      <p className="mt-4 font-display text-lg font-bold text-fg-1 tracking-tight">
        {draft.secondHeadline1}{' '}
        <span className="text-lime-400">{draft.secondHeadline2}</span>
      </p>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60"
      >
        {draft.ctaLabel}
      </button>
    </div>
  )
}

function AboutPreview({ draft }: { draft: AboutDraft }) {
  return (
    <div className="rounded-lg bg-bg-deeper p-4">
      <p className="font-display text-base font-bold text-fg-1">{draft.name}</p>
      <p className="text-[11px] text-lime-400 font-semibold mt-0.5">{draft.role}</p>
      <p className="mt-3 text-xs text-fg-2 leading-relaxed line-clamp-4">
        {draft.bio}
      </p>
      <ul className="mt-3 space-y-1 text-[11px] text-fg-3 font-mono leading-snug" dir="ltr">
        {draft.credentials
          .split('\n')
          .filter(Boolean)
          .slice(0, 3)
          .map((c, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-lime-400 shrink-0" />
              {c}
            </li>
          ))}
      </ul>
    </div>
  )
}

function PricingPreview({ tiers }: { tiers: PricingTier[] }) {
  return (
    <ul className="space-y-2">
      {tiers.map((t) => (
        <li
          key={t.name}
          className="rounded-lg bg-bg-deeper border border-border p-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-fg-1">{t.name}</p>
            <p className="font-mono text-sm text-lime-400" dir="ltr">
              {t.monthlyJod === 0 ? 'Free' : `${t.monthlyJod} USD`}
            </p>
          </div>
          <p className="mt-0.5 text-[11px] text-fg-3">{t.tagline}</p>
        </li>
      ))}
    </ul>
  )
}

function FaqPreview({ rows }: { rows: FaqRow[] }) {
  return (
    <ul className="space-y-2">
      {rows.slice(0, 4).map((r, i) => (
        <li
          key={r.id}
          className="rounded-lg bg-bg-deeper border border-border p-3"
        >
          <div className="flex items-start gap-2">
            <span
              className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-lime-400 text-[10px] font-bold inline-flex items-center justify-center mt-0.5"
              dir="ltr"
            >
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-semibold text-fg-1">
                {r.question || '— question —'}
              </p>
              <p className="mt-1 text-[11px] text-fg-3 leading-relaxed line-clamp-2">
                {r.answer || '— answer —'}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function FooterPreview({ draft }: { draft: FooterDraft }) {
  return (
    <div className="rounded-lg bg-bg-deeper p-4 space-y-2">
      <p className="text-xs text-fg-2 leading-relaxed">{draft.tagline}</p>
      <ul className="space-y-1 text-[11px] font-mono text-fg-3" dir="ltr">
        <li>{draft.supportEmail}</li>
        <li>{draft.supportPhone}</li>
        <li>{draft.address}</li>
      </ul>
    </div>
  )
}

/* ── Reusables ──────────────────────────────────────────────────── */

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
          {title}
        </h2>
        {action}
      </header>
      <div className="rounded-xl border border-border bg-surface p-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={className}>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-fg-3">{hint}</p>}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  ltr,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  ltr?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      dir={ltr ? 'ltr' : undefined}
      className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  mono?: boolean
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full resize-y rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed ${
        mono ? 'font-mono text-fg-1' : 'text-fg-1'
      }`}
    />
  )
}

function SaveBar({
  tS,
  state,
  onSave,
  onDiscard,
}: {
  tS: ReturnType<typeof useTranslations>
  state: 'idle' | 'saving' | 'saved'
  onSave: () => void
  onDiscard: () => void
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
        {state !== 'saved' && (
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-medium text-fg-2 hover:text-fg-1"
          >
            {tS('discard')}
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={state === 'saving' || state === 'saved'}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-5 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Save className="w-3.5 h-3.5" strokeWidth={2} />
          {tS('publish')}
        </button>
      </div>
    </div>
  )
}
