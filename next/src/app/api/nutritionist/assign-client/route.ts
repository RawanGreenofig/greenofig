import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/nutritionist/assign-client
 *
 * Head-coach-only. Assigns a customer profile to a specific employee
 * coach by writing profiles.assigned_coach_id. Pass coachId=null to
 * unassign (returns the client to the head-coach default routing).
 *
 * Body: { clientId: string, coachId: string | null }
 *
 * Side effects:
 *   - Audit log entry (action='client_assigned' or 'client_unassigned')
 *   - On reassign, any open conversation between the client and the
 *     PREVIOUS coach stays open (history is preserved); next message
 *     thread the customer starts will route to the new coach via
 *     /api/messages/start.
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'nutritionist') {
    return forbidden('Nutritionist only.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  // Confirm caller is the head coach.
  const { data: meRow } = await service
    .from('profiles')
    .select('is_head_coach')
    .eq('id', ctx.userId)
    .maybeSingle()
  if (!(meRow as { is_head_coach?: boolean } | null)?.is_head_coach) {
    return forbidden('Only the head coach can assign clients.')
  }

  let body: { clientId?: string; coachId?: string | null }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const clientId = (body.clientId ?? '').trim()
  const coachId = body.coachId === null ? null : (body.coachId ?? '').trim()
  if (!/^[0-9a-f-]{32,}$/i.test(clientId)) {
    return badRequest('clientId is required.')
  }
  if (coachId !== null && !/^[0-9a-f-]{32,}$/i.test(coachId)) {
    return badRequest('coachId must be null or a uuid.')
  }

  // Verify the client profile exists and is a customer (role=user).
  const { data: clientRow } = await service
    .from('profiles')
    .select('id, role, assigned_coach_id, full_name')
    .eq('id', clientId)
    .maybeSingle()
  const client = clientRow as {
    id: string
    role: string
    assigned_coach_id: string | null
    full_name: string | null
  } | null
  if (!client) return notFound('Client not found.')
  if (client.role !== 'user') {
    return badRequest('Can only assign customers (role=user).')
  }

  // If reassigning to a coach, verify that coach is a nutritionist.
  if (coachId) {
    const { data: coachRow } = await service
      .from('profiles')
      .select('role')
      .eq('id', coachId)
      .maybeSingle()
    if ((coachRow as { role?: string } | null)?.role !== 'nutritionist') {
      return badRequest('coachId must reference a nutritionist profile.')
    }
  }

  const { error } = await service
    .from('profiles')
    .update({ assigned_coach_id: coachId } as never)
    .eq('id', clientId)
  if (error) {
    console.error('[assign-client] update failed:', error)
    return internalError()
  }

  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'nutritionist',
    action: coachId ? 'client_assigned' : 'client_unassigned',
    resource_type: 'user',
    resource_id: clientId,
    old_value: { assigned_coach_id: client.assigned_coach_id },
    new_value: { assigned_coach_id: coachId },
  } as never)

  // Notify the assigned coach so they know they have a new client.
  if (coachId) {
    await service.from('notifications').insert({
      user_id: coachId,
      type: 'system',
      title: 'New client assigned',
      body: `You're now coaching ${client.full_name ?? 'a new client'}.`,
      data: { client_id: clientId },
      is_read: false,
    } as never)
  }

  return json({ ok: true, clientId, coachId })
})
