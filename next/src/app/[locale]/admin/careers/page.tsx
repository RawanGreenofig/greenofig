'use client'

import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Plus, Edit3, Eye, EyeOff, Trash2, Check, X, Users as UsersIcon } from '@/icons'
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
 * (admin can also see them but only Coach Rawan can change status).
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

  async function save(draft: Draft) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    const row = {
      title: draft.title,
      department: draft.department || null,
      location: draft.location || null,
      job_type: draft.job_type,
      summary: draft.summary,
      description: draft.description,
      requirements: draft.requirements,
      responsibilities: draft.responsibilities,
      benefits: draft.benefits,
      salary_min: draft.salary_min,
      salary_max: draft.salary_max,
      salary_currency: draft.salary_currency ?? 'USD',
      is_published: draft.is_published,
      published_at: draft.is_published ? new Date().toISOString() : null,
    }
    if (draft.id) {
      await supabase.from('job_postings').update(row as never).eq('id', draft.id)
    } else {
      await supabase.from('job_postings').insert(row as never)
    }
    setEditing(null)
    void reload()
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
            Post job openings. Coach Rawan reviews applications in her
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
          Admin can read applications but only Coach Rawan moves
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
  onSave: (d: Draft) => void
}) {
  const [d, setD] = useState<Draft>(draft)
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
  const valid = useMemo(
    () => d.title.trim().length > 0 && d.summary.trim().length > 0 && d.description.trim().length > 0,
    [d],
  )
  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto py-8">
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-bg-deeper/80 backdrop-blur-sm"
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSave(d)
        }}
        className="relative w-full md:max-w-2xl mx-4 rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-5"
      >
        <header className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg-1">
            {d.id ? 'Edit job posting' : 'New job posting'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Title *">
            <Input value={d.title} onChange={(v) => update('title', v)} />
          </FormField>
          <FormField label="Department">
            <Input value={d.department ?? ''} onChange={(v) => update('department', v)} placeholder="e.g. Coaching, Operations" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Location">
            <Input value={d.location ?? ''} onChange={(v) => update('location', v)} placeholder="Amman / Remote" />
          </FormField>
          <FormField label="Job type">
            <select
              value={d.job_type}
              onChange={(e) => update('job_type', e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none"
              style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
            >
              {JOB_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </FormField>
          <FormField label="Currency">
            <Input value={d.salary_currency ?? 'USD'} onChange={(v) => update('salary_currency', v)} placeholder="USD" />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Salary min (yearly)">
            <Input
              value={d.salary_min?.toString() ?? ''}
              onChange={(v) => update('salary_min', v ? Number(v) : null)}
              type="number"
              placeholder="40000"
            />
          </FormField>
          <FormField label="Salary max (yearly)">
            <Input
              value={d.salary_max?.toString() ?? ''}
              onChange={(v) => update('salary_max', v ? Number(v) : null)}
              type="number"
              placeholder="60000"
            />
          </FormField>
        </div>

        <FormField label="Summary * (1-2 sentences, shown on cards)">
          <textarea
            value={d.summary}
            onChange={(e) => update('summary', e.target.value)}
            rows={2}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 focus:outline-none"
            style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
          />
        </FormField>

        <FormField label="Description * (the long version)">
          <textarea
            value={d.description}
            onChange={(e) => update('description', e.target.value)}
            rows={6}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 focus:outline-none"
            style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
          />
        </FormField>

        <FormField label="Responsibilities (one per line)">
          <textarea
            value={d.responsibilities.join('\n')}
            onChange={(e) => updateList('responsibilities', e.target.value)}
            rows={4}
            placeholder={'Run intake interviews\nBuild personalized meal plans\nMessage clients weekly'}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
            style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
          />
        </FormField>

        <FormField label="Requirements (one per line)">
          <textarea
            value={d.requirements.join('\n')}
            onChange={(e) => updateList('requirements', e.target.value)}
            rows={4}
            placeholder={'BSc in Nutrition or related\n2+ years client-facing\nFluent English and Arabic'}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
            style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
          />
        </FormField>

        <FormField label="Benefits (one per line)">
          <textarea
            value={d.benefits.join('\n')}
            onChange={(e) => updateList('benefits', e.target.value)}
            rows={3}
            placeholder={'Flexible remote work\nMentorship from Coach Rawan\nGreenofig wellness stipend'}
            className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
            style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
          />
        </FormField>

        <label className="inline-flex items-center gap-2 text-sm text-fg-1">
          <input
            type="checkbox"
            checked={d.is_published}
            onChange={(e) => update('is_published', e.target.checked)}
            className="w-4 h-4"
          />
          Publish immediately (visible on /careers)
        </label>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center h-10 px-4 text-sm font-medium text-fg-1"
            style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)', borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
            {d.id ? 'Save changes' : 'Create posting'}
          </button>
        </div>
      </form>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-fg-2 mb-1.5">{label}</span>
      {children}
    </label>
  )
}

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
      className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
      style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
    />
  )
}
