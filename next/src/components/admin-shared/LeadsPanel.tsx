'use client'

import { useMemo, useState } from 'react'
import {
  Mail, Search, CheckCircle2, Phone, Globe, ChevronDown,
  ExternalLink, Download, MessageSquare, UserCheck, Archive, Trash2,
} from '@/icons'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Status = 'new' | 'contacted' | 'qualified' | 'converted' | 'closed' | 'spam'

interface LeadRow {
  id: string
  full_name: string
  email: string
  phone: string | null
  country: string | null
  quiz_answers: Record<string, string>
  primary_goal: string | null
  ebook_sent: boolean
  thank_you_sent: boolean
  status: Status
  assigned_to: string | null
  notes: string | null
  user_agent: string | null
  ip_country: string | null
  created_at: string
  contacted_at: string | null
  converted_at: string | null
}

const STATUS_FILTERS: { value: Status | 'all'; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'new',       label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed',    label: 'Closed' },
  { value: 'spam',      label: 'Spam' },
]

const STATUS_TINT: Record<Status, { bg: string; fg: string; border: string }> = {
  new:       { bg: 'rgba(163,230,53,0.12)', fg: '#a3e635', border: 'rgba(163,230,53,0.4)' },
  contacted: { bg: 'rgba(96,165,250,0.10)', fg: '#60a5fa', border: 'rgba(96,165,250,0.35)' },
  qualified: { bg: 'rgba(251,191,36,0.10)', fg: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  converted: { bg: 'rgba(74,222,128,0.10)', fg: '#4ade80', border: 'rgba(74,222,128,0.35)' },
  closed:    { bg: 'rgba(156,163,175,0.10)', fg: '#9ca3af', border: 'rgba(156,163,175,0.30)' },
  spam:      { bg: 'rgba(248,113,113,0.10)', fg: '#f87171', border: 'rgba(248,113,113,0.35)' },
}

// Pretty labels for the quiz keys + value translations.
const QUESTION_LABEL: Record<string, string> = {
  primaryGoal: 'Primary goal',
  ageRange: 'Age',
  gender: 'Gender',
  activityLevel: 'Activity level',
  mealsPerDay: 'Meals/day',
  cookingFrequency: 'Cooks at home',
  waterIntake: 'Water intake',
  sleepHours: 'Sleep',
  stressLevel: 'Stress',
  dietaryRestrictions: 'Dietary restrictions',
  medicalConditions: 'Conditions',
  biggestChallenge: 'Biggest challenge',
  triedBefore: 'Tried before',
  timeline: 'Timeline',
  commitment: 'Weekly commitment',
}

const VALUE_LABEL: Record<string, string> = {
  weight_loss: 'Weight loss',
  muscle_gain: 'Muscle gain',
  energy: 'More energy',
  condition: 'Manage a condition',
  longevity: 'Healthier eating',
  sedentary: 'Sedentary',
  light: 'Light activity',
  moderate: 'Moderate activity',
  high: 'High activity',
  graze: 'Grazes all day',
  daily: 'Daily',
  few_per_week: 'A few/week',
  weekends: 'Weekends',
  rarely: 'Rarely',
  none: 'None',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  gluten_free: 'Gluten-free',
  dairy_free: 'Dairy-free',
  halal: 'Halal',
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  thyroid: 'Thyroid',
  pcos: 'PCOS',
  gut: 'Gut issues',
  other: 'Other',
  time: 'Lack of time',
  cravings: 'Cravings',
  knowledge: "Doesn't know what to eat",
  consistency: 'Consistency',
  social: 'Social events',
  never: 'Never tried',
  few: 'Tried a few',
  many: 'Tried many',
  no_rush: 'No rush',
  female: 'Female',
  male: 'Male',
  prefer_not: 'Prefer not to say',
  overwhelming: 'Overwhelming',
  low: 'Low',
}

function valueLabel(v: string): string {
  return VALUE_LABEL[v] ?? v
}

export function LeadsPanel() {
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState<Record<string, string>>({})

  const queryFn = useMemo(() => {
    return async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return [] as LeadRow[]
      let q = supabase
        .from('consultation_leads')
        .select(
          'id, full_name, email, phone, country, quiz_answers, primary_goal, ebook_sent, thank_you_sent, status, assigned_to, notes, user_agent, ip_country, created_at, contacted_at, converted_at',
        )
        .order('created_at', { ascending: false })
        .limit(500)
      if (statusFilter !== 'all') q = q.eq('status', statusFilter)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as LeadRow[]
    }
  }, [statusFilter])

  const { data, loading, error, reload } = useSupabaseQuery<LeadRow[]>(queryFn, [statusFilter])

  const rows = useMemo(() => data ?? [], [data])
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        (r.phone ?? '').toLowerCase().includes(s) ||
        (r.primary_goal ?? '').toLowerCase().includes(s),
    )
  }, [rows, search])

  const counts = useMemo(() => {
    const c = { new: 0, total: rows.length, converted: 0 }
    rows.forEach((r) => {
      if (r.status === 'new') c.new += 1
      if (r.status === 'converted') c.converted += 1
    })
    return c
  }, [rows])

  async function setStatus(id: string, next: Status) {
    // Server stamps contacted_at / converted_at on first transition.
    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    })
    if (!res.ok) {
      console.error('[leads] update failed:', res.status)
      return
    }
    reload()
  }

  async function saveNotes(id: string) {
    const notes = editNotes[id] ?? ''
    const res = await fetch('/api/admin/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes }),
    })
    if (!res.ok) {
      console.error('[leads] notes save failed:', res.status)
      return
    }
    reload()
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this lead permanently?')) return
    const res = await fetch('/api/admin/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      console.error('[leads] delete failed:', res.status)
      return
    }
    reload()
  }

  function exportCsv() {
    const header = 'name,email,phone,country,goal,status,created_at\n'
    const body = rows
      .map((r) =>
        [r.full_name, r.email, r.phone ?? '', r.country ?? '', r.primary_goal ?? '', r.status, r.created_at]
          .map(csvCell)
          .join(','),
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `greenofig-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight inline-flex items-center gap-2.5"
            style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.1 }}
          >
            <Mail
              className="w-7 h-7"
              strokeWidth={1.75}
              color="#a3e635"
            />
            Leads
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2 max-w-2xl">
            People who completed the homepage health assessment. Reply
            directly, track progress through the funnel, or hand off to admin.
          </p>
        </div>
        {/* Export CSV — dashboard ghost pill, same as the Export CSV
         * on /clients and the Generate Code button on Store Curation. */}
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 transition-colors"
          style={{
            height: 40,
            padding: '0 14px',
            borderRadius: 8,
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            color: 'var(--gf-fg-1)',
            fontSize: 12,
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--gf-card-hover)'
            e.currentTarget.style.borderColor = 'rgba(132,217,61,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--gf-input-bg)'
            e.currentTarget.style.borderColor = 'var(--gf-border)'
          }}
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.75} color="currentColor" />
          Export CSV
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard label="Total leads" value={counts.total} tint="#60a5fa" />
        <KpiCard label="New / waiting" value={counts.new} tint="#a3e635" />
        <KpiCard label="Converted" value={counts.converted} tint="#4ade80" />
      </section>

      <section className="flex flex-wrap items-center gap-3">
        {/* Search input — dashboard input chrome (the global rule
         * paints var(--gf-input-bg) + var(--gf-border) + 8px radius). */}
        <div className="relative flex-1 min-w-0 basis-full sm:basis-auto sm:min-w-[200px]">
          <Search
            className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, goal…"
            className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
          />
        </div>
        {/* Status filter — segmented control matching the other
         * dashboard pages (8px outer radius, lime-tinted active). */}
        <div
          className="inline-flex items-center flex-wrap"
          style={{
            minHeight: 40,
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className="inline-flex items-center justify-center px-3 transition-colors"
                style={{
                  height: 32,
                  borderRadius: 6,
                  background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
                  color: active ? '#a3e635' : 'var(--gf-fg-2)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--gf-card-hover)'
                    e.currentTarget.style.color = 'var(--gf-fg-1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--gf-fg-2)'
                  }
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </section>

      {loading && <p className="text-sm text-fg-3">Loading…</p>}
      {error && (
        <p className="text-sm" style={{ color: '#f87171' }}>
          Error: {error}
        </p>
      )}
      {!loading && filtered.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: 'var(--gf-surface)', border: '1px solid var(--gf-border)' }}
        >
          <MessageSquare className="w-10 h-10 mx-auto text-fg-3 mb-3" strokeWidth={1.5} />
          <p className="text-sm text-fg-2">
            No leads yet. Submissions from the homepage assessment show up here.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((r) => {
          const open = openId === r.id
          const tint = STATUS_TINT[r.status]
          return (
            <li
              key={r.id}
              className="rounded-xl"
              style={{
                background: 'var(--gf-surface)',
                border: `1px solid ${
                  r.status === 'new'
                    ? 'rgba(163,230,53,0.4)'
                    : 'var(--gf-border)'
                }`,
              }}
            >
              <button
                onClick={() => setOpenId(open ? null : r.id)}
                className="w-full text-start p-4 flex items-start gap-3 hover:bg-bg-deeper/30 rounded-xl transition-colors"
              >
                <span
                  className="mt-1 inline-flex items-center justify-center"
                  style={{
                    height: 18,
                    padding: '0 8px',
                    borderRadius: 999,
                    background: tint.bg,
                    color: tint.fg,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.status}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-fg-1 truncate">
                      {r.full_name}
                    </p>
                    <p className="text-xs text-fg-3 truncate">{r.email}</p>
                    {r.primary_goal && (
                      <span
                        className="inline-flex items-center justify-center"
                        style={{
                          height: 18,
                          padding: '0 8px',
                          borderRadius: 999,
                          background: 'rgba(163,230,53,0.14)',
                          color: '#a3e635',
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {valueLabel(r.primary_goal)}
                      </span>
                    )}
                    {r.ebook_sent && (
                      <span
                        className="inline-flex items-center justify-center"
                        style={{
                          height: 18,
                          padding: '0 8px',
                          borderRadius: 999,
                          background: 'rgba(96,165,250,0.14)',
                          color: '#60a5fa',
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Ebook sent
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-3">
                    {r.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" strokeWidth={2} />
                        {r.phone}
                      </span>
                    )}
                    {r.country && (
                      <span className="inline-flex items-center gap-1">
                        <Globe className="w-3 h-3" strokeWidth={2} />
                        {r.country}
                      </span>
                    )}
                    <span>{fmtDate(r.created_at)}</span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-fg-3 transition-transform shrink-0 mt-1 ${open ? 'rotate-180' : ''}`}
                  strokeWidth={1.75}
                />
              </button>

              {open && (
                <div
                  className="border-t px-5 py-4 space-y-4"
                  style={{ borderColor: 'var(--gf-border)' }}
                >
                  {/* Quiz answers */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-fg-3 mb-2">
                      Assessment answers
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                      {Object.entries(r.quiz_answers ?? {}).map(([k, v]) => (
                        <li key={k} className="flex items-baseline gap-2">
                          <span className="text-fg-3 text-xs uppercase tracking-eyebrow shrink-0 min-w-[140px]">
                            {QUESTION_LABEL[k] ?? k}
                          </span>
                          <span className="text-fg-1">{valueLabel(String(v))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-fg-3 mb-1.5">
                      Internal notes
                    </p>
                    <textarea
                      value={editNotes[r.id] ?? r.notes ?? ''}
                      onChange={(e) =>
                        setEditNotes({ ...editNotes, [r.id]: e.target.value })
                      }
                      rows={3}
                      className="w-full rounded-lg p-3 text-sm leading-relaxed"
                      style={{
                        background: 'rgba(8, 20, 10, 0.45)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#f3f4f6',
                      }}
                      placeholder="Notes for your records…"
                    />
                    <button
                      type="button"
                      onClick={() => saveNotes(r.id)}
                      className="mt-2 text-xs rounded-full px-3 py-1.5"
                      style={{
                        background: 'rgba(163,230,53,0.12)',
                        color: '#a3e635',
                        border: '1px solid rgba(163,230,53,0.4)',
                      }}
                    >
                      Save notes
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent(
                        `Hi ${r.full_name.split(' ')[0]} — your free Greenofig consultation`,
                      )}`}
                      className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5"
                      style={{
                        background: 'rgba(163,230,53,0.12)',
                        color: '#a3e635',
                        border: '1px solid rgba(163,230,53,0.4)',
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                      Reply via email
                    </a>
                    {r.phone && (
                      <a
                        href={`tel:${r.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5"
                        style={{
                          background: 'rgba(96,165,250,0.10)',
                          color: '#60a5fa',
                          border: '1px solid rgba(96,165,250,0.35)',
                        }}
                      >
                        <Phone className="w-3.5 h-3.5" strokeWidth={2} />
                        Call
                      </a>
                    )}
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'contacted')}
                      Icon={UserCheck}
                      label="Mark contacted"
                      disabled={r.status === 'contacted'}
                    />
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'qualified')}
                      Icon={CheckCircle2}
                      label="Qualified"
                      disabled={r.status === 'qualified'}
                    />
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'converted')}
                      Icon={CheckCircle2}
                      label="Converted"
                      disabled={r.status === 'converted'}
                    />
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'closed')}
                      Icon={Archive}
                      label="Close"
                      disabled={r.status === 'closed'}
                    />
                    <ActionBtn
                      onClick={() => deleteRow(r.id)}
                      Icon={Trash2}
                      label="Delete"
                      danger
                    />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function KpiCard({
  label,
  value,
  tint,
}: {
  label: string
  value: number
  tint: string
}) {
  // Same shape as the /clients KPI cards — inset coloured stripe on
  // the leading edge, tier-coloured value, uppercase eyebrow label.
  return (
    <article
      className="rounded-xl border border-border bg-surface p-4"
      style={{ boxShadow: `inset 4px 0 0 ${tint}` }}
    >
      <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </p>
      <p
        className="mt-2 font-display text-2xl font-bold"
        style={{ color: tint }}
      >
        {value.toLocaleString()}
      </p>
    </article>
  )
}

function ActionBtn({
  onClick, Icon, label, disabled, danger,
}: {
  onClick: () => void
  Icon: typeof Mail
  label: string
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: danger ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.04)',
        color: danger ? '#f87171' : 'var(--gf-fg-2)',
        border: `1px solid ${danger ? 'rgba(248,113,113,0.35)' : 'var(--gf-border)'}`,
      }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {label}
    </button>
  )
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = (v ?? '').toString()
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
