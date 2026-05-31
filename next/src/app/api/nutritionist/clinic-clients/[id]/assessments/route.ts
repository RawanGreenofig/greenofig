import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-clients/[id]/assessments
 *
 * Structured progress check-ins (body metrics + 1-5 ratings + wins /
 * challenges). GET lists them newest-first; POST records one from the
 * coach. Client-submitted check-ins (source 'client') come in via the
 * public update link. The analysis route reads these to summarize what's
 * improving and what needs work.
 */

const SELECT =
  'id, clinic_client_id, source, weight_kg, waist_cm, hip_cm, arm_cm, thigh_cm, energy, sleep, adherence, appetite, wins, challenges, notes, created_at'

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const rating = (v: unknown): number | null => {
  const n = num(v)
  if (n == null) return null
  return n >= 1 && n <= 5 ? Math.round(n) : null
}
const txt = (v: unknown, max = 2000): string | null => {
  if (v == null) return null
  const t = String(v).trim()
  return t ? t.slice(0, max) : null
}

interface Body {
  weight_kg?: unknown
  waist_cm?: unknown
  hip_cm?: unknown
  arm_cm?: unknown
  thigh_cm?: unknown
  energy?: unknown
  sleep?: unknown
  adherence?: unknown
  appetite?: unknown
  wins?: unknown
  challenges?: unknown
  notes?: unknown
}

export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    let q = service
      .from('clinic_assessments')
      .select(SELECT)
      .eq('clinic_client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (ctx.profile.role !== 'admin') q = q.eq('coach_id', ctx.userId)
    const { data } = await q
    return json({ assessments: data ?? [] })
  },
)

export const POST = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }

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

    const row = {
      clinic_client_id: c.id,
      coach_id: c.coach_id,
      source: 'coach',
      weight_kg: num(body.weight_kg),
      waist_cm: num(body.waist_cm),
      hip_cm: num(body.hip_cm),
      arm_cm: num(body.arm_cm),
      thigh_cm: num(body.thigh_cm),
      energy: rating(body.energy),
      sleep: rating(body.sleep),
      adherence: rating(body.adherence),
      appetite: rating(body.appetite),
      wins: txt(body.wins),
      challenges: txt(body.challenges),
      notes: txt(body.notes),
    }
    // Require at least one filled field.
    const hasData = Object.entries(row).some(
      ([k, v]) => !['clinic_client_id', 'coach_id', 'source'].includes(k) && v != null,
    )
    if (!hasData) return badRequest('Fill in at least one field.')

    const { data, error } = await service
      .from('clinic_assessments')
      .insert(row as never)
      .select('id')
      .maybeSingle()
    if (error) return badRequest(error.message)
    return json({ id: (data as { id?: string } | null)?.id })
  },
)
