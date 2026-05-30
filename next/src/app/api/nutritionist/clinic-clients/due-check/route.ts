import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/nutritionist/clinic-clients/due-check
 *
 * Scans the calling coach's clinic payment ledger for rows that are
 * DUE, have a due_date on/before today, and haven't been announced yet
 * (due_notified_at is null). For each it inserts one `billing`
 * notification (so it appears in the coach's bell) and stamps
 * due_notified_at so they're never pinged twice for the same charge.
 *
 * Called when the coach opens the clinic area — there's no cron in this
 * project, so this is the "surface overdue payments in notifications"
 * trigger. Cheap (one indexed query), safe to call on every load.
 */

interface DueRow {
  id: string
  clinic_client_id: string
  amount_cents: number
  currency: string
  due_date: string | null
}

function formatAmount(cents: number, currency: string): string {
  const major = (cents / 100).toFixed(2)
  return `${major} ${currency}`
}

export const POST = withNutritionistOrAdmin(
  async (_req: NextRequest, ctx: AuthedContext) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const today = new Date().toISOString().slice(0, 10)

    const { data } = await service
      .from('clinic_payments')
      .select('id, clinic_client_id, amount_cents, currency, due_date')
      .eq('coach_id', ctx.userId)
      .eq('status', 'due')
      .is('due_notified_at', null)
      .not('due_date', 'is', null)
      .lte('due_date', today)
      .limit(100)

    const due = (data as DueRow[] | null) ?? []
    if (due.length === 0) return json({ notified: 0 })

    // Resolve client names for friendly notification copy.
    const clientIds = Array.from(new Set(due.map((d) => d.clinic_client_id)))
    const { data: clientRows } = await service
      .from('clinic_clients')
      .select('id, full_name')
      .in('id', clientIds)
    const nameById = new Map<string, string>()
    for (const r of (clientRows as { id: string; full_name: string }[] | null) ?? []) {
      nameById.set(r.id, r.full_name)
    }

    const notifications = due.map((d) => {
      const name = nameById.get(d.clinic_client_id) ?? 'A clinic client'
      const amount = formatAmount(d.amount_cents, d.currency)
      const overdue = d.due_date != null && d.due_date < today
      return {
        user_id: ctx.userId,
        title: overdue ? 'Payment overdue' : 'Payment due',
        title_ar: overdue ? 'دفعة متأخرة' : 'دفعة مستحقة',
        body: `${name} — ${amount}${d.due_date ? ` due ${d.due_date}` : ''}.`,
        body_ar: `${name} — ${amount}${d.due_date ? ` — تاريخ الاستحقاق ${d.due_date}` : ''}.`,
        type: 'billing',
        data: { url: `/nutritionist/clinic-clients/${d.clinic_client_id}` },
        is_read: false,
      }
    })

    const { error } = await service.from('notifications').insert(notifications as never)
    if (error) return json({ notified: 0, error: error.message })

    // Mark these rows announced so we don't notify again.
    await service
      .from('clinic_payments')
      .update({ due_notified_at: new Date().toISOString() } as never)
      .in(
        'id',
        due.map((d) => d.id),
      )

    return json({ notified: notifications.length })
  },
)
