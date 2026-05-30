'use client'

import { Link } from '@/i18n/navigation'
import { JobPostingsManager } from '@/components/careers/JobPostingsManager'

/**
 * /admin/careers — admin creates and manages job postings. Submitted
 * applications are reviewed by the head coach at /nutritionist/careers.
 * The posting UI is shared with the head coach's /nutritionist/careers/postings.
 */
export default function AdminCareersPage() {
  return (
    <JobPostingsManager
      title="Careers"
      subtitle="Post job openings. Nutrition Coach Rawan reviews applications in her careers tab."
      footnote={
        <p>
          Applications submitted to these postings are reviewed by the head coach at{' '}
          <Link className="text-lime-400 hover:underline" href="/nutritionist/careers">
            /nutritionist/careers
          </Link>
          . Admin can read applications but only Nutrition Coach Rawan moves candidates
          through the interview pipeline.
        </p>
      }
    />
  )
}
