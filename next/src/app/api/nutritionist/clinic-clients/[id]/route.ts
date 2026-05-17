import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-clients/[id]
 *
 * GET    → full record + this client's visit history.
 * PATCH  → update editable fields. Coach can only touch their own
 *          clients; admin can touch any.
 * DELETE → remove the client AND cascade their bookings (the FK has
 *          ON DELETE CASCADE on clinic_client_id). Use carefully.
 */

interface PatchBody {
  full_name?: string
  phone?: string | null
  email?: string | null
  date_of_birth?: string | null
  gender?: string | null
  notes?: string | null
  is_active?: boolean
}

async function loadOwned(
  service: ReturnType<typeof getServiceSupabase>,
  ctx: AuthedContext,
  id: string,
) {
  if (!service) return { error: 'service' as const, row: null }
  const { data } = await service
    .from('clinic_clients')
    .select(
      'id, coach_id, full_name, phone, email, date_of_birth, gender, notes, is_active, created_at, updated_at',
    )
    .eq('id', id)
    .maybeSingle()
  type Row = {
    id: string
    coach_id: string
    full_name: string
    phone: string | null
    email: string | null
    date_of_birth: string | null
    gender: string | null
    notes: string | null
    is_active: boolean
    created_at: string
    updated_at: string
  }
  const row = data as Row | null
  if (!row) return { error: 'notfound' as const, row: null }
  if (row.coach_id !== ctx.userId && ctx.profile.role !== 'admin') {
    return { error: 'forbidden' as const, row: null }
  }
  return { error: null, row }
}

export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const r = await loadOwned(service, ctx, params.id)
    if (r.error === 'notfound') return notFound('Clinic client not found.')
    if (r.error === 'forbidden') return notFound('Clinic client not found.')
    if (!r.row) return serviceUnavailable('Supabase')

    // Pull this client's visits in the same call so the detail page
    // doesn't need a second roundtrip.
    const { data: visits } = await service
      .from('bookings')
      .select(
        'id, scheduled_at, duration_min, status, type, notes, nutritionist_notes, payment_method, is_paid, amount_paid_cents',
      )
      .eq('clinic_client_id', params.id)
      .order('scheduled_at', { ascending: false })
      .limit(200)

    return json({ client: r.row, visits: visits ?? [] })
  },
)

export const PATCH = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: PatchBody
    try {
      body = (await req.json()) as PatchBody
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const r = await loadOwned(service, ctx, params.id)
    if (r.error === 'notfound') return notFound('Clinic client not found.')
    if (r.error === 'forbidden') return notFound('Clinic client not found.')

    const patch: Record<string, unknown> = {}
    if (body.full_name !== undefined) {
      const v = body.full_name.trim()
      if (!v) return badRequest('full_name cannot be empty.')
      patch.full_name = v
    }
    if (body.phone !== undefined) patch.phone = body.phone?.trim() || null
    if (body.email !== undefined) patch.email = body.email?.trim() || null
    if (body.date_of_birth !== undefined)
      patch.date_of_birth = body.date_of_birth || null
    if (body.gender !== undefined) patch.gender = body.gender?.trim() || null
    if (body.notes !== undefined) patch.notes = body.notes?.trim() || null
    if (body.is_active !== undefined) patch.is_active = !!body.is_active

    if (Object.keys(patch).length === 0) return json({ ok: true })

    const { error } = await service
      .from('clinic_clients')
      .update(patch as never)
      .eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)

export const DELETE = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const r = await loadOwned(service, ctx, params.id)
    if (r.error === 'notfound') return notFound('Clinic client not found.')
    if (r.error === 'forbidden') return notFound('Clinic client not found.')

    const { error } = await service
      .from('clinic_clients')
      .delete()
      .eq('id', params.id)
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)
