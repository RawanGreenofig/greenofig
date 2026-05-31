import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/my-overview
 *
 * One aggregate fetch for the linked walk-in client's home screen:
 * next appointment, plan progress, amount due, and the coach-shared
 * analysis ("From your coach"). Resolves clinic_clients via user_id.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: ccs } = await service
    .from('clinic_clients')
    .select('id')
    .eq('user_id', ctx.userId)
  const ids = ((ccs as { id: string }[] | null) ?? []).map((r) => r.id)
  if (ids.length === 0) return json({ isClinicClient: false })

  const nowIso = new Date().toISOString()
  const [asg, nextAppt, payments, analysis] = await Promise.all([
    service.from('clinic_assignments').select('status').in('clinic_client_id', ids),
    service
      .from('bookings')
      .select('scheduled_at, type, status')
      .in('clinic_client_id', ids)
      .gte('scheduled_at', nowIso)
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true })
      .limit(1),
    service.from('clinic_payments').select('amount_cents, currency, status').in('clinic_client_id', ids),
    service
      .from('clinic_analysis')
      .select('summary, recommendations, shared_with_client, updated_at')
      .in('clinic_client_id', ids)
      .eq('shared_with_client', true)
      .order('updated_at', { ascending: false })
      .limit(1),
  ])

  const assignments = (asg.data as { status: string }[] | null) ?? []
  const planDone = assignments.filter((a) => a.status === 'done').length

  const pays = (payments.data as { amount_cents: number; currency: string; status: string }[] | null) ?? []
  const dueRows = pays.filter((p) => p.status === 'due')
  const amountDueCents = dueRows.reduce((s, p) => s + (p.amount_cents ?? 0), 0)

  const appt = ((nextAppt.data as { scheduled_at: string; type: string | null }[] | null) ?? [])[0] ?? null
  const card = ((analysis.data as { summary: string | null; recommendations: string | null }[] | null) ?? [])[0] ?? null

  return json({
    isClinicClient: true,
    plan: { done: planDone, total: assignments.length },
    nextAppointment: appt,
    amountDue: { cents: amountDueCents, currency: dueRows[0]?.currency ?? 'USD' },
    coachCard: card && (card.summary || card.recommendations) ? card : null,
  })
})
