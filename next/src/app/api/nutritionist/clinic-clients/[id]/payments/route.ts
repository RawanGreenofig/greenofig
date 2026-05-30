import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-clients/[id]/payments
 *
 * GET  → this client's payment ledger, newest first.
 * POST → record a payment / charge for the client. Required:
 *        amount_cents. Optional: currency, due_date, method, status
 *        ('due'|'paid'), notes. A 'paid' row stamps paid_at now.
 *
 * Nutritionist or admin. A coach can only touch their own clients;
 * the payment inherits the client's coach_id.
 */

const METHODS = ['cash', 'card', 'transfer', 'online', 'other']

interface CreateBody {
  amount_cents?: number
  currency?: string
  due_date?: string | null
  method?: string | null
  status?: 'due' | 'paid'
  notes?: string | null
}

const SELECT =
  'id, clinic_client_id, coach_id, amount_cents, currency, status, due_date, paid_at, method, notes, created_at, updated_at'

export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    let q = service
      .from('clinic_payments')
      .select(SELECT)
      .eq('clinic_client_id', params.id)
      .order('created_at', { ascending: false })
    if (ctx.profile.role !== 'admin') q = q.eq('coach_id', ctx.userId)
    const { data } = await q
    return json({ payments: data ?? [] })
  },
)

export const POST = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: CreateBody
    try {
      body = (await req.json()) as CreateBody
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const amount = Number(body.amount_cents)
    if (!Number.isFinite(amount) || amount < 0) {
      return badRequest('amount_cents must be a non-negative number.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Ownership: the payment's coach_id mirrors the client's.
    const { data: client } = await service
      .from('clinic_clients')
      .select('id, coach_id')
      .eq('id', params.id)
      .maybeSingle()
    const c = client as { id: string; coach_id: string } | null
    if (!c) return badRequest('Client not found.')
    if (ctx.profile.role !== 'admin' && c.coach_id !== ctx.userId) return forbidden()

    const status = body.status === 'paid' ? 'paid' : 'due'
    const method = body.method && METHODS.includes(body.method) ? body.method : null

    const { data, error } = await service
      .from('clinic_payments')
      .insert({
        clinic_client_id: c.id,
        coach_id: c.coach_id,
        amount_cents: Math.round(amount),
        currency: (body.currency || 'USD').trim().slice(0, 8) || 'USD',
        status,
        due_date: body.due_date || null,
        method,
        notes: body.notes?.trim() || null,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      } as never)
      .select('id')
      .maybeSingle()

    if (error) return badRequest(error.message)
    return json({ id: (data as { id?: string } | null)?.id })
  },
)
