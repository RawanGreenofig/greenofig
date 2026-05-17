import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Admin CRUD for `job_postings`. Was direct browser supabase
 * inserts/updates/deletes from /admin/careers.
 *
 * POST   /api/admin/careers  body { id?, ...fields }    → upsert (insert if no id, update otherwise)
 * POST   /api/admin/careers  body { id, toggle: true }  → flip is_published + stamp published_at
 * DELETE /api/admin/careers  body { id }                → permanent delete
 */

const VALID_JOB_TYPES = ['full_time', 'part_time', 'contract', 'internship'] as const
type JobType = (typeof VALID_JOB_TYPES)[number]

interface Body {
  id?: string
  title?: string
  department?: string | null
  location?: string | null
  job_type?: string
  summary?: string
  description?: string
  requirements?: unknown
  responsibilities?: unknown
  benefits?: unknown
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  is_published?: boolean
  toggle?: boolean
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

const isJobType = (s: unknown): s is JobType =>
  typeof s === 'string' && (VALID_JOB_TYPES as readonly string[]).includes(s)

export const POST = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Toggle-publish shortcut: read current state, flip it, stamp.
  if (body.toggle === true) {
    if (!isUuid(body.id)) return badRequest('id is required for toggle.')
    const { data: prev } = await service
      .from('job_postings')
      .select('is_published')
      .eq('id', body.id)
      .maybeSingle()
    const prevRow = prev as { is_published?: boolean } | null
    const next = !(prevRow?.is_published ?? false)
    const { error } = await service
      .from('job_postings')
      .update({
        is_published: next,
        published_at: next ? new Date().toISOString() : null,
      } as never)
      .eq('id', body.id)
    if (error) return badRequest(error.message)

    await logAudit({
      action: 'job_postings.toggle_publish',
      actorId: ctx.userId,
      actorRole: 'admin',
      resourceType: 'job_postings',
      resourceId: body.id,
      newValue: { is_published: next },
      ip: ipFromRequest(req),
    })
    return json({ ok: true, is_published: next })
  }

  // Upsert path. Validate required fields the page always sends.
  if (!body.title || typeof body.title !== 'string') return badRequest('title is required.')
  if (!isJobType(body.job_type)) return badRequest('job_type is required.')
  if (typeof body.summary !== 'string') return badRequest('summary is required.')
  if (typeof body.description !== 'string') return badRequest('description is required.')

  const row = {
    title: body.title.trim(),
    department: body.department?.trim?.() || null,
    location: body.location?.trim?.() || null,
    job_type: body.job_type,
    summary: body.summary.trim(),
    description: body.description.trim(),
    requirements: body.requirements ?? [],
    responsibilities: body.responsibilities ?? [],
    benefits: body.benefits ?? [],
    salary_min: body.salary_min ?? null,
    salary_max: body.salary_max ?? null,
    salary_currency: body.salary_currency ?? 'USD',
    is_published: body.is_published === true,
    published_at: body.is_published === true ? new Date().toISOString() : null,
  }

  if (body.id) {
    if (!isUuid(body.id)) return badRequest('id must be a uuid.')
    const { error } = await service
      .from('job_postings')
      .update(row as never)
      .eq('id', body.id)
    if (error) return badRequest(error.message)
    await logAudit({
      action: 'job_postings.update',
      actorId: ctx.userId,
      actorRole: 'admin',
      resourceType: 'job_postings',
      resourceId: body.id,
      newValue: row,
      ip: ipFromRequest(req),
    })
    return json({ ok: true, id: body.id })
  } else {
    const { data, error } = await service
      .from('job_postings')
      .insert(row as never)
      .select('id')
      .single()
    if (error) return badRequest(error.message)
    const inserted = (data as { id?: string } | null) ?? null
    await logAudit({
      action: 'job_postings.create',
      actorId: ctx.userId,
      actorRole: 'admin',
      resourceType: 'job_postings',
      resourceId: inserted?.id,
      newValue: row,
      ip: ipFromRequest(req),
    })
    return json({ ok: true, id: inserted?.id })
  }
})

export const DELETE = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuid(body.id)) return badRequest('id is required.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { error } = await service
    .from('job_postings')
    .delete()
    .eq('id', body.id)
  if (error) return badRequest(error.message)

  await logAudit({
    action: 'job_postings.delete',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'job_postings',
    resourceId: body.id,
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
})
