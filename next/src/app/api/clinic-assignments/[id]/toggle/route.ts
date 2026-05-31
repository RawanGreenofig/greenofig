import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/clinic-assignments/[id]/toggle
 *
 * The linked client marks an assigned meal plan / recipe done (or undoes
 * it). Verifies the assignment belongs to a clinic_clients record owned
 * by the caller (via user_id). Notifies the coach when completed — the
 * adherence signal the analysis uses.
 */
export const POST = withAuth<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data } = await service
      .from('clinic_assignments')
      .select('id, clinic_client_id, coach_id, status, title')
      .eq('id', params.id)
      .maybeSingle()
    const a = data as
      | { id: string; clinic_client_id: string; coach_id: string; status: string; title: string }
      | null
    if (!a) return notFound('Assignment not found.')

    const { data: cc } = await service
      .from('clinic_clients')
      .select('id, full_name, user_id')
      .eq('id', a.clinic_client_id)
      .maybeSingle()
    const client = cc as { id: string; full_name: string; user_id: string | null } | null
    if (!client || client.user_id !== ctx.userId) return forbidden('This is not your plan item.')

    const next = a.status === 'done' ? 'assigned' : 'done'
    const { error } = await service
      .from('clinic_assignments')
      .update({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null } as never)
      .eq('id', a.id)
    if (error) return badRequest(error.message)

    // Tell the coach when the client completes something.
    if (next === 'done') {
      const secret = process.env.OPENCLAW_WEBHOOK_SECRET
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
      if (secret) {
        try {
          await fetch(`${appUrl}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-secret': secret },
            body: JSON.stringify({
              userIds: [a.coach_id],
              title: 'Client followed your plan ✅',
              titleAr: 'العميل اتبع خطتك ✅',
              body: `${client.full_name} completed: ${a.title}`,
              bodyAr: `${client.full_name} أكمل: ${a.title}`,
              type: 'system',
              url: `/nutritionist/clinic-clients/${client.id}`,
            }),
          })
        } catch {
          /* best effort */
        }
      }
    }

    return json({ ok: true, status: next })
  },
)
