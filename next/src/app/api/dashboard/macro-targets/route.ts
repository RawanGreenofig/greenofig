import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/dashboard/macro-targets
 *
 * Customer (or staff acting on their own profile) updates their
 * daily macro goals. Writes target_calories / target_protein_g /
 * target_carbs_g / target_fat_g on `profiles`. Pass `null` for any
 * field to clear back to the platform default.
 *
 * Body: {
 *   calories?: number | null,
 *   protein?:  number | null,
 *   carbs?:    number | null,
 *   fat?:      number | null
 * }
 *
 * Migration 026 added the columns with check constraints, so we
 * validate the ranges here too to return a friendly 422 instead of
 * a 500 from the DB.
 */

interface Body {
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
}

const inRange = (n: unknown, min: number, max: number): boolean =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const patch: Record<string, number | null> = {}
  if (body.calories !== undefined) {
    if (body.calories === null) patch.target_calories = null
    else if (inRange(body.calories, 800, 6000)) patch.target_calories = Math.round(body.calories)
    else return badRequest('calories must be 800-6000.')
  }
  if (body.protein !== undefined) {
    if (body.protein === null) patch.target_protein_g = null
    else if (inRange(body.protein, 0, 500)) patch.target_protein_g = Math.round(body.protein)
    else return badRequest('protein must be 0-500.')
  }
  if (body.carbs !== undefined) {
    if (body.carbs === null) patch.target_carbs_g = null
    else if (inRange(body.carbs, 0, 1000)) patch.target_carbs_g = Math.round(body.carbs)
    else return badRequest('carbs must be 0-1000.')
  }
  if (body.fat !== undefined) {
    if (body.fat === null) patch.target_fat_g = null
    else if (inRange(body.fat, 0, 400)) patch.target_fat_g = Math.round(body.fat)
    else return badRequest('fat must be 0-400.')
  }

  if (Object.keys(patch).length === 0) {
    return badRequest('No fields to update.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { error } = await service
    .from('profiles')
    .update(patch as never)
    .eq('id', ctx.userId)
  if (error) return badRequest(error.message)

  return json({ ok: true, patch })
})
