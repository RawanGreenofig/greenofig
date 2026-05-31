import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-clients/[id]/assignments
 *
 * Meal plans / recipes the coach assigns to a clinic client.
 *   GET  → list, newest first.
 *   POST → assign one { kind: 'meal_plan'|'recipe', title, details?, link?, due_date? }.
 * The linked client checks them off; completion feeds the analysis.
 */

const SELECT = 'id, clinic_client_id, kind, title, details, link, status, due_date, completed_at, created_at'

interface Body {
  kind?: string
  title?: string
  details?: string | null
  link?: string | null
  due_date?: string | null
}

export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    let q = service
      .from('clinic_assignments')
      .select(SELECT)
      .eq('clinic_client_id', params.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (ctx.profile.role !== 'admin') q = q.eq('coach_id', ctx.userId)
    const { data } = await q
    return json({ assignments: data ?? [] })
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
    const title = (body.title ?? '').trim()
    if (!title) return badRequest('Title is required.')
    const kind = body.kind === 'recipe' ? 'recipe' : 'meal_plan'

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data: client } = await service
      .from('clinic_clients')
      .select('id, coach_id, full_name, user_id')
      .eq('id', params.id)
      .maybeSingle()
    const c = client as { id: string; coach_id: string; full_name: string; user_id: string | null } | null
    if (!c) return badRequest('Client not found.')
    if (ctx.profile.role !== 'admin' && c.coach_id !== ctx.userId) return forbidden()

    const { data, error } = await service
      .from('clinic_assignments')
      .insert({
        clinic_client_id: c.id,
        coach_id: c.coach_id,
        kind,
        title: title.slice(0, 200),
        details: body.details?.trim()?.slice(0, 4000) || null,
        link: body.link?.trim()?.slice(0, 600) || null,
        due_date: body.due_date || null,
      } as never)
      .select('id')
      .maybeSingle()
    if (error) return badRequest(error.message)

    // Nudge the linked client (if any) via bell + push.
    if (c.user_id) {
      const secret = process.env.OPENCLAW_WEBHOOK_SECRET
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
      if (secret) {
        try {
          await fetch(`${appUrl}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-secret': secret },
            body: JSON.stringify({
              userIds: [c.user_id],
              title: kind === 'recipe' ? 'New recipe from your coach' : 'New meal plan from your coach',
              titleAr: kind === 'recipe' ? 'وصفة جديدة من مدرّبتك' : 'خطة وجبات جديدة من مدرّبتك',
              body: title,
              bodyAr: title,
              type: 'meal_plan',
              url: '/dashboard/my-plan',
            }),
          })
        } catch {
          /* best effort */
        }
      }
    }

    return json({ id: (data as { id?: string } | null)?.id })
  },
)
