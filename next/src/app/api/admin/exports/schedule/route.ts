import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Admin-only CRUD for scheduled_export_jobs.
 *
 *  GET    /api/admin/exports/schedule           → list active jobs
 *  POST   /api/admin/exports/schedule           → create
 *  DELETE /api/admin/exports/schedule?id=...    → soft-delete (sets is_active=false)
 *
 * The actual dispatch (running CSVs on schedule) is left to a future
 * pg_cron / worker. This route just persists the schedule so the UI
 * survives reload and another process can poll it.
 */

const KINDS     = ['subscriptions', 'orders', 'users', 'audit_log', 'bookings'] as const
const FORMATS   = ['csv', 'json'] as const
const FREQUENCIES = ['daily', 'weekly', 'monthly'] as const

export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')
  const { data } = await service
    .from('scheduled_export_jobs')
    .select('id, kind, format, frequency, email, is_active, last_run_at, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return json({ jobs: data ?? [] })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: { kind?: string; format?: string; frequency?: string; email?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const kind = (body.kind ?? '').trim()
  const format = (body.format ?? '').trim()
  const frequency = (body.frequency ?? '').trim()
  const email = (body.email ?? '').trim()

  if (!(KINDS as readonly string[]).includes(kind)) {
    return badRequest(`kind must be one of: ${KINDS.join(', ')}.`)
  }
  if (!(FORMATS as readonly string[]).includes(format)) {
    return badRequest(`format must be one of: ${FORMATS.join(', ')}.`)
  }
  if (!(FREQUENCIES as readonly string[]).includes(frequency)) {
    return badRequest(`frequency must be one of: ${FREQUENCIES.join(', ')}.`)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('email is required.')
  }

  const { data: inserted, error } = await service
    .from('scheduled_export_jobs')
    .insert({
      kind,
      format,
      frequency,
      email,
      is_active: true,
      created_by: ctx.userId,
    } as never)
    .select('id, kind, format, frequency, email, is_active, last_run_at, created_at')
    .single()
  if (error || !inserted) {
    console.error('[admin/exports/schedule] insert failed:', error)
    return internalError()
  }

  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'export_schedule_created',
    resource_type: 'scheduled_export_job',
    resource_id: (inserted as { id: string }).id,
    new_value: { kind, format, frequency, email },
  } as never)

  return json({ ok: true, job: inserted })
})

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^[0-9a-f-]{32,}$/i.test(id)) {
    return badRequest('id query param is required.')
  }
  const { error } = await service
    .from('scheduled_export_jobs')
    .update({ is_active: false } as never)
    .eq('id', id)
  if (error) {
    console.error('[admin/exports/schedule] delete failed:', error)
    return internalError()
  }
  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'export_schedule_removed',
    resource_type: 'scheduled_export_job',
    resource_id: id,
  } as never)
  return json({ ok: true })
})
