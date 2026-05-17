import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Admin CRUD for `consultation_leads`. Mirrors the pattern of
 * /api/admin/contacts. Was direct browser supabase writes from
 * LeadsPanel.
 *
 * POST   /api/admin/leads  body { id, status }              → set lifecycle status
 * POST   /api/admin/leads  body { id, notes }               → save notes
 * DELETE /api/admin/leads  body { id }                      → delete
 */

const VALID_STATUSES = ['new', 'contacted', 'converted', 'archived'] as const
type Status = (typeof VALID_STATUSES)[number]

interface Body {
  id?: string
  status?: string
  notes?: string
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

const isStatus = (s: unknown): s is Status =>
  typeof s === 'string' && (VALID_STATUSES as readonly string[]).includes(s)

export const POST = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuid(body.id)) return badRequest('id is required.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Either path is allowed: status update or notes-only update. Status
  // takes precedence — if both are present in one call, we honor both.
  const patch: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return badRequest('status must be new, contacted, converted, or archived.')
    }
    patch.status = body.status
    if (body.status === 'contacted' || body.status === 'converted') {
      const { data: prev } = await service
        .from('consultation_leads')
        .select('contacted_at, converted_at')
        .eq('id', body.id)
        .maybeSingle()
      const prevRow = prev as
        | { contacted_at?: string | null; converted_at?: string | null }
        | null
      const now = new Date().toISOString()
      if (body.status === 'contacted' && !prevRow?.contacted_at) patch.contacted_at = now
      if (body.status === 'converted' && !prevRow?.converted_at) patch.converted_at = now
    }
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string') {
      return badRequest('notes must be a string.')
    }
    patch.notes = body.notes
  }
  if (Object.keys(patch).length === 0) {
    return badRequest('Nothing to update — pass status or notes.')
  }

  const { error } = await service
    .from('consultation_leads')
    .update(patch as never)
    .eq('id', body.id)

  if (error) return badRequest(error.message)

  await logAudit({
    action: 'consultation_leads.update',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'consultation_leads',
    resourceId: body.id,
    newValue: patch,
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
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
    .from('consultation_leads')
    .delete()
    .eq('id', body.id)
  if (error) return badRequest(error.message)

  await logAudit({
    action: 'consultation_leads.delete',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'consultation_leads',
    resourceId: body.id,
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
})
