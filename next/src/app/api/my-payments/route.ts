import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/my-payments
 *
 * The signed-in (linked walk-in) client's clinic payment ledger — what
 * they've paid and what's still due, from the `clinic_payments` rows the
 * coach records. Due rows can be paid via the existing public pay link
 * (/clinic-pay/<payment.id>). Resolves their clinic_clients id(s) via
 * user_id.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: ccs } = await service
    .from('clinic_clients')
    .select('id')
    .eq('user_id', ctx.userId)
  const ids = ((ccs as { id: string }[] | null) ?? []).map((r) => r.id)
  if (ids.length === 0) return json({ payments: [] })

  const { data } = await service
    .from('clinic_payments')
    .select('id, amount_cents, currency, status, due_date, paid_at, method, notes, created_at')
    .in('clinic_client_id', ids)
    .order('created_at', { ascending: false })
    .limit(100)
  return json({ payments: data ?? [] })
})
