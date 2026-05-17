import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/dashboard/progress
 *
 * Body: { weight_kg, body_fat_percent?, recorded_at? }
 *
 * Inserts one row into `progress_entries`. Was a fire-and-forget
 * supabase insert from /dashboard/progress (LogWeightModal) that
 * showed "Weight logged ✓" regardless of whether the insert
 * actually succeeded. After refresh the entry was gone with no
 * signal.
 */

interface Body {
  weight_kg?: number
  body_fat_percent?: number | null
  recorded_at?: string
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (typeof body.weight_kg !== 'number' || !Number.isFinite(body.weight_kg)) {
    return badRequest('weight_kg must be a number.')
  }
  if (body.weight_kg < 20 || body.weight_kg > 400) {
    return badRequest('weight_kg out of plausible range.')
  }
  if (
    body.body_fat_percent !== null &&
    body.body_fat_percent !== undefined &&
    (typeof body.body_fat_percent !== 'number' ||
      body.body_fat_percent < 0 ||
      body.body_fat_percent > 100)
  ) {
    return badRequest('body_fat_percent must be 0-100.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data, error } = await service
    .from('progress_entries')
    .insert({
      user_id: ctx.userId,
      weight_kg: body.weight_kg,
      body_fat_percent: body.body_fat_percent ?? null,
      recorded_at: body.recorded_at ?? new Date().toISOString(),
    } as never)
    .select('id')
    .single()
  if (error) return badRequest(error.message)
  return json({ ok: true, id: (data as { id?: string } | null)?.id })
})
