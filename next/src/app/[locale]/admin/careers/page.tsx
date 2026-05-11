'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Briefcase,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  Users as UsersIcon,
  X,
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { getBrowserSupabase } from '@/lib/supabase/client'

interface Job {
  id: string
  title: string
  department: string | null
  location: string | null
  job_type: string
  summary: string
  description: string
  requirements: string[]
  responsibilities: string[]
  benefits: string[]
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  applications_count?: number
}

type Draft = Omit<Job, 'id' | 'created_at' | 'published_at' | 'applications_count'> & {
  id?: string
}

const EMPTY_DRAFT: Draft = {
  title: '',
  department: '',
  location: '',
  job_type: 'full_time',
  summary: '',
  description: '',
  requirements: [],
  responsibilities: [],
  benefits: [],
  salary_min: null,
  salary_max: null,
  salary_currency: 'USD',
  is_published: false,
}

const JOB_TYPES = [
  { v: 'full_time', l: 'Full-time' },
  { v: 'part_time', l: 'Part-time' },
  { v: 'contract', l: 'Contract' },
  { v: 'remote', l: 'Remote' },
]

/**
 * /admin/careers — admin creates and manages job postings. Submitted
 * applications are reviewed by the head coach at /nutritionist/careers
 * (admin can also see them but only Nutrition Coach Rawan can change status).
 */
