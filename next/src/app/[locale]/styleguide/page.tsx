import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import {
  Search, Bell, ChevronDown, ChevronUp, Plus, Minus, ArrowRight,
  X, Crown, Sparkles, Heart, Clock, Calendar, MessageSquare,
  Home as HomeIcon, Utensils, Dumbbell, TrendingUp, Settings, HelpCircle,
  Users, FileText, BarChart3, CreditCard, LayoutDashboard, Leaf, Filter,
  Trash2, MoreHorizontal, ShoppingCart, ArrowUpDown,
  type LucideIcon,
} from 'lucide-react'
import { StyleguideNav, type NavSection } from './StyleguideNav'

const SECTIONS: NavSection[] = [
  { id: 'colors', label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'cards', label: 'Cards' },
  { id: 'badges', label: 'Badges & Pills' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'chatbot', label: 'AI Chatbot' },
  { id: 'progress', label: 'Progress' },
  { id: 'data-table', label: 'Data Table' },
  { id: 'spacing', label: 'Spacing & Radius' },
  { id: 'icons-3d', label: '3D Icons' },
  { id: 'motion', label: 'Motion' },
]

export const metadata = { title: 'GreenoFig — Styleguide' }

interface StyleguidePageProps {
  params: { locale: string }
}

export default function StyleguidePage({ params }: StyleguidePageProps) {
  setRequestLocale(params.locale)

  return (
    <main className="min-h-screen bg-bg text-fg-1">
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold tracking-tight">
              <span style={{ color: '#f0ede6' }}>Greeno</span><span style={{ color: '#a3e635' }}>fig</span>
            </span>
            <span className="text-xs uppercase tracking-eyebrow text-fg-3">
              Styleguide
            </span>
          </div>
          <Link
            href="/"
            className="text-sm text-fg-2 hover:text-lime-400 transition-colors duration-fast ease-out"
          >
            ← Home
          </Link>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-12 flex gap-12">
        <StyleguideNav sections={SECTIONS} />

        <div className="flex-1 min-w-0 space-y-24">
          <Colors />
          <Typography />
          <Buttons />
          <Inputs />
          <Cards />
          <Badges />
          <Navigation />
          <Chatbot />
          <Progress />
          <DataTable />
          <SpacingRadius />
          <Icons3D />
          <Motion />
        </div>
      </div>
    </main>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Section primitives                                                  */
/* ─────────────────────────────────────────────────────────────────── */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-8">
        <p className="eyebrow mb-2">{title}</p>
        <h2 className="font-display text-4xl tracking-tight">{title}</h2>
        {description && (
          <p className="mt-3 text-fg-2 max-w-2xl">{description}</p>
        )}
      </div>
      <div className="space-y-8">{children}</div>
    </section>
  )
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs uppercase tracking-eyebrow text-fg-3 mb-3">
      {children}
    </h3>
  )
}

