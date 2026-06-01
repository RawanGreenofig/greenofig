import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/nutritionist/meal-plans/[id]
 *
 * Load one of the coach's meal plans WITH its items, so the builder can
 * open a saved plan/template to edit or re-assign. Ownership: the plan's
 * nutritionist_id must equal the caller (admins bypass).
 */
export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data: planRow } = await service
      .from('meal_plans')
      .select('id, title, weeks, nutritionist_id, client_id')
      .eq('id', params.id)
      .maybeSingle()
    const plan = planRow as
      | { id: string; title: string; weeks: number | null; nutritionist_id: string | null; client_id: string | null }
      | null
    if (!plan) return notFound('Plan not found.')
    if (ctx.profile.role !== 'admin' && plan.nutritionist_id !== ctx.userId) {
      return forbidden('This is not your plan.')
    }

    const { data: itemRows } = await service
      .from('meal_plan_items')
      .select('week_idx, day_idx, meal_type, recipe_id, custom_name, notes')
      .eq('plan_id', plan.id)
      .order('week_idx', { ascending: true })
      .order('day_idx', { ascending: true })

    return json({
      plan: { id: plan.id, title: plan.title, weeks: plan.weeks ?? 1 },
      items: itemRows ?? [],
    })
  },
)
