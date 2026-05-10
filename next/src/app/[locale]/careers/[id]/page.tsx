'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Briefcase,
  CheckCircle2,
  Check,
} from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { SiteHeader } from '@/components/SiteHeader'

interface JobDetail {
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
}

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  remote: 'Remote',
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>()
  const [job, setJob] = useState<JobDetail | null | 'not-found'>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase || !params.id) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('job_postings')
        .select('*')
        .eq('id', params.id)
        .eq('is_published', true)
        .maybeSingle()
      if (cancelled) return
      setJob((data as JobDetail | null) ?? 'not-found')
    })()
    return () => {
      cancelled = true
    }
  }, [params.id])

  return (
    <main className="min-h-screen" style={{ background: '#080808' }}>
      <SiteHeader />
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-3 hover:text-fg-1 mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={1.75} />
          All open positions
        </Link>

        {job === null ? (
          <p className="text-center text-sm text-fg-3 py-12">Loading…</p>
        ) : job === 'not-found' ? (
          <div className="rounded-2xl border border-border bg-surface px-8 py-16 text-center">
            <p className="text-base font-semibold text-fg-1">
              This job listing isn&apos;t available
            </p>
            <p className="mt-2 text-sm text-fg-2">
              It may have been filled or removed.
            </p>
            <Link
              href="/careers"
              className="inline-flex mt-6 items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm"
            >
              See open roles
            </Link>
          </div>
        ) : (
          <>
            <header className="mb-10">
              <h1
                className="font-display font-bold text-fg-1 tracking-tight"
                style={{
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                {job.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-2">
                {job.department && (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {job.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {JOB_TYPE_LABEL[job.job_type] ?? job.job_type}
                </span>
                {(job.salary_min || job.salary_max) && (
                  <span className="text-fg-1 font-medium">
                    {fmtSalary(job.salary_min, job.salary_max, job.salary_currency)}
                  </span>
                )}
              </div>
            </header>

            <section className="prose-section space-y-8 text-fg-2">
              <p className="text-base md:text-lg leading-relaxed text-fg-2">
                {job.summary}
              </p>

              {job.description && (
                <div>
                  <h2 className="text-lg font-semibold text-fg-1 mb-3">About the role</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg-2">
                    {job.description}
                  </p>
                </div>
              )}

              {job.responsibilities.length > 0 && (
                <Bullets title="What you'll do" items={job.responsibilities} />
              )}
              {job.requirements.length > 0 && (
                <Bullets title="What we're looking for" items={job.requirements} />
              )}
              {job.benefits.length > 0 && (
                <Bullets title="What you'll get" items={job.benefits} />
              )}
            </section>

            <ApplyForm jobId={job.id} jobTitle={job.title} />
          </>
        )}
      </div>
    </main>
  )
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-fg-1 mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-fg-2">
            <CheckCircle2
              className="w-4 h-4 mt-0.5 shrink-0"
              strokeWidth={2}
              color="#a3e635"
            />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function fmtSalary(min: number | null, max: number | null, ccy: string | null) {
  const cur = ccy ?? 'USD'
  if (min && max) return `${min.toLocaleString()}–${max.toLocaleString()} ${cur}`
  if (min) return `From ${min.toLocaleString()} ${cur}`
  if (max) return `Up to ${max.toLocaleString()} ${cur}`
  return ''
}

function ApplyForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cover, setCover] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [resume, setResume] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim() || !email.trim() || !cover.trim()) {
      setError('Please fill in name, email, and a short cover note.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          applicantName: name.trim(),
          applicantEmail: email.trim(),
          applicantPhone: phone.trim() || null,
          coverLetter: cover.trim(),
          resumeUrl: resume.trim() || null,
          linkedinUrl: linkedin.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Submit failed (${res.status}).`)
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mt-12 rounded-2xl border bg-surface p-8 text-center" style={{ borderColor: 'rgba(132,217,61,0.4)', background: 'rgba(132,217,61,0.04)' }}>
        <CheckCircle2 className="w-10 h-10 mx-auto" strokeWidth={1.75} color="#a3e635" />
        <h3 className="mt-4 text-base font-semibold text-fg-1">
          Application received
        </h3>
        <p className="mt-2 text-sm text-fg-2 max-w-md mx-auto">
          Thanks for applying to <strong>{jobTitle}</strong>. Coach Rawan
          personally reviews every application — you&apos;ll hear from her by
          email within a week.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="mt-12 rounded-2xl border border-border bg-surface p-6 md:p-8 space-y-5"
    >
      <header>
        <h3 className="text-lg font-semibold text-fg-1">Apply for this role</h3>
        <p className="mt-1 text-xs text-fg-3">
          Coach Rawan personally reads and reviews every application.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full name *">
          <Input value={name} onChange={setName} placeholder="Your name" required />
        </Field>
        <Field label="Email *">
          <Input value={email} onChange={setEmail} type="email" placeholder="you@example.com" required />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Phone (optional)">
          <Input value={phone} onChange={setPhone} placeholder="+962 79 555 1234" ltr />
        </Field>
        <Field label="LinkedIn (optional)">
          <Input value={linkedin} onChange={setLinkedin} placeholder="linkedin.com/in/…" ltr />
        </Field>
      </div>

      <Field label="Resume URL (optional)">
        <Input
          value={resume}
          onChange={setResume}
          placeholder="https://… (Google Drive, Dropbox, etc.)"
          ltr
        />
      </Field>

      <Field label="Why you're a great fit *">
        <textarea
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Tell us about yourself, your experience, and why this role calls to you."
          className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
          style={{
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            resize: 'vertical',
          }}
          required
        />
      </Field>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <div className="pt-2 flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit application'}
          {!submitting && <Check className="w-4 h-4" strokeWidth={2.25} />}
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-fg-2 font-medium mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  ltr,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  ltr?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      dir={ltr ? 'ltr' : undefined}
      className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
      style={{
        background: 'var(--gf-input-bg)',
        border: '1px solid var(--gf-border)',
      }}
    />
  )
}
