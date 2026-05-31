import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/nutritionist/clinic-overview
 *
 * The coach's at-a-glance clinic cockpit: money owed / collected this
 * month, today's in-clinic visits, and an "attention" list (overdue
 * payment, no recent check-in, low plan adherence). All raw queries, no AI.
 * Scoped to the caller's clinic clients (admins see all).
 */
const STALE_DAYS = 14

export const GET = withNutritionistOrAdmin(
  async (_req: NextRequest, ctx: AuthedContext) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const isAdmin = ctx.profile.role === 'admin'
    let cq = service.from('clinic_clients').select('id, full_name').limit(1000)
    if (!isAdmin) cq = cq.eq('coach_id', ctx.userId)
    const { data: clientRows } = await cq
    const clients = (clientRows as { id: string; full_name: string }[] | null) ?? []
    const nameById = new Map(clients.map((c) => [c.id, c.full_name]))
    const ids = clients.map((c) => c.id)
    if (ids.length === 0) {
      return json({ totals: { owedCents: 0, collectedThisMonthCents: 0, currency: 'USD', dueCount: 0, overdueCount: 0 }, todayVisits: [], attention: [] })
    }

    const now = new Date()
    const todayUTC = now.toISOString().slice(0, 10)
    const dayStart = new Date(todayUTC + 'T00:00:00.000Z').toISOString()
    const dayEnd = new Date(todayUTC + 'T23:59:59.999Z').toISOString()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const staleCutoff = new Date(now.getTime() - STALE_DAYS * 86400_000).toISOString()

    const [pays, visits, recent, asg] = await Promise.all([
      service.from('clinic_payments').select('clinic_client_id, amount_cents, currency, status, due_date, paid_at').in('clinic_client_id', ids).limit(2000),
      service.from('bookings').select('id, clinic_client_id, scheduled_at, type, status').in('clinic_client_id', ids).gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd).order('scheduled_at', { ascending: true }),
      service.from('clinic_assessments').select('clinic_client_id').in('clinic_client_id', ids).gte('created_at', staleCutoff).limit(5000),
      service.from('clinic_assignments').select('clinic_client_id, status').in('clinic_client_id', ids).limit(5000),
    ])

    const payments = (pays.data as { clinic_client_id: string; amount_cents: number; currency: string; status: string; due_date: string | null; paid_at: string | null }[] | null) ?? []
    let owedCents = 0, collectedThisMonthCents = 0, dueCount = 0, overdueCount = 0
    const currency = payments[0]?.currency ?? 'USD'
    const overdueClients = new Set<string>()
    for (const p of payments) {
      if (p.status === 'due') {
        owedCents += p.amount_cents ?? 0
        dueCount += 1
        if (p.due_date && p.due_date < todayUTC) { overdueCount += 1; overdueClients.add(p.clinic_client_id) }
      } else if (p.status === 'paid' && p.paid_at && p.paid_at >= monthStart) {
        collectedThisMonthCents += p.amount_cents ?? 0
      }
    }

    const recentSet = new Set(((recent.data as { clinic_client_id: string }[] | null) ?? []).map((r) => r.clinic_client_id))

    const asgByClient = new Map<string, { done: number; total: number }>()
    for (const a of (asg.data as { clinic_client_id: string; status: string }[] | null) ?? []) {
      const e = asgByClient.get(a.clinic_client_id) ?? { done: 0, total: 0 }
      e.total += 1
      if (a.status === 'done') e.done += 1
      asgByClient.set(a.clinic_client_id, e)
    }

    // Attention list — only clients the coach is actively working with
    // (has assignments or payments) so brand-new rows don't spam it.
    const active = new Set<string>([...Array.from(asgByClient.keys()), ...payments.map((p) => p.clinic_client_id)])
    const attention: { clinic_client_id: string; full_name: string; flags: string[] }[] = []
    for (const id of ids) {
      if (!active.has(id)) continue
      const flags: string[] = []
      if (overdueClients.has(id)) flags.push('overdue')
      if (!recentSet.has(id)) flags.push('stale')
      const a = asgByClient.get(id)
      if (a && a.total >= 3 && a.done / a.total < 0.5) flags.push('low_adherence')
      if (flags.length) attention.push({ clinic_client_id: id, full_name: nameById.get(id) ?? 'Client', flags })
    }
    // overdue first, then most flags
    attention.sort((x, y) => Number(y.flags.includes('overdue')) - Number(x.flags.includes('overdue')) || y.flags.length - x.flags.length)

    const todayVisits = ((visits.data as { id: string; clinic_client_id: string; scheduled_at: string; type: string | null; status: string }[] | null) ?? [])
      .map((v) => ({ ...v, full_name: nameById.get(v.clinic_client_id) ?? 'Client' }))

    return json({
      totals: { owedCents, collectedThisMonthCents, currency, dueCount, overdueCount },
      todayVisits,
      attention: attention.slice(0, 25),
    })
  },
)
