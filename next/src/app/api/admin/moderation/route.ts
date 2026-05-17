import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/admin/moderation/resolve
 *
 * Body: { id: uuid, resolution: 'removed' | 'kept' | 'warned' }
 *
 * Marks a moderation_flag as resolved. Was a fire-and-forget
 * supabase.from(...).update(...) from the browser — silently dropped
 * when RLS denied the write, no audit trail.
 */

const VALID_RESOLUTIONS = ['removed', 'kept', 'warned'] as const
type Resolution = (typeof VALID_RESOLUTIONS)[number]

interface Body {
  id?: string
  resolution?: string
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

const isResolution = (s: unknown): s is Resolution =>
  typeof s === 'string' && (VALID_RESOLUTIONS as readonly string[]).includes(s)

export const POST = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuid(body.id)) return badRequest('id is required.')
  if (!isResolution(body.resolution)) {
    return badRequest('resolution must be one of: removed, kept, warned.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const resolvedAt = new Date().toISOString()
  const { error } = await service
    .from('moderation_flags')
    .update({
      resolution: body.resolution,
      resolved_at: resolvedAt,
    } as never)
    .eq('id', body.id)

  if (error) return badRequest(error.message)

  await logAudit({
    action: 'moderation.resolve',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'moderation_flags',
    resourceId: body.id,
    newValue: { resolution: body.resolution, resolved_at: resolvedAt },
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
})
