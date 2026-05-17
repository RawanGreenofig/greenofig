import type { NextRequest } from 'next/server'
import {
  withNutritionistOrAdmin,
  type AuthedContext,
} from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Recipe CRUD for the nutritionist's recipe builder.
 *
 * POST   /api/nutritionist/recipes  body { id?, ...fields }   → upsert
 * DELETE /api/nutritionist/recipes  body { id }               → delete
 *
 * Was a fire-and-forget `void supabase.from('recipes').update(...)`
 * from the browser with no `.then`/`.catch`, so a failed save or
 * delete left the UI showing optimistic state while the DB never
 * received the change.
 */

interface IngredientIn {
  name?: string
  quantity?: number
  unit?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

interface Body {
  id?: string
  title?: string
  category?: string
  hue?: string
  servings?: number
  prep_time_minutes?: number
  cook_time_minutes?: number
  dietary_tags?: string[]
  ingredients?: IngredientIn[]
  instructions?: string[]
  description?: string | null
  is_published?: boolean
  image_url?: string | null
  calories_per_serving?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return badRequest('title is required.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const row: Record<string, unknown> = {
      created_by: ctx.userId,
      title: body.title.trim(),
      category: body.category ?? null,
      hue: body.hue ?? null,
      servings: body.servings ?? 1,
      prep_time_minutes: body.prep_time_minutes ?? 0,
      cook_time_minutes: body.cook_time_minutes ?? 0,
      dietary_tags: body.dietary_tags ?? [],
      ingredients: body.ingredients ?? [],
      instructions: body.instructions ?? [],
      description: body.description ?? null,
      is_published: body.is_published === true,
      image_url: body.image_url ?? null,
      calories_per_serving: body.calories_per_serving ?? 0,
      protein_g: body.protein_g ?? 0,
      carbs_g: body.carbs_g ?? 0,
      fat_g: body.fat_g ?? 0,
    }

    if (body.id && isUuid(body.id)) {
      const { error } = await service
        .from('recipes')
        .update(row as never)
        .eq('id', body.id)
      if (error) return badRequest(error.message)
      await logAudit({
        action: 'recipes.update',
        actorId: ctx.userId,
        actorRole: 'nutritionist',
        resourceType: 'recipes',
        resourceId: body.id,
        newValue: row,
        ip: ipFromRequest(req),
      })
      return json({ ok: true, id: body.id })
    }

    const { data, error } = await service
      .from('recipes')
      .insert(row as never)
      .select('id')
      .single()
    if (error) return badRequest(error.message)
    const inserted = (data as { id?: string } | null) ?? null
    await logAudit({
      action: 'recipes.create',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'recipes',
      resourceId: inserted?.id,
      newValue: row,
      ip: ipFromRequest(req),
    })
    return json({ ok: true, id: inserted?.id })
  },
)

export const DELETE = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }
    if (!isUuid(body.id)) return badRequest('id is required.')

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { error } = await service.from('recipes').delete().eq('id', body.id)
    if (error) return badRequest(error.message)

    await logAudit({
      action: 'recipes.delete',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'recipes',
      resourceId: body.id,
      ip: ipFromRequest(req),
    })

    return json({ ok: true })
  },
)
