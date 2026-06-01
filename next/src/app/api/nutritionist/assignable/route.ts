import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/nutritionist/assignable
 *
 * The coach's existing recipes and meal plans, so she can ASSIGN one to a
 * clinic client instead of re-authoring it. Each item carries a `summary`
 * snapshot (ingredients/steps for recipes, week count for plans) that the
 * assign form drops straight into the assignment details — so the linked
 * client sees the full thing on their /dashboard/my-plan.
 */
interface RecipeRow {
  id: string
  title: string
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  calories_per_serving: number | null
  ingredients: unknown
  instructions: unknown
}
interface PlanRow {
  id: string
  title: string
  week_start: string | null
  week_end: string | null
}

function asStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => {
      if (typeof x === 'string') return x
      if (x && typeof x === 'object') {
        const o = x as Record<string, unknown>
        // ingredient objects commonly look like { name, amount, unit }
        const name = typeof o.name === 'string' ? o.name : typeof o.text === 'string' ? o.text : ''
        const amount = o.amount != null ? String(o.amount) : ''
        const unit = typeof o.unit === 'string' ? o.unit : ''
        return [amount, unit, name].filter(Boolean).join(' ').trim()
      }
      return ''
    })
    .filter(Boolean)
}

function recipeSummary(r: RecipeRow): string {
  const ing = asStrings(r.ingredients)
  const steps = asStrings(r.instructions)
  const meta: string[] = []
  if (r.servings) meta.push(`${r.servings} serving${r.servings > 1 ? 's' : ''}`)
  if (r.calories_per_serving) meta.push(`${r.calories_per_serving} kcal/serving`)
  const time = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0)
  if (time) meta.push(`${time} min`)
  const parts: string[] = []
  if (meta.length) parts.push(meta.join(' · '))
  if (ing.length) parts.push(`Ingredients:\n${ing.map((i) => `• ${i}`).join('\n')}`)
  if (steps.length) parts.push(`Steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`)
  return parts.join('\n\n').slice(0, 3500)
}

export const GET = withNutritionistOrAdmin(
  async (_req: NextRequest, ctx: AuthedContext) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const isAdmin = ctx.profile.role === 'admin'

    // Recipes she created (admins see all). Published ones from others too.
    let recQ = service
      .from('recipes')
      .select('id, title, servings, prep_time_minutes, cook_time_minutes, calories_per_serving, ingredients, instructions')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!isAdmin) recQ = recQ.or(`created_by.eq.${ctx.userId},is_published.eq.true`)
    const { data: recData } = await recQ
    const recipes = ((recData as RecipeRow[] | null) ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      summary: recipeSummary(r),
    }))

    // Meal plans she authored. (Real schema: created_by + week_start/week_end,
    // NOT nutritionist_id/weeks.)
    let planQ = service
      .from('meal_plans')
      .select('id, title, week_start, week_end')
      .order('created_at', { ascending: false })
      .limit(100)
    if (!isAdmin) planQ = planQ.eq('created_by', ctx.userId)
    const { data: planData } = await planQ
    const seen = new Set<string>()
    const mealPlans = ((planData as PlanRow[] | null) ?? [])
      .map((p) => {
        const span =
          p.week_start && p.week_end
            ? `${p.week_start} → ${p.week_end}`
            : p.week_start || ''
        return { id: p.id, title: p.title, summary: span ? `Meal plan · ${span}` : 'Meal plan' }
      })
      // collapse the many per-client copies that share a title into one entry
      .filter((p) => {
        const k = p.title.trim().toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })

    return json({ recipes, mealPlans })
  },
)
