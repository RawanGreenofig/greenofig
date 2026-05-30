'use client'

import { Link } from '@/i18n/navigation'
import { JobPostingsManager } from '@/components/careers/JobPostingsManager'

/**
 * /nutritionist/careers/postings — the head coach (Nutrition Coach Rawan)
 * creates, edits, publishes, and deletes job openings. Same manager UI as
 * /admin/careers; writes go through /api/admin/careers (head-coach-allowed).
 * Gated head-coach-only by the parent careers layout (requireHeadCoach).
 */
export default function HeadCoachPostingsPage() {
  return (
    <JobPostingsManager
      title="Job postings"
      subtitle="Create and publish openings. Applications land in your hiring pipeline."
      footnote={
        <p>
          Review and move applicants in your{' '}
          <Link className="text-lime-400 hover:underline" href="/nutritionist/careers">
            hiring pipeline
          </Link>
          . Published postings appear on the public{' '}
          <Link className="text-lime-400 hover:underline" href="/careers">
            /careers
          </Link>{' '}
          page.
        </p>
      }
    />
  )
}