function Swatch({
  hex,
  name,
  token,
  dark = false,
}: {
  hex: string
  name: string
  token: string
  dark?: boolean
}) {
  return (
    <div
      className="rounded-lg border border-border overflow-hidden flex flex-col h-24 justify-end p-3"
      style={{ backgroundColor: hex }}
    >
      <div
        className={dark ? 'text-fg-1' : 'text-fg-1'}
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {name}
      </div>
      <div
        className={`font-mono text-xs ${dark ? 'text-fg-1/70' : 'text-fg-2'}`}
      >
        {hex}
      </div>
      <div
        className={`font-mono text-[10px] ${dark ? 'text-fg-3' : 'text-fg-3'}`}
      >
        {token}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Colors                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function Colors() {
  const surfaces = [
    ['#0d1a12', 'Background',     'colors.bg'],
    ['#060d09', 'Background deeper', 'colors.bgDeeper'],
    ['#132218', 'Surface',        'colors.surface'],
    ['#1a3320', 'Surface raised', 'colors.surfaceRaised'],
    ['#243d2a', 'Border',         'colors.border'],
  ] as const

  const brand = [
    ['#3d7a4a', 'Primary',         'colors.primary'],
    ['#4a9259', 'Primary hover',   'colors.primaryHover'],
    ['#2e5c37', 'Primary active',  'colors.primaryActive'],
  ] as const

  const lime = [
    ['#a3e635', 'Lime 400', 'colors.lime400'],
    ['#84cc16', 'Lime 500', 'colors.lime500'],
    ['#65a30d', 'Lime 600', 'colors.lime600'],
  ] as const

  const accents = [
    ['#e8912a', 'Amber',     'colors.amber'],
    ['#c0392b', 'Beet',      'colors.beet'],
    ['#6b3fa0', 'Berry',     'colors.berry'],
    ['#c9a84c', 'Fig gold',  'colors.figGold'],
    ['#16a34a', 'Forest',    'colors.forest'],
  ] as const

  const text = [
    ['#f0ede6', 'Text 1 (primary)',   'colors.text1'],
    ['#9baf9f', 'Text 2 (secondary)', 'colors.text2'],
    ['#5c7262', 'Text 3 (tertiary)',  'colors.text3'],
  ] as const

  const state = [
    ['#4caf72', 'Success', 'colors.success'],
    ['#e8912a', 'Warning', 'colors.warning'],
    ['#c0392b', 'Error',   'colors.error'],
    ['#4a9ac4', 'Info',    'colors.info'],
  ] as const

  const isDark = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 < 128
  }

  const grid = (rows: readonly (readonly [string, string, string])[]) => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {rows.map(([hex, name, token]) => (
        <Swatch key={token} hex={hex} name={name} token={token} dark={isDark(hex)} />
      ))}
    </div>
  )

  return (
    <Section
      id="colors"
      title="Colors"
      description="Forest green is the primary. Lime is an accent only. Dark by default — every page surface comes from this set."
    >
      <div><Subhead>Page surfaces</Subhead>{grid(surfaces)}</div>
      <div><Subhead>Brand — Primary forest green</Subhead>{grid(brand)}</div>
      <div><Subhead>Lime accent</Subhead>{grid(lime)}</div>
      <div><Subhead>Accents</Subhead>{grid(accents)}</div>
      <div><Subhead>Text levels</Subhead>{grid(text)}</div>
      <div><Subhead>Semantic state</Subhead>{grid(state)}</div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Typography                                                          */
/* ─────────────────────────────────────────────────────────────────── */

function Typography() {
  const rows = [
    { sample: 'Nourish Better.', cls: 'display', font: 'Fraunces 700', size: 'clamp(48–88px) / 1.05', token: '--text-display' },
    { sample: 'Section Title H1', cls: 'text-[40px] leading-[44px] font-bold tracking-tight font-sans', font: 'Inter 700', size: '40 / 44', token: '--text-h1' },
    { sample: 'Section Title H2', cls: 'text-[32px] leading-[37px] font-bold tracking-tight font-sans', font: 'Inter 700', size: '32 / 37', token: '--text-h2' },
    { sample: 'Card title H3', cls: 'text-[24px] leading-[30px] font-semibold font-sans', font: 'Inter 600', size: '24 / 30', token: '--text-h3' },
    { sample: 'Component title H4', cls: 'text-[20px] leading-[26px] font-semibold font-sans', font: 'Inter 600', size: '20 / 26', token: '--text-h4' },
    { sample: 'Hero subhead — calm, explanatory.', cls: 'text-[18px] leading-[28px] font-sans', font: 'Inter 400', size: '18 / 28', token: '--text-lead' },
    { sample: 'Body copy — sentence case with a calm voice.', cls: 'text-[16px] leading-[26px] font-sans', font: 'Inter 400', size: '16 / 26', token: '--text-body' },
    { sample: 'Small / supporting copy.', cls: 'text-[14px] leading-[21px] font-sans text-fg-2', font: 'Inter 400', size: '14 / 21', token: '--text-small' },
    { sample: 'CAPTION — chips & meta', cls: 'text-[12px] leading-[17px] font-medium font-sans uppercase tracking-eyebrow', font: 'Inter 500', size: '12 / 17', token: '--text-xs' },
    { sample: '0.875rem mono', cls: 'text-[14px] leading-[21px] font-mono', font: 'JetBrains Mono 400', size: '14 / 21', token: '--text-mono' },
    { sample: 'AI-POWERED ORGANIC LIVING', cls: 'eyebrow', font: 'Inter 600', size: '12 / 1', token: '.eyebrow' },
    { sample: 'البيانات تذوب', cls: 'text-[24px] leading-[32px] font-arabic', font: 'Noto Sans Arabic 500', size: 'RTL', token: '--font-arabic' },
  ] as const

  return (
    <Section
      id="typography"
      title="Typography"
      description="Fraunces for display only. Inter is the workhorse. JetBrains Mono for stats. Noto Sans Arabic for RTL. Three families — never introduce a fourth."
    >
      <div className="space-y-6">
        {rows.map((r) => (
          <div
            key={r.token}
            className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-3 border-b border-border pb-6"
          >
            <p className={r.cls}>{r.sample}</p>
            <div className="font-mono text-xs text-fg-2 flex flex-wrap gap-x-6 gap-y-1">
              <span>{r.font}</span>
              <span>{r.size}</span>
              <span className="text-lime-400">{r.token}</span>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Buttons                                                             */
/* ─────────────────────────────────────────────────────────────────── */

function Buttons() {
  // Each row demonstrates one variant in 4 visual states
  const baseBtn = 'inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm font-medium transition-all duration-normal ease-out'

  return (
    <Section
      id="buttons"
      title="Buttons"
      description="Primary lime CTA, ink-on-light secondary, ghost for low-emphasis, destructive for delete. All buttons share the 0.22/1/0.36/1 ease and base 300ms duration."
    >
      <Subhead>Variants (default state)</Subhead>
      <div className="flex flex-wrap gap-4">
        <button className={`${baseBtn} bg-primary text-fg-1 shadow-glow hover:shadow-glow-lg hover:-translate-y-px`}>
          Get Started <ArrowRight strokeWidth={1.75} className="w-4 h-4" />
        </button>
        <button className={`${baseBtn} bg-bg-deeper text-fg-1 hover:bg-bg/90`}>
          Book Free Consultation
        </button>
        <button className={`${baseBtn} bg-transparent border border-border text-fg-1 hover:bg-surface-raised`}>
          Watch Demo
        </button>
        <button className={`${baseBtn} bg-transparent text-fg-2 hover:text-lime-400 hover:bg-surface-raised`}>
          Sign in
        </button>
        <button className={`${baseBtn} bg-error text-fg-1 hover:bg-error/90`}>
          <Trash2 strokeWidth={1.75} className="w-4 h-4" /> Delete
        </button>
        <button className={`${baseBtn} bg-primary text-fg-1 shadow-glow`}>
          <ShoppingCart strokeWidth={1.75} className="w-4 h-4" /> Add to cart
        </button>
        <button className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-surface-raised text-fg-2 hover:bg-primary/15 hover:text-lime-400 transition-colors duration-fast ease-out">
          <Plus strokeWidth={1.75} className="w-5 h-5" />
        </button>
      </div>

      <div>
        <Subhead>Sizes</Subhead>
        <div className="flex flex-wrap items-end gap-4">
          <button className="inline-flex items-center gap-2 rounded-md bg-primary text-fg-1 px-3 py-2 text-xs font-medium shadow-glow hover:shadow-glow-lg transition-all duration-normal ease-out">
            Small
          </button>
          <button className={`${baseBtn} bg-primary text-fg-1 shadow-glow hover:shadow-glow-lg`}>
            Default
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary text-fg-1 px-7 py-4 text-base font-medium shadow-glow hover:shadow-glow-lg transition-all duration-normal ease-out">
            Large
          </button>
          <button className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg px-5 py-2.5 text-sm font-semibold shadow-glow hover:shadow-glow-lg transition-all duration-normal ease-out">
            Pill primary <ArrowRight strokeWidth={1.75} className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <Subhead>States — primary CTA</Subhead>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StateBox label="Default">
            <button className={`${baseBtn} bg-primary text-fg-1 shadow-glow`}>Get Started</button>
          </StateBox>
          <StateBox label="Hover">
            <button className={`${baseBtn} bg-primary text-fg-1 shadow-glow-lg -translate-y-px`}>Get Started</button>
          </StateBox>
          <StateBox label="Focus">
            <button className={`${baseBtn} bg-primary text-fg-1 ring-2 ring-ring ring-offset-2 ring-offset-bg`}>Get Started</button>
          </StateBox>
          <StateBox label="Disabled">
            <button disabled className={`${baseBtn} bg-primary/40 text-fg-1 cursor-not-allowed`}>Get Started</button>
          </StateBox>
        </div>
      </div>

      <div>
        <Subhead>States — secondary (outline on dark)</Subhead>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['Default', 'Hover', 'Focus', 'Disabled'] as const).map((state) => (
            <div key={state} className="rounded-lg p-6 bg-bg flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-eyebrow text-fg-2">{state}</span>
              <button
                disabled={state === 'Disabled'}
                className={`${baseBtn} bg-transparent border border-fg-1/20 backdrop-blur-md text-fg-1
                  ${state === 'Hover' ? 'bg-fg-1/10' : ''}
                  ${state === 'Focus' ? 'ring-2 ring-lime-400 ring-offset-2 ring-offset-bg' : ''}
                  ${state === 'Disabled' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Watch Demo
              </button>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function StateBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-eyebrow text-fg-3">{label}</span>
      {children}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Inputs                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function Inputs() {
  const fieldBase = 'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg-1 placeholder:text-fg-3 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-fast ease-out'

  return (
    <Section
      id="inputs"
      title="Inputs"
      description="Inputs share the border colour with the surface line — flush, not bumped. Lime focus ring carries from buttons. 8px radius across the system."
    >
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl">
        <label className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input className={fieldBase} placeholder="you@greenofig.com" type="email" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Search</span>
          <div className="relative">
            <Search strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
            <input className={`${fieldBase} pl-10`} placeholder="Search recipes, plans, messages…" />
          </div>
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Notes for your nutritionist</span>
          <textarea className={`${fieldBase} min-h-[120px] resize-y`} placeholder="What changed this week?" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Plan</span>
          <div className="relative">
            <select className={`${fieldBase} appearance-none pr-10`}>
              <option>Mediterranean Reset</option>
              <option>Plant-forward</option>
              <option>Higher protein</option>
            </select>
            <ChevronDown strokeWidth={1.75} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3 pointer-events-none" />
          </div>
        </label>

        <div className="space-y-2">
          <span className="text-sm font-medium">Servings</span>
          <div className="inline-flex items-center rounded-md border border-border bg-surface overflow-hidden">
            <button className="px-3 py-2 text-fg-2 hover:bg-surface-raised transition-colors duration-fast ease-out">
              <Minus strokeWidth={1.75} className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-sm font-mono w-10 text-center">2</span>
            <button className="px-3 py-2 text-fg-2 hover:bg-surface-raised transition-colors duration-fast ease-out">
              <Plus strokeWidth={1.75} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Cards                                                               */
/* ─────────────────────────────────────────────────────────────────── */

function Cards() {
  const card = 'rounded-lg border border-border bg-surface shadow-sm transition-all duration-normal ease-out hover:-translate-y-1 hover:shadow-glow'

  return (
    <Section
      id="cards"
      title="Cards"
      description="Solid-bg cards over the cream app surface. 12px radius, hairline border, lime glow on hover. Variant cards lean on a subtle primary tint for emphasis."
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Product card */}
        <article className={`${card} overflow-hidden`}>
          <div className="aspect-[4/3] bg-gradient-to-br from-primary/15 to-amber/20 flex items-center justify-center">
            <Leaf strokeWidth={1.75} className="w-16 h-16 text-lime-600/50" />
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-h3 font-semibold">Daily Greens</h3>
                <p className="text-sm text-fg-2">30 servings · 18 ingredients</p>
              </div>
              <span className="rounded-pill bg-primary/15 text-lime-400 px-2.5 py-0.5 text-xs font-semibold">New</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xl font-bold">$48</span>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-bg-deeper text-fg-1 px-3 py-2 text-xs font-medium hover:bg-bg/90 transition-colors duration-fast ease-out">
                <ShoppingCart strokeWidth={1.75} className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </article>

        {/* Recipe card */}
        <article className={`${card} overflow-hidden`}>
          <div className="aspect-[4/3] bg-gradient-to-br from-amber/30 to-fig-gold/20 relative">
            <span className="absolute top-3 left-3 rounded-pill bg-fg-1/90 backdrop-blur text-fg-1 px-2.5 py-0.5 text-xs font-semibold">
              Lunch
            </span>
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-pill bg-bg/70 backdrop-blur text-fg-1 px-2.5 py-0.5 text-xs font-medium">
              <Clock strokeWidth={1.75} className="w-3 h-3" /> 20 min
            </span>
          </div>
          <div className="p-5 space-y-2">
            <h3 className="text-h3 font-semibold">Quinoa Power Salad</h3>
            <p className="text-sm text-fg-2">480 kcal · 32g protein · 12g fat</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-pill bg-surface-raised text-fg-2 px-2 py-0.5 text-xs">Vegetarian</span>
              <span className="rounded-pill bg-surface-raised text-fg-2 px-2 py-0.5 text-xs">High fiber</span>
            </div>
          </div>
        </article>

        {/* Milestone card */}
        <article className="rounded-lg border border-lime-500/30 bg-gradient-to-br from-primary/15 to-fg-1 p-5 shadow-sm relative">
          <span className="absolute top-4 right-4 rounded-pill bg-lime-500 text-bg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-eyebrow">
            7 day streak
          </span>
          <div className="w-12 h-12 rounded-xl bg-amber/15 text-amber flex items-center justify-center mb-3">
            <Sparkles strokeWidth={1.75} className="w-6 h-6" />
          </div>
          <h3 className="text-h3 font-semibold mb-1">Real progress</h3>
          <p className="text-sm text-fg-2">+2.1kg lean mass over 30 days. Sleep up 40 minutes.</p>
        </article>

        {/* Service card */}
        <article className={`${card} p-5 space-y-3`}>
          <div className="w-12 h-12 rounded-xl bg-lime-500/15 text-lime-400 flex items-center justify-center">
            <Calendar strokeWidth={1.75} className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-h3 font-semibold">Weekly Check-ins</h3>
            <p className="mt-1 text-sm text-fg-2">A real conversation with your nutritionist every week — adjustments, encouragement, accountability.</p>
          </div>
          <a className="inline-flex items-center gap-1 text-sm font-medium text-lime-400 hover:gap-2 transition-all duration-fast ease-out" href="#">
            Learn more <ArrowRight strokeWidth={1.75} className="w-4 h-4" />
          </a>
        </article>

        {/* KPI tile */}
        <article className={`${card} p-5`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/15 text-[#f97316] flex items-center justify-center">
              <TrendingUp strokeWidth={1.75} className="w-5 h-5" />
            </div>
            <span className="text-xs uppercase tracking-eyebrow text-fg-2">Calories</span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight">1,240</span>
            <span className="text-sm text-fg-2">/ 1,840</span>
          </div>
          <div className="mt-3 h-1 rounded-pill bg-surface-raised overflow-hidden">
            <div className="h-full rounded-pill bg-[#f97316]" style={{ width: '67%' }} />
          </div>
        </article>

        {/* Nutritionist post card */}
        <article className={`${card} p-5 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-pill bg-gradient-to-br from-lime-500 to-amber text-bg flex items-center justify-center text-sm font-bold">
              LH
            </div>
            <div>
              <p className="text-sm font-semibold">Dr. Rawan Othman</p>
              <p className="text-xs text-fg-2">Registered Dietitian · 3h ago</p>
            </div>
          </div>
          <p className="text-sm text-fg-1/80 leading-relaxed">
            Quick reminder: hydration before caffeine. A glass of water in the first 20 minutes of your day moves the needle more than people realize.
          </p>
          <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-fg-2">
            <button className="inline-flex items-center gap-1.5 hover:text-lime-400 transition-colors duration-fast ease-out">
              <Heart strokeWidth={1.75} className="w-3.5 h-3.5" /> 248
            </button>
            <button className="inline-flex items-center gap-1.5 hover:text-lime-400 transition-colors duration-fast ease-out">
              <MessageSquare strokeWidth={1.75} className="w-3.5 h-3.5" /> 12
            </button>
          </div>
        </article>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Badges                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function Badges() {
  const tiers: ReadonlyArray<{ label: string; cls: string; icon?: React.ReactNode }> = [
    { label: 'Free',    cls: 'bg-surface-raised text-fg-2' },
    { label: 'Basic',   cls: 'bg-info/15 text-info' },
    { label: 'Premium', cls: 'bg-amber/20 text-amber', icon: <Crown strokeWidth={1.75} className="w-3 h-3" /> },
    { label: 'VIP',     cls: 'bg-bg-deeper text-lime-400', icon: <Sparkles strokeWidth={1.75} className="w-3 h-3" /> },
  ]
  const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Vegetarian', 'High protein', 'Quick', 'No-cook']
  const status: ReadonlyArray<{ label: string; cls: string }> = [
    { label: 'New',         cls: 'bg-primary/15 text-lime-400' },
    { label: 'Bestseller',  cls: 'bg-amber/20 text-amber' },
    { label: 'Sold out',    cls: 'bg-error/15 text-error' },
    { label: 'Coming soon', cls: 'bg-surface-raised text-fg-2' },
  ]

  return (
    <Section
      id="badges"
      title="Badges & Pills"
      description="rounded-pill 9999 · 12px text · 600 weight. Tier ladder maps to color emphasis. Status pills carry their own tint at 15–20% alpha."
    >
      <div>
        <Subhead>Tier badges</Subhead>
        <div className="flex flex-wrap gap-3">
          {tiers.map((t) => (
            <span
              key={t.label}
              className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-semibold ${t.cls}`}
            >
              {t.icon}
              {t.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <Subhead>Category tags</Subhead>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="rounded-pill bg-surface-raised text-fg-2 px-2.5 py-0.5 text-xs font-medium">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div>
        <Subhead>Status pills</Subhead>
        <div className="flex flex-wrap gap-3">
          {status.map((s) => (
            <span key={s.label} className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Navigation                                                          */
/* ─────────────────────────────────────────────────────────────────── */

function Navigation() {
  return (
    <Section
      id="navigation"
      title="Navigation"
      description="Top app bar, three role-aware sidebars (User / Nutritionist / Admin), and a mobile bottom tab bar with a centered FAB."
    >
      {/* Top app bar */}
      <div>
        <Subhead>Top app bar (in-product)</Subhead>
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <div>
              <h4 className="text-h4 font-semibold tracking-tight">Dashboard</h4>
              <p className="text-xs text-fg-2 mt-0.5">Good morning, Sarah · Wednesday</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-pill bg-surface-raised px-3 h-9 w-72">
                <Search strokeWidth={1.75} className="w-4 h-4 text-fg-3" />
                <input className="flex-1 bg-transparent text-sm placeholder:text-fg-3 focus:outline-none" placeholder="Search…" />
                <kbd className="font-mono text-[10px] bg-surface border border-border rounded px-1.5 py-0.5 text-fg-2">⌘K</kbd>
              </div>
              <button className="relative w-9 h-9 rounded-pill bg-surface-raised flex items-center justify-center text-fg-2">
                <Bell strokeWidth={1.75} className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-pill bg-amber border-2 border-card" />
              </button>
              <span className="w-9 h-9 rounded-pill bg-gradient-to-br from-lime-500 to-amber text-bg text-xs font-bold flex items-center justify-center">SA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar variants */}
      <div>
        <Subhead>Sidebar — role variants</Subhead>
        <div className="grid md:grid-cols-3 gap-6">
          <SidebarPreview
            label="User"
            items={[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Leaf, label: 'AI Coach' },
              { icon: Utensils, label: 'Meal Plans' },
              { icon: Dumbbell, label: 'Fitness' },
              { icon: TrendingUp, label: 'Progress' },
              { icon: MessageSquare, label: 'Messages', badge: 2 },
              { icon: Calendar, label: 'Appointments' },
            ]}
          />
          <SidebarPreview
            label="Nutritionist"
            items={[
              { icon: LayoutDashboard, label: 'Overview', active: true },
              { icon: Users, label: 'Clients' },
              { icon: Utensils, label: 'Meal Plans' },
              { icon: Calendar, label: 'Schedule' },
              { icon: MessageSquare, label: 'Messages' },
              { icon: FileText, label: 'Notes' },
            ]}
          />
          <SidebarPreview
            label="Admin"
            items={[
              { icon: LayoutDashboard, label: 'Dashboard', active: true },
              { icon: Users, label: 'Users' },
              { icon: CreditCard, label: 'Subscriptions' },
              { icon: BarChart3, label: 'Analytics' },
              { icon: FileText, label: 'Content' },
              { icon: HelpCircle, label: 'Support' },
              { icon: Settings, label: 'Settings' },
            ]}
          />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div>
        <Subhead>Mobile bottom tab bar with FAB</Subhead>
        <div className="max-w-sm mx-auto rounded-2xl border border-border bg-surface shadow-md overflow-hidden">
          <div className="aspect-[9/4] bg-bg relative">
            <div className="absolute inset-x-0 bottom-0 bg-surface border-t border-border px-4 pt-2 pb-3 flex items-end justify-between">
              {[
                { icon: HomeIcon, label: 'Home', active: true },
                { icon: Utensils, label: 'Meals' },
                null,
                { icon: TrendingUp, label: 'Progress' },
                { icon: Settings, label: 'More' },
              ].map((item, i) =>
                item ? (
                  <button
                    key={i}
                    className={`flex flex-col items-center gap-1 w-12 ${item.active ? 'text-lime-400' : 'text-fg-3'}`}
                  >
                    <item.icon strokeWidth={1.75} className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                ) : (
                  <button
                    key={i}
                    className="-mt-8 w-14 h-14 rounded-pill bg-primary text-fg-1 shadow-glow flex items-center justify-center"
                    aria-label="Quick action"
                  >
                    <Plus strokeWidth={1.75} className="w-6 h-6" />
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}

function SidebarPreview({
  label,
  items,
}: {
  label: string
  items: ReadonlyArray<{ icon: LucideIcon; label: string; active?: boolean; badge?: number }>
}) {
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-display text-sm font-bold tracking-tight">
          <span style={{ color: '#f0ede6' }}>Greeno</span><span style={{ color: '#a3e635' }}>fig</span>
        </span>
        <span className="text-[10px] uppercase tracking-eyebrow text-fg-3">{label}</span>
      </div>
      <ul className="p-2 space-y-1">
        {items.map((it) => {
          const Icon = it.icon
          return (
            <li key={it.label}>
              <button
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-fast ease-out ${
                  it.active ? 'bg-primary/15 text-lime-400 font-medium' : 'text-fg-2 hover:bg-surface-raised'
                }`}
              >
                <Icon strokeWidth={1.75} className="w-4 h-4" />
                <span className="flex-1 text-left">{it.label}</span>
                {it.badge !== undefined && (
                  <span className="rounded-pill bg-lime-500 text-bg text-[10px] font-bold px-1.5 py-0.5">{it.badge}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* AI Chatbot                                                          */
/* ─────────────────────────────────────────────────────────────────── */

function Chatbot() {
  return (
    <Section
      id="chatbot"
      title="AI Chatbot"
      description="Coach uses Leaf, never Bot. Lime accents on assistant bubbles, ink-bg user bubbles, action chips for next steps."
    >
      <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start">
        {/* Collapsed bubble */}
        <div>
          <Subhead>Collapsed</Subhead>
          <button className="inline-flex items-center gap-3 rounded-pill bg-bg-deeper text-fg-1 pl-2 pr-5 py-2 shadow-lg">
            <span className="w-9 h-9 rounded-pill bg-gradient-to-br from-lime-500 to-amber flex items-center justify-center text-bg">
              <Leaf strokeWidth={1.75} className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium">Ask the Coach</span>
          </button>
        </div>

        {/* Expanded panel */}
        <div>
          <Subhead>Expanded panel</Subhead>
          <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-md max-w-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-md bg-gradient-to-br from-lime-500 to-amber text-bg flex items-center justify-center">
                  <Leaf strokeWidth={1.75} className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">GreenoFig Coach</p>
                  <p className="text-xs text-success flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-pill bg-success" />
                    Online · 5 messages remaining
                  </p>
                </div>
              </div>
              <button className="text-fg-3 hover:text-fg-1 transition-colors duration-fast ease-out">
                <X strokeWidth={1.75} className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 bg-bg">
              <div className="flex items-start gap-2 max-w-[85%]">
                <span className="w-7 h-7 rounded-md bg-gradient-to-br from-lime-500 to-amber text-bg flex items-center justify-center shrink-0">
                  <Leaf strokeWidth={1.75} className="w-4 h-4" />
                </span>
                <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-relaxed">
                  Good morning, Sarah. You logged a 320 kcal Greek yogurt bowl. Want me to balance lunch around your 120g protein target?
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <button className="rounded-pill bg-primary/15 border border-primary/30 text-lime-400 px-2.5 py-1 text-xs font-medium hover:bg-lime-500 hover:text-bg hover:border-lime-500 transition-colors duration-fast ease-out">
                      Add chicken
                    </button>
                    <button className="rounded-pill bg-primary/15 border border-primary/30 text-lime-400 px-2.5 py-1 text-xs font-medium hover:bg-lime-500 hover:text-bg hover:border-lime-500 transition-colors duration-fast ease-out">
                      Add chickpeas
                    </button>
                    <button className="rounded-pill bg-primary/15 border border-primary/30 text-lime-400 px-2.5 py-1 text-xs font-medium hover:bg-lime-500 hover:text-bg hover:border-lime-500 transition-colors duration-fast ease-out">
                      Keep as is
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-end gap-2 max-w-[85%] ml-auto">
                <div className="rounded-xl bg-bg-deeper text-fg-1 px-4 py-3 text-sm leading-relaxed">
                  Add chicken — and can I see this week&rsquo;s weight trend?
                </div>
              </div>
            </div>

            <div className="px-3 py-3 border-t border-border bg-surface flex items-center gap-2">
              <button className="w-9 h-9 rounded-md bg-surface-raised text-fg-2 flex items-center justify-center hover:bg-primary/15 hover:text-lime-400 transition-colors duration-fast ease-out">
                <Plus strokeWidth={1.75} className="w-4 h-4" />
              </button>
              <input className="flex-1 bg-transparent text-sm placeholder:text-fg-3 focus:outline-none px-2" placeholder="Ask about nutrition, recipes, or your plan…" />
              <button className="w-9 h-9 rounded-md bg-bg-deeper text-lime-400 flex items-center justify-center">
                <ArrowRight strokeWidth={2} className="w-4 h-4" />
              </button>
            </div>
            <p className="px-5 py-2 text-center text-[11px] text-fg-3 bg-surface border-t border-border">
              Always consult a healthcare professional for medical advice.
            </p>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Progress                                                            */
/* ─────────────────────────────────────────────────────────────────── */

function Progress() {
  const ringProgress = 72
  const radius = 36
  const stroke = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (ringProgress / 100) * circumference

  return (
    <Section
      id="progress"
      title="Progress"
      description="Ring for at-a-glance, bar for stacked stats, shimmer skeleton for loading."
    >
      <div className="flex flex-wrap gap-8">
        <div className="flex flex-col items-center gap-3">
          <Subhead>Ring</Subhead>
          <div className="relative">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={radius} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="hsl(var(--primary))"
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 48 48)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-lg font-bold">{ringProgress}%</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-[260px] space-y-4">
          <Subhead>Bar</Subhead>
          {([
            { label: 'Calories', value: 67, color: '#f97316' },
            { label: 'Protein',  value: 65, color: '#3b82f6' },
            { label: 'Water',    value: 80, color: '#06b6d4' },
            { label: 'Sleep',    value: 92, color: '#a855f7' },
          ] as const).map((b) => (
            <div key={b.label} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{b.label}</span>
                <span className="font-mono text-xs text-fg-2">{b.value}%</span>
              </div>
              <div className="h-2 rounded-pill bg-surface-raised overflow-hidden">
                <div className="h-full rounded-pill" style={{ width: `${b.value}%`, backgroundColor: b.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Subhead>Skeleton (loading)</Subhead>
        <div className="rounded-lg border border-border bg-surface p-5 space-y-3 max-w-md">
          <div className="h-4 rounded-md w-3/4 bg-gradient-to-r from-muted via-card to-muted bg-[length:200%_100%] animate-shimmer" />
          <div className="h-4 rounded-md w-1/2 bg-gradient-to-r from-muted via-card to-muted bg-[length:200%_100%] animate-shimmer" />
          <div className="h-20 rounded-lg bg-gradient-to-r from-muted via-card to-muted bg-[length:200%_100%] animate-shimmer" />
        </div>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Data table                                                          */
/* ─────────────────────────────────────────────────────────────────── */

function DataTable() {
  const rows = [
    { name: 'Sarah Ahmed',  plan: 'Premium', joined: 'Mar 14', status: 'Active',   amount: '$19.00' },
    { name: 'Omar Khalid',  plan: 'Basic',   joined: 'Apr 02', status: 'Trial',    amount: '$0.00' },
    { name: 'Rawan Othman', plan: 'VIP',     joined: 'Jan 28', status: 'Past due', amount: '$48.00' },
  ]

  const statusCls = (s: string) =>
    s === 'Active' ? 'bg-success/15 text-success'
      : s === 'Trial' ? 'bg-info/15 text-info'
      : 'bg-error/15 text-error'

  return (
    <Section
      id="data-table"
      title="Data Table"
      description="Filter bar, sortable headers, status pills, simple pagination — all from the same component vocabulary."
    >
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2 rounded-pill bg-surface-raised px-3 h-9 flex-1 min-w-[200px]">
            <Search strokeWidth={1.75} className="w-4 h-4 text-fg-3" />
            <input className="flex-1 bg-transparent text-sm placeholder:text-fg-3 focus:outline-none" placeholder="Search clients…" />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium text-fg-2 hover:bg-surface-raised transition-colors duration-fast ease-out">
            <Filter strokeWidth={1.75} className="w-3.5 h-3.5" /> Filter
          </button>
          <span className="text-xs text-fg-2 ml-auto">3 of 247</span>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-fg-1/60 text-fg-2">
            <tr>
              {['Client', 'Plan', 'Joined', 'Status', 'Amount'].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left font-medium text-xs uppercase tracking-wide">
                  <button className="inline-flex items-center gap-1 hover:text-fg-1 transition-colors duration-fast ease-out">
                    {h} <ArrowUpDown strokeWidth={1.75} className="w-3 h-3" />
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className={i < rows.length - 1 ? 'border-b border-border' : ''}>
                <td className="px-5 py-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-pill bg-gradient-to-br from-lime-500 to-amber text-bg text-[11px] font-bold flex items-center justify-center">
                    {r.name.split(' ').map((p) => p[0]).join('')}
                  </span>
                  <span className="font-medium">{r.name}</span>
                </td>
                <td className="px-5 py-3 text-fg-2">{r.plan}</td>
                <td className="px-5 py-3 text-fg-2 font-mono text-xs">{r.joined}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${statusCls(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{r.amount}</td>
                <td className="px-5 py-3">
                  <button className="text-fg-3 hover:text-fg-1 transition-colors duration-fast ease-out">
                    <MoreHorizontal strokeWidth={1.75} className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-fg-2">
          <span>Showing 1–3 of 247</span>
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-md hover:bg-surface-raised transition-colors duration-fast ease-out flex items-center justify-center">
              <ChevronUp strokeWidth={1.75} className="w-3.5 h-3.5 -rotate-90" />
            </button>
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                className={`w-8 h-8 rounded-md text-xs font-medium ${p === 1 ? 'bg-bg-deeper text-fg-1' : 'hover:bg-surface-raised'} transition-colors duration-fast ease-out`}
              >
                {p}
              </button>
            ))}
            <button className="w-8 h-8 rounded-md hover:bg-surface-raised transition-colors duration-fast ease-out flex items-center justify-center">
              <ChevronUp strokeWidth={1.75} className="w-3.5 h-3.5 rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Spacing & Radius                                                    */
/* ─────────────────────────────────────────────────────────────────── */

function SpacingRadius() {
  const spaces = [
    [1, 4], [2, 8], [3, 12], [4, 16], [5, 20], [6, 24], [8, 32], [10, 40], [12, 48], [16, 64], [24, 96],
  ] as const
  const radii = [
    ['sm', 8], ['md', 10], ['lg', 12], ['xl', 16], ['2xl', 24], ['pill', 9999],
  ] as const

  return (
    <Section
      id="spacing"
      title="Spacing & Radius"
      description="4px grid throughout — same tokens drive padding, gap, margin, and component sizing."
    >
      <div>
        <Subhead>Spacing scale</Subhead>
        <div className="space-y-2">
          {spaces.map(([k, px]) => (
            <div key={k} className="flex items-center gap-4">
              <span className="font-mono text-xs text-fg-2 w-16">space-{k}</span>
              <span className="font-mono text-xs text-fg-3 w-12">{px}px</span>
              <div className="h-4 bg-lime-500 rounded-sm" style={{ width: px }} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Subhead>Radius scale</Subhead>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {radii.map(([k, px]) => (
            <div key={k} className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 bg-lime-500"
                style={{ borderRadius: typeof px === 'number' ? Math.min(px, 32) : 0 }}
              />
              <div className="text-center">
                <div className="font-mono text-xs">{k}</div>
                <div className="font-mono text-[10px] text-fg-2">{px}px</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* 3D Icons                                                            */
/* ─────────────────────────────────────────────────────────────────── */

const ICON_BASE = 'https://bvconuycpdvgzbvbkijl.supabase.co/storage/v1/object/public/sizes'
const ICONS_3D = [
  'b6e66f-home', '5656e5-camera', 'f32794-calendar', '1acc3d-heart',
  '7e47be-setting', '1fded0-mobile', '5f20be-computer', '421bcd-dollar',
  '634b4b-crown', '49654f-trophy', '49b6f4-target', '744cc0-rocket',
  'ddbd61-bulb', '8924a0-mail', '628100-notebook', '269bcd-gift-box',
  '1b714e-tick', 'a68576-puzzle', '176980-folder', '313578-megaphone',
  '11463e-credit-card', '801da3-sun', '866e45-play', '4e7918-thumb-up',
  '65d841-file-text', '2d9fa2-link',
] as const

function Icons3D() {
  return (
    <Section
      id="icons-3d"
      title="3D Icons"
      description="Used for empty states, marketing chips, and dashboard moment-makers. Loaded at 200px from the brand CDN, displayed at 48px."
    >
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-6">
        {ICONS_3D.map((id) => {
          const name = id.split('-').slice(1).join('-')
          return (
            <div key={id} className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-surface border border-border flex items-center justify-center shadow-sm">
                <Image
                  src={`${ICON_BASE}/${id}/dynamic/200/color.webp`}
                  alt={name}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                  unoptimized
                />
              </div>
              <span className="font-mono text-[10px] text-fg-2 text-center">{name}</span>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* Motion                                                              */
/* ─────────────────────────────────────────────────────────────────── */

function Motion() {
  const eases = [
    { name: 'ease-out',   token: '--ease-out',    value: 'cubic-bezier(0.22, 1, 0.36, 1)',    cls: 'ease-out' },
    { name: 'ease-in',    token: '--ease-in',     value: 'cubic-bezier(0.4, 0, 0.6, 1)',      cls: 'ease-in' },
    { name: 'ease-bounce', token: '--ease-bounce', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', cls: 'ease-bounce' },
  ] as const

  const durations = [
    { name: 'fast',   ms: 150 },
    { name: 'base',   ms: 300 },
    { name: 'slow',   ms: 600 },
    { name: 'cinema', ms: 800 },
  ] as const

  return (
    <Section
      id="motion"
      title="Motion"
      description="Three eases, four durations. Apple-cinematic ease-out is the default. Reduced motion collapses everything to a 200ms opacity fade."
    >
      <div>
        <Subhead>Easing curves</Subhead>
        <div className="grid sm:grid-cols-3 gap-6">
          {eases.map((e) => (
            <div key={e.name} className="rounded-lg border border-border bg-surface p-5 space-y-3">
              <div>
                <p className="font-medium">{e.name}</p>
                <p className="font-mono text-[10px] text-fg-2 mt-0.5 break-all">{e.value}</p>
              </div>
              <div className="relative h-12 bg-surface-raised rounded-md overflow-hidden">
                <div
                  className={`absolute top-1/2 -translate-y-1/2 left-0 w-6 h-6 rounded-pill bg-lime-500 motion-demo ${e.cls}`}
                />
              </div>
              <p className="font-mono text-[10px] text-lime-400">{e.token}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Subhead>Durations</Subhead>
        <div className="space-y-3">
          {durations.map((d) => (
            <div key={d.name} className="flex items-center gap-4">
              <span className="font-mono text-sm w-20">{d.name}</span>
              <span className="font-mono text-xs text-fg-2 w-12">{d.ms}ms</span>
              <div className="flex-1 h-2 bg-surface-raised rounded-pill overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-lime-500 to-lime-400 rounded-pill"
                  style={{ width: `${(d.ms / 800) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .motion-demo { animation: slideX 1.6s infinite alternate; }
        .motion-demo.ease-out { animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
        .motion-demo.ease-in { animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); }
        .motion-demo.ease-bounce { animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes slideX {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100% - 24px)); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-demo { animation: none; }
        }
      `}</style>
    </Section>
  )
}