export default function AdminCareersPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [editing, setEditing] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void reload()
  }, [])

  async function reload() {
    setLoading(true)
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setJobs([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('job_postings')
      .select('*')
      .order('created_at', { ascending: false })
    const list = ((data as Job[] | null) ?? [])
    // Attach application counts
    if (list.length > 0) {
      const ids = list.map((j) => j.id)
      const { data: apps } = await supabase
        .from('job_applications')
        .select('job_id')
        .in('job_id', ids)
      const counts: Record<string, number> = {}
      for (const a of (apps as { job_id: string }[] | null) ?? []) {
        counts[a.job_id] = (counts[a.job_id] ?? 0) + 1
      }
      for (const j of list) j.applications_count = counts[j.id] ?? 0
    }
    setJobs(list)
    setLoading(false)
  }

  async function save(draft: Draft): Promise<{ error?: string }> {
    const supabase = getBrowserSupabase()
    if (!supabase) return { error: 'Database unavailable.' }
    const row = {
      title: draft.title.trim(),
      department: draft.department?.trim() || null,
      location: draft.location?.trim() || null,
      job_type: draft.job_type,
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      requirements: draft.requirements,
      responsibilities: draft.responsibilities,
      benefits: draft.benefits,
      salary_min: draft.salary_min,
      salary_max: draft.salary_max,
      salary_currency: draft.salary_currency ?? 'USD',
      is_published: draft.is_published,
      published_at: draft.is_published ? new Date().toISOString() : null,
    }
    const res = draft.id
      ? await supabase.from('job_postings').update(row as never).eq('id', draft.id)
      : await supabase.from('job_postings').insert(row as never)
    if (res.error) return { error: res.error.message }
    setEditing(null)
    void reload()
    return {}
  }

  async function togglePublish(job: Job) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    const next = !job.is_published
    await supabase
      .from('job_postings')
      .update({
        is_published: next,
        published_at: next ? new Date().toISOString() : null,
      } as never)
      .eq('id', job.id)
    void reload()
  }

  async function remove(jobId: string) {
    if (!confirm('Delete this job posting and all its applications? This cannot be undone.')) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    await supabase.from('job_postings').delete().eq('id', jobId)
    void reload()
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            Careers
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">
            Post job openings. Nutrition Coach Rawan reviews applications in her
            careers tab.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_DRAFT })}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          New posting
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-fg-3 py-8 text-center">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-8 py-16 text-center">
          <Briefcase className="w-10 h-10 mx-auto" strokeWidth={1.5} color="var(--gf-fg-3)" />
          <p className="mt-4 text-base font-semibold text-fg-1">No job postings yet</p>
          <p className="mt-2 text-sm text-fg-2">
            Create one to start receiving applications.
          </p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {jobs.map((job) => (
            <li key={job.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-fg-1">{job.title}</p>
                  <StatusPill published={job.is_published} />
                  {(job.applications_count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-fg-3">
                      <UsersIcon className="w-3 h-3" strokeWidth={1.75} />
                      {job.applications_count} app{job.applications_count === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-fg-3 line-clamp-1">
                  {[job.department, job.location, JOB_TYPES.find((t) => t.v === job.job_type)?.l]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => togglePublish(job)}
                  aria-label={job.is_published ? 'Unpublish' : 'Publish'}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
                >
                  {job.is_published ? <EyeOff className="w-4 h-4" strokeWidth={1.75} /> : <Eye className="w-4 h-4" strokeWidth={1.75} />}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ ...job, id: job.id })}
                  aria-label="Edit"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
                >
                  <Edit3 className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(job.id)}
                  aria-label="Delete"
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md text-rose-400 hover:bg-rose-400/10"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-fg-2">
        <p>
          Applications submitted to these postings are reviewed by the
          head coach at <Link className="text-lime-400 hover:underline" href="/nutritionist/careers">/nutritionist/careers</Link>.
          Admin can read applications but only Nutrition Coach Rawan moves
          candidates through the interview pipeline.
        </p>
      </div>

      {editing && (
        <EditDialog
          draft={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        height: 18,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1,
        background: published ? 'rgba(163,230,53,0.16)' : 'rgba(155,175,159,0.14)',
        color: published ? '#a3e635' : '#9baf9f',
      }}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  )
}

function EditDialog({
  draft,
  onCancel,
  onSave,
}: {
  draft: Draft
  onCancel: () => void
  onSave: (d: Draft) => Promise<{ error?: string }>
}) {
  const [d, setD] = useState<Draft>(draft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const update = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((c) => ({ ...c, [k]: v }))
  const updateList = (key: 'requirements' | 'responsibilities' | 'benefits', text: string) => {
    update(
      key,
      text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }
  const titleOk = d.title.trim().length > 0
  const summaryOk = d.summary.trim().length > 0
  const descOk = d.description.trim().length > 0
  const valid = titleOk && summaryOk && descOk

  // ESC to close + body scroll lock while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [busy, onCancel])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    const res = await onSave(d)
    setBusy(false)
    if (res.error) setError(res.error)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-dialog-title"
      className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        tabIndex={-1}
        className="absolute inset-0"
        style={{
          background: 'rgba(5, 14, 9, 0.78)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />
      <form
        onSubmit={submit}
        className="relative z-10 w-full md:max-w-3xl md:mx-4 md:my-8 flex flex-col bg-surface border border-border md:rounded-2xl overflow-hidden"
        style={{
          maxHeight: '100dvh',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 28px 80px rgba(0,0,0,0.55)',
        }}
      >
        {/* Sticky header */}
        <header
          className="flex items-center justify-between gap-3 px-5 md:px-7 py-4 border-b border-border bg-surface"
          style={{ background: 'linear-gradient(180deg, var(--gf-surface) 0%, var(--gf-bg-deeper) 100%)' }}
        >
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-eyebrow font-semibold text-lime-400">
              Careers
            </p>
            <h3
              id="job-dialog-title"
              className="mt-0.5 font-display font-bold text-fg-1 tracking-tight truncate"
              style={{ fontSize: '20px', lineHeight: 1.15 }}
            >
              {d.id ? 'Edit job posting' : 'New job posting'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-fg-2 hover:text-fg-1 hover:border-lime-400/40 hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 md:px-7 py-6 space-y-7" style={{ background: 'var(--gf-bg)' }}>
          <Section title="The basics" hint="The first things a candidate sees.">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <div className="sm:col-span-4">
                <FormField label="Title" required ok={titleOk}>
                  <Input value={d.title} onChange={(v) => update('title', v)} placeholder="Senior Nutrition Coach" />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField label="Job type">
                  <Select
                    value={d.job_type}
                    onChange={(v) => update('job_type', v)}
                    options={JOB_TYPES.map((t) => ({ v: t.v, l: t.l }))}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-3">
                <FormField label="Department">
                  <Input value={d.department ?? ''} onChange={(v) => update('department', v)} placeholder="e.g. Coaching, Operations" />
                </FormField>
              </div>
              <div className="sm:col-span-3">
                <FormField label="Location">
                  <Input value={d.location ?? ''} onChange={(v) => update('location', v)} placeholder="Amman / Remote" />
                </FormField>
              </div>
            </div>
          </Section>

          <Section title="Compensation" hint="Optional — shown as a range on the listing.">
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Min (yearly)">
                <Input
                  value={d.salary_min?.toString() ?? ''}
                  onChange={(v) => update('salary_min', v ? Number(v) : null)}
                  type="number"
                  placeholder="40000"
                />
              </FormField>
              <FormField label="Max (yearly)">
                <Input
                  value={d.salary_max?.toString() ?? ''}
                  onChange={(v) => update('salary_max', v ? Number(v) : null)}
                  type="number"
                  placeholder="60000"
                />
              </FormField>
              <FormField label="Currency">
                <Input
                  value={d.salary_currency ?? 'USD'}
                  onChange={(v) => update('salary_currency', v)}
                  placeholder="USD"
                />
              </FormField>
            </div>
          </Section>

          <Section title="The pitch" hint="What candidates read on the listing page.">
            <FormField label="Summary" required ok={summaryOk} hint="1–2 sentences. Shown on the careers index card.">
              <Textarea
                value={d.summary}
                onChange={(v) => update('summary', v)}
                rows={2}
                placeholder="Help build the best client-coaching experience in the region."
              />
            </FormField>
            <FormField label="Description" required ok={descOk} hint="The full job story — mission, team, what success looks like.">
              <Textarea
                value={d.description}
                onChange={(v) => update('description', v)}
                rows={6}
                placeholder="Tell candidates what they'd actually do, who they'd work with, and what their first 90 days look like."
              />
            </FormField>
          </Section>

          <Section title="The specifics" hint="One item per line — these render as bullet lists.">
            <FormField label="Responsibilities">
              <Textarea
                value={d.responsibilities.join('\n')}
                onChange={(v) => updateList('responsibilities', v)}
                rows={4}
                placeholder={'Run intake interviews\nBuild personalized meal plans\nMessage clients weekly'}
                mono
              />
            </FormField>
            <FormField label="Requirements">
              <Textarea
                value={d.requirements.join('\n')}
                onChange={(v) => updateList('requirements', v)}
                rows={4}
                placeholder={'BSc in Nutrition or related\n2+ years client-facing\nFluent English and Arabic'}
                mono
              />
            </FormField>
            <FormField label="Benefits">
              <Textarea
                value={d.benefits.join('\n')}
                onChange={(v) => updateList('benefits', v)}
                rows={3}
                placeholder={'Flexible remote work\nMentorship from Nutrition Coach Rawan\nGreenofig wellness stipend'}
                mono
              />
            </FormField>
          </Section>

          <Section title="Visibility">
            <PublishToggle
              published={d.is_published}
              onChange={(b) => update('is_published', b)}
            />
          </Section>
        </div>

        {/* Sticky footer */}
        <footer
          className="flex flex-wrap items-center justify-between gap-3 px-5 md:px-7 py-4 border-t border-border bg-surface"
          style={{ background: 'linear-gradient(0deg, var(--gf-surface) 0%, var(--gf-bg-deeper) 100%)' }}
        >
          <div className="min-w-0 text-xs text-fg-3">
            {error ? (
              <span className="inline-flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
                {error}
              </span>
            ) : !valid ? (
              <span>Fill in the required fields to continue.</span>
            ) : d.is_published ? (
              <span className="text-lime-400">Will go live on /careers right after save.</span>
            ) : (
              <span>Will be saved as a draft.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="inline-flex items-center h-10 px-4 text-sm font-medium text-fg-1 rounded-pill border border-border hover:border-fg-3 transition-colors disabled:opacity-50"
              style={{ background: 'var(--gf-input-bg)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || busy}
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm border border-lime-600/60 disabled:opacity-50 transition-all hover:brightness-110"
              style={{ boxShadow: '0 6px 20px rgba(132,217,61,0.25)' }}
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} />
              ) : (
                <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
              )}
              {busy ? 'Saving…' : d.id ? 'Save changes' : 'Create posting'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <header>
        <h4 className="text-sm font-semibold text-fg-1">{title}</h4>
        {hint && <p className="mt-0.5 text-xs text-fg-3">{hint}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function PublishToggle({
  published,
  onChange,
}: {
  published: boolean
  onChange: (b: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!published)}
      className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors"
      style={{
        background: published ? 'rgba(132,217,61,0.08)' : 'var(--gf-input-bg)',
        border: `1px solid ${published ? 'rgba(132,217,61,0.4)' : 'var(--gf-border)'}`,
      }}
    >
      <div>
        <p className="text-sm font-semibold text-fg-1">
          {published ? 'Published' : 'Draft'}
        </p>
        <p className="mt-0.5 text-xs text-fg-3">
          {published
            ? 'Visible on /careers — candidates can apply.'
            : 'Only you can see this. Toggle to publish.'}
        </p>
      </div>
      <span
        aria-hidden
        className="inline-flex items-center w-10 h-6 rounded-full transition-colors relative shrink-0"
        style={{ background: published ? 'var(--gf-lime-400)' : 'var(--gf-border-strong, rgba(255,255,255,0.18))' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
          style={{ insetInlineStart: published ? '18px' : '2px' }}
        />
      </span>
    </button>
  )
}

function FormField({
  label,
  required,
  ok,
  hint,
  children,
}: {
  label: string
  required?: boolean
  ok?: boolean
  hint?: string
  children: React.ReactNode
}) {
  const showError = required && ok === false
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-fg-2 mb-1.5">
        {label}
        {required && (
          <span className="text-[10px] font-bold tracking-eyebrow uppercase text-lime-400">
            Required
          </span>
        )}
      </span>
      {children}
      {hint && !showError && <span className="block mt-1.5 text-[11px] text-fg-3">{hint}</span>}
      {showError && (
        <span className="block mt-1.5 text-[11px] text-rose-400">
          This field is required.
        </span>
      )}
    </label>
  )
}

const FIELD_BASE = 'w-full rounded-lg text-sm text-fg-1 placeholder-fg-3 transition-colors focus:outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/15'

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${FIELD_BASE} h-10 px-3`}
      style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
    />
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
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
      className={`${FIELD_BASE} px-3 py-2.5 leading-relaxed ${mono ? 'font-mono text-[12.5px]' : ''}`}
      style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { v: string; l: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD_BASE} h-10 px-3 appearance-none`}
      style={{
        background:
          'var(--gf-input-bg) url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239baf9f\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'/></svg>") no-repeat right 10px center',
        border: '1px solid var(--gf-border)',
        paddingInlineEnd: 32,
      }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  )
}
