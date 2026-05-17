import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Nutrition log CRUD for the customer-facing /dashboard/track page.
 *
 * POST   /api/dashboard/nutrition-log  body { meal_type, food_name, ...macros }
 * DELETE /api/dashboard/nutrition-log  body { id }
 *
 * Was a fire-and-forget `void supabase.from('nutrition_logs').insert(...)`
 * straight from the browser. RLS-protected so the bug was less
 * impactful than the nutritionist-side fire-and-forgets, but the UX
 * was misleading: the page rendered the entry locally before the
 * insert resolved, and silently kept it on RLS failure. After
 * refresh the row was gone with no signal.
 *
 * `meal_type` accepts the supplements case too (meal_type='supplement')
 * so the supplements card on the same page can persist via the same
 * route. Saves us a separate endpoint for a one-column-difference
 * write.
 */

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'supplement'] as const
type MealType = (typeof VALID_MEAL_TYPES)[number]

interface PostBody {
  meal_type?: string
  food_name?: string
  serving_size?: string | null
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number | null
  sugar_g?: number | null
  sodium_mg?: number | null
  logged_at?: string
  notes?: string | null
}

const isMealType = (s: unknown): s is MealType =>
  typeof s === 'string' && (VALID_MEAL_TYPES as readonly string[]).includes(s)

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isMealType(body.meal_type)) {
    return badRequest('meal_type must be breakfast, lunch, dinner, snack, or supplement.')
  }
  if (typeof body.food_name !== 'string' || body.food_name.trim().length === 0) {
    return badRequest('food_name is required.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const row = {
    user_id: ctx.userId,
    meal_type: body.meal_type,
    food_name: body.food_name.trim(),
    serving_size: body.serving_size ?? null,
    calories: body.calories ?? 0,
    protein_g: body.protein_g ?? 0,
    carbs_g: body.carbs_g ?? 0,
    fat_g: body.fat_g ?? 0,
    fiber_g: body.fiber_g ?? null,
    sugar_g: body.sugar_g ?? null,
    sodium_mg: body.sodium_mg ?? null,
    source: 'manual',
    logged_at: body.logged_at ?? new Date().toISOString(),
    notes: body.notes ?? null,
  }

  const { data, error } = await service
    .from('nutrition_logs')
    .insert(row as never)
    .select('id')
    .single()
  if (error) return badRequest(error.message)
  return json({ ok: true, id: (data as { id?: string } | null)?.id })
})

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: { id?: string }
  try {
    body = (await req.json()) as { id?: string }
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuid(body.id)) return badRequest('id is required.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // user_id filter is the auth guard at row level — a user can only
  // delete their own nutrition logs, never anyone else's.
  const { error } = await service
    .from('nutrition_logs')
    .delete()
    .eq('id', body.id)
    .eq('user_id', ctx.userId)
  if (error) return badRequest(error.message)

  return json({ ok: true })
})
