'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { MapPin, Clock, ArrowRight, Briefcase } from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { SiteHeader } from '@/components/SiteHeader'

interface Job {
  id: string
  title: string
  department: string | null
  location: string | null
  job_type: string
  summary: string
  published_at: string | null
}

const JOB_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  remote: 'Remote',
}

/**
 * /careers — public job board. Lists every job_postings row where
 * is_published=true. Click a row → /careers/[id] with the apply form.
 *
 * Greenofig is hiring nutritionists, content creators, and ops folk
 * as the team scales beyond Coach Rawan; this page is the front door.
 */
export default function CareersPage() {
  // Start as empty rather than null — when there are no postings we
  // want to show the "no openings" message immediately rather than
  // a loading flash.
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('job_postings')
        .select('id, title, department, location, job_type, summary, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
      if (!cancelled) setJobs((data as Job[] | null) ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen" style={{ background: '#080808' }}>
      <SiteHeader />
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <header className="text-center mb-12 md:mb-16">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400 mb-4">
            CAREERS
          </p>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            Build the future of
            <br />
            personalized nutrition.
          </h1>
          <p className="mt-6 text-base md:text-lg text-fg-2 max-w-2xl mx-auto leading-relaxed">
            Greenofig is growing. Join Coach Rawan and the coaching team
            to help thousands of clients build sustainable, evidence-led
            relationships with food.
          </p>
        </header>

        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-8 py-16 text-center">
            <Briefcase
              className="w-10 h-10 mx-auto"
              strokeWidth={1.5}
              color="var(--gf-fg-3)"
            />
            <p className="mt-4 text-base font-semibold text-fg-1">
              No job postings available at the moment
            </p>
            <p className="mt-2 text-sm text-fg-2 max-w-sm mx-auto">
              We&apos;re always happy to hear from talented people — send a
              note to careers@greenofig.com.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/careers/${job.id}`}
                  className="group block rounded-xl border border-border bg-surface p-5 md:p-6 transition-all hover:-translate-y-px hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-fg-1 group-hover:text-lime-400 transition-colors">
                        {job.title}
                      </h2>
                      <p className="mt-1 text-sm text-fg-2 line-clamp-2">
                        {job.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-3">
                        {job.department && (
                          <span className="inline-flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3" strokeWidth={2} />
                            {job.department}
                          </span>
                        )}
                        {job.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" strokeWidth={2} />
                            {job.location}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" strokeWidth={2} />
                          {JOB_TYPE_LABEL[job.job_type] ?? job.job_type}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      className="w-4 h-4 text-fg-3 group-hover:text-lime-400 group-hover:translate-x-1 transition-all rtl:rotate-180 mt-1"
                      strokeWidth={1.75}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
