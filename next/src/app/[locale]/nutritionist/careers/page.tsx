'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  CalendarClock,
  Mail,
  ExternalLink,
  Linkedin,
  CheckCheck,
} from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'

interface Application {
  id: string
  job_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone: string | null
  cover_letter: string | null
  resume_url: string | null
  linkedin_url: string | null
  status: Status
  notes: string | null
  interview_at: string | null
  created_at: string
}

interface Job {
  id: string
  title: string
}

type Status = 'new' | 'reviewing' | 'interviewing' | 'offered' | 'hired' | 'rejected'

const STATUS_META: Record<Status, { tint: string; bg: string; label: string }> = {
  new:          { tint: '#06b6d4', bg: 'rgb(6 182 212 / 0.14)',  label: 'New' },
  reviewing:    { tint: '#e8912a', bg: 'rgb(232 145 42 / 0.14)', label: 'Reviewing' },
  interviewing: { tint: '#a855f7', bg: 'rgb(168 85 247 / 0.14)', label: 'Interviewing' },
  offered:      { tint: '#fbbf24', bg: 'rgb(251 191 36 / 0.14)', label: 'Offered' },
  hired:        { tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)', label: 'Hired' },
  rejected:     { tint: '#f43f5e', bg: 'rgb(244 63 94 / 0.14)',  label: 'Rejected' },
}

const STATUSES: Status[] = ['new', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected']

/**
 * /nutritionist/careers — head coach reviews and moves candidates
 * through the hiring pipeline. Gated by requireHeadCoach() layout.
 */
export default function HeadCoachCareersPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map())
  const [active, setActive] = useState<Application | null>(null)
  const [filter, setFilter] = useState<Status | 'all'>('all')

  useEffect(() => {
    void reload()
  }, [])

  async function reload() {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    const { data: appRows } = await supabase
      .from('job_applications')
      .select('*')
      .order('created_at', { ascending: false })
    const list = ((appRows as Application[] | null) ?? [])
    setApps(list)
    if (list.length > 0) {
      const ids = Array.from(new Set(list.map((a) => a.job_id)))
      const { data: jobRows } = await supabase
        .from('job_postings')
        .select('id, title')
        .in('id', ids)
      const map = new Map<string, Job>()
      for (const j of (jobRows as Job[] | null) ?? []) map.set(j.id, j)
      setJobs(map)
    }
  }

  const visible = useMemo(
    () => (filter === 'all' ? apps : apps.filter((a) => a.status === filter)),
    [apps, filter],
  )

  async function setStatus(app: Application, next: Status) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    await supabase
      .from('job_applications')
      .update({
        status: next,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq('id', app.id)
    setApps((curr) => curr.map((a) => (a.id === app.id ? { ...a, status: next } : a)))
    setActive((curr) => (curr?.id === app.id ? { ...curr, status: next } : curr))
  }

  async function setInterviewAt(app: Application, iso: string | null) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    await supabase
      .from('job_applications')
      .update({ interview_at: iso } as never)
      .eq('id', app.id)
    setApps((curr) => curr.map((a) => (a.id === app.id ? { ...a, interview_at: iso } : a)))
    setActive((curr) => (curr?.id === app.id ? { ...curr, interview_at: iso } : curr))
  }

  async function setNotes(app: Application, text: string) {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    await supabase
      .from('job_applications')
      .update({ notes: text } as never)
      .eq('id', app.id)
    setApps((curr) => curr.map((a) => (a.id === app.id ? { ...a, notes: text } : a)))
  }

  const counts: Record<string, number> = { all: apps.length }
  for (const s of STATUSES) counts[s] = apps.filter((a) => a.status === s).length

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          Hiring pipeline
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">
          Review applications, schedule interviews, and move candidates through the funnel.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <FilterPill label={`All · ${counts.all}`} active={filter === 'all'} onClick={() => setFilter('all')} tint="#9baf9f" />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            label={`${STATUS_META[s].label} · ${counts[s] ?? 0}`}
            active={filter === s}
            onClick={() => setFilter(s)}
            tint={STATUS_META[s].tint}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-8 py-16 text-center">
          <Briefcase className="w-10 h-10 mx-auto" strokeWidth={1.5} color="var(--gf-fg-3)" />
          <p className="mt-4 text-base font-semibold text-fg-1">No applications</p>
          <p className="mt-2 text-sm text-fg-2">
            {filter === 'all'
              ? 'When applicants submit through /careers, they show up here.'
              : `Nothing in the "${STATUS_META[filter as Status]?.label ?? filter}" stage right now.`}
          </p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {visible.map((a) => {
            const meta = STATUS_META[a.status]
            const ago = Math.max(0, Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86_400_000))
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setActive(a)}
                  className="w-full text-left px-5 py-4 hover:bg-surface-raised transition-colors flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-fg-1">{a.applicant_name}</p>
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
                          background: meta.bg,
                          color: meta.tint,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-fg-3">
                      {jobs.get(a.job_id)?.title ?? '(deleted job)'}
                      {' · '}
                      {ago === 0 ? 'today' : `${ago}d ago`}
                      {' · '}
                      {a.applicant_email}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {active && (
        <ApplicationDialog
          app={active}
          job={jobs.get(active.job_id)}
          onClose={() => setActive(null)}
          onStatus={(s) => setStatus(active, s)}
          onInterviewAt={(iso) => setInterviewAt(active, iso)}
          onNotes={(t) => setNotes(active, t)}
        />
      )}
    </div>
  )
}

