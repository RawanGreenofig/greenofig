import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-clients/[id]/log
 *
 * The per-client Plan & Progress journal — what the coach GAVE (meal
 * plans), the CHANGES she observed (progress), and free notes, plus
 * client-submitted updates from the shareable update link.
 *
 * GET  → entries, newest first.
 * POST → add one { kind: 'meal_plan'|'progress'|'note', body }.
 */

const KINDS = ['meal_plan', 'progress', 'note']

interface CreateBody {
  kind?: string
  body?: string
}

export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    let q = service
      .from('clinic_client_log')
      .select('id, clinic_client_id, coach_id, kind, body, created_at')
      .eq('clinic_client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(300)
    if (ctx.profile.role !== 'admin') q = q.eq('coach_id', ctx.userId)
    const { data } = await q
    return json({ entries: data ?? [] })
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
    const text = (body.body ?? '').trim()
    if (!text) return badRequest('Entry text is required.')
    const kind = body.kind && KINDS.includes(body.kind) ? body.kind : 'note'

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data: client } = await service
      .from('clinic_clients')
      .select('id, coach_id')
      .eq('id', params.id)
      .maybeSingle()
    const c = client as { id: string; coach_id: string } | null
    if (!c) return badRequest('Client not found.')
    if (ctx.profile.role !== 'admin' && c.coach_id !== ctx.userId) return forbidden()

    const { data, error } = await service
      .from('clinic_client_log')
      .insert({
        clinic_client_id: c.id,
        coach_id: c.coach_id,
        kind,
        body: text.slice(0, 5000),
      } as never)
      .select('id')
      .maybeSingle()
    if (error) return badRequest(error.message)
    return json({ id: (data as { id?: string } | null)?.id })
  },
)
