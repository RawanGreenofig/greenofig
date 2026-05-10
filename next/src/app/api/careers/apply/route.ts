import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/careers/apply
 *
 * Public endpoint. Inserts a job_applications row from an anonymous
 * applicant. RLS does allow anon inserts via 'anon can submit
 * applications', but we route through service-role here so we can:
 *   1. capture ip_country + user_agent server-side
 *   2. drop a notification to the head coach when a new applicant
 *      arrives
 *   3. validate the job exists + is still published before accepting
 *
 * Body: {
 *   jobId, applicantName, applicantEmail,
 *   applicantPhone?, coverLetter, resumeUrl?, linkedinUrl?
 * }
 */
export async function POST(req: NextRequest) {
  const service = getServiceSupabase()
  if (!service) {
    return NextResponse.json({ error: 'Supabase unavailable' }, { status: 503 })
  }

  let body: {
    jobId?: string
    applicantName?: string
    applicantEmail?: string
    applicantPhone?: string | null
    coverLetter?: string
    resumeUrl?: string | null
    linkedinUrl?: string | null
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const jobId = (body.jobId ?? '').trim()
  const name = (body.applicantName ?? '').trim()
  const email = (body.applicantEmail ?? '').trim()
  const cover = (body.coverLetter ?? '').trim()
  if (!/^[0-9a-f-]{32,}$/i.test(jobId)) {
    return NextResponse.json({ error: 'jobId is required.' }, { status: 400 })
  }
  if (!name || name.length > 120) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  if (cover.length < 20) {
    return NextResponse.json(
      { error: 'Please write at least a short note about your fit.' },
      { status: 400 },
    )
  }
  if (cover.length > 4000) {
    return NextResponse.json(
      { error: 'Cover note is too long (max 4000 chars).' },
      { status: 400 },
    )
  }

  // Confirm the job is still open before accepting the application.
  const { data: jobRow } = await service
    .from('job_postings')
    .select('id, title, is_published')
    .eq('id', jobId)
    .maybeSingle()
  const job = jobRow as
    | { id: string; title: string; is_published: boolean }
    | null
  if (!job || !job.is_published) {
    return NextResponse.json(
      { error: 'This job is no longer accepting applications.' },
      { status: 404 },
    )
  }

  const country = req.headers.get('x-vercel-ip-country') ?? null
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 240)

  const { error } = await service.from('job_applications').insert({
    job_id: jobId,
    applicant_name: name,
    applicant_email: email,
    applicant_phone: body.applicantPhone?.trim() || null,
    cover_letter: cover,
    resume_url: body.resumeUrl?.trim() || null,
    linkedin_url: body.linkedinUrl?.trim() || null,
    ip_country: country,
    user_agent: ua || null,
  } as never)
  if (error) {
    console.error('[careers/apply] insert failed:', error)
    return NextResponse.json({ error: 'Could not submit application.' }, { status: 500 })
  }

  // Notify the head coach so they see the new applicant.
  const { data: head } = await service
    .from('profiles')
    .select('id')
    .eq('is_head_coach', true)
    .limit(1)
    .maybeSingle()
  const headId = (head as { id?: string } | null)?.id
  if (headId) {
    await service.from('notifications').insert({
      user_id: headId,
      type: 'system',
      title: 'New job application',
      body: `${name} applied for ${job.title}.`,
      data: { job_id: jobId, applicant_email: email },
      is_read: false,
    } as never)
  }

  return NextResponse.json({ ok: true })
}
