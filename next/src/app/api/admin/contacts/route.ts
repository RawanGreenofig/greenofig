import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Admin CRUD for `contact_messages`. Previously the /admin/contacts
 * page hit Supabase directly from the browser — fine for the happy
 * path on an established session, but failures were logged to console
 * with zero user-visible feedback. Now centralised, audited, and
 * service-role-driven.
 *
 * POST   /api/admin/contacts  body { id, status }       → set status (+ derived timestamps)
 * DELETE /api/admin/contacts  body { id }               → permanently delete
 */

const VALID_STATUSES = ['new', 'read', 'replied', 'archived'] as const
type Status = (typeof VALID_STATUSES)[number]

interface Body {
  id?: string
  status?: string
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
  if (!isStatus(body.status)) {
    return badRequest('status must be new, read, replied, or archived.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Stamp read_at on first transition to 'read' and replied_at on
  // transition to 'replied'. Idempotent: re-setting an already-stamped
  // status is a no-op for the timestamp.
  const patch: Record<string, unknown> = { status: body.status }
  if (body.status === 'read' || body.status === 'replied') {
    const { data: prev } = await service
      .from('contact_messages')
      .select('read_at, replied_at')
      .eq('id', body.id)
      .maybeSingle()
    const prevRow = prev as { read_at?: string | null; replied_at?: string | null } | null
    const now = new Date().toISOString()
    if (body.status === 'read' && !prevRow?.read_at) patch.read_at = now
    if (body.status === 'replied' && !prevRow?.replied_at) patch.replied_at = now
  }

  const { error } = await service
    .from('contact_messages')
    .update(patch as never)
    .eq('id', body.id)

  if (error) return badRequest(error.message)

  await logAudit({
    action: 'contact_messages.status',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'contact_messages',
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
    .from('contact_messages')
    .delete()
    .eq('id', body.id)

  if (error) return badRequest(error.message)

  await logAudit({
    action: 'contact_messages.delete',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'contact_messages',
    resourceId: body.id,
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
})