function FilterPill({
  label,
  active,
  onClick,
  tint,
}: {
  label: string
  active: boolean
  onClick: () => void
  tint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center h-8 px-3 rounded-pill text-xs font-semibold uppercase tracking-eyebrow transition-colors"
      style={{
        background: active ? `${tint}24` : 'var(--gf-input-bg)',
        color: active ? tint : 'var(--gf-fg-3)',
        border: `1px solid ${active ? `${tint}66` : 'var(--gf-border)'}`,
      }}
    >
      {label}
    </button>
  )
}

function ApplicationDialog({
  app,
  job,
  onClose,
  onStatus,
  onInterviewAt,
  onNotes,
}: {
  app: Application
  job?: Job
  onClose: () => void
  onStatus: (s: Status) => void
  onInterviewAt: (iso: string | null) => void
  onNotes: (text: string) => void
}) {
  const [notesDraft, setNotesDraft] = useState(app.notes ?? '')

  // For datetime-local input — convert ISO to local format.
  const interviewLocal = app.interview_at
    ? new Date(app.interview_at).toISOString().slice(0, 16)
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center overflow-y-auto py-8">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bg-deeper/80 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-2xl mx-4 rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
              {job?.title ?? 'Application'}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-fg-1">{app.applicant_name}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-2">
              <a href={`mailto:${app.applicant_email}`} className="inline-flex items-center gap-1 hover:text-lime-400">
                <Mail className="w-3 h-3" strokeWidth={1.75} />
                {app.applicant_email}
              </a>
              {app.applicant_phone && (
                <span dir="ltr">{app.applicant_phone}</span>
              )}
              {app.linkedin_url && (
                <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-lime-400">
                  <Linkedin className="w-3 h-3" strokeWidth={1.75} />
                  LinkedIn
                </a>
              )}
              {app.resume_url && (
                <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-lime-400">
                  <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                  Resume
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-3 hover:text-fg-1 text-xl leading-none px-2"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {app.cover_letter && (
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
              Cover note
            </p>
            <p className="text-sm text-fg-1 whitespace-pre-wrap leading-relaxed">
              {app.cover_letter}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">Stage</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => {
              const meta = STATUS_META[s]
              const on = app.status === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatus(s)}
                  className="inline-flex items-center h-8 px-3 rounded-pill text-xs font-semibold uppercase tracking-eyebrow"
                  style={{
                    background: on ? `${meta.tint}24` : 'var(--gf-input-bg)',
                    color: on ? meta.tint : 'var(--gf-fg-3)',
                    border: `1px solid ${on ? `${meta.tint}66` : 'var(--gf-border)'}`,
                  }}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block">
            <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2 inline-flex items-center gap-1.5">
              <CalendarClock className="w-3 h-3" strokeWidth={1.75} />
              Interview at
            </span>
            <input
              type="datetime-local"
              value={interviewLocal}
              onChange={(e) =>
                onInterviewAt(e.target.value ? new Date(e.target.value).toISOString() : null)
              }
              className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none"
              style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
            />
          </label>
        </div>

        <div>
          <label className="block">
            <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2 inline-block">
              Notes (private)
            </span>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                if (notesDraft !== (app.notes ?? '')) onNotes(notesDraft)
              }}
              rows={4}
              placeholder="Thoughts after reading the application…"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
              style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
            />
          </label>
          <p className="mt-1 text-xs text-fg-3 inline-flex items-center gap-1">
            <CheckCheck className="w-3 h-3" strokeWidth={2} />
            Notes save on blur.
          </p>
        </div>
      </div>
    </div>
  )
}
