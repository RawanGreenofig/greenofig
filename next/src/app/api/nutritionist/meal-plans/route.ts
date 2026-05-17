import type { NextRequest } from 'next/server'
import {
  withNutritionistOrAdmin,
  type AuthedContext,
} from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/nutritionist/meal-plans
 *
 * Body:
 * {
 *   client_id?: string,         // null/undefined → save as draft owned by the nutritionist
 *   title: string,
 *   weeks: number,
 *   items: [{
 *     week_idx: number, day_idx: number, meal_type: string,
 *     recipe_id?: string, custom_name?: string, notes?: string
 *   }],
 * }
 *
 * Two-step save with rollback semantics:
 *
 *   1. If assigning to a client, soft-deactivate any prior is_active=true
 *      plans for that client. A client must only ever have ONE active
 *      plan — dashboard reads expect a single row.
 *   2. Insert the new meal_plans row. If this fails AFTER step 1
 *      succeeded, the client is left with no active plan — so on
 *      insert failure we re-activate the most recent prior plan we
 *      just deactivated. Best we can do without a real transaction.
 *   3. Bulk-insert meal_plan_items.
 *
 * The original page did all three steps from the browser supabase
 * client in a `void` async IIFE — no error checking between steps,
 * so a network blip after step 1 silently lost the client's prior
 * meal plan.
 */

interface ItemIn {
  week_idx?: number
  day_idx?: number
  meal_type?: string
  recipe_id?: string | null
  custom_name?: string | null
  notes?: string | null
}

interface Body {
  client_id?: string | null
  title?: string
  weeks?: number
  items?: ItemIn[]
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const

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
    if (typeof body.weeks !== 'number' || body.weeks < 1 || body.weeks > 52) {
      return badRequest('weeks must be between 1 and 52.')
    }
    if (body.client_id !== null && body.client_id !== undefined && !isUuid(body.client_id)) {
      return badRequest('client_id must be a uuid or null.')
    }
    if (!Array.isArray(body.items)) {
      return badRequest('items must be an array.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const assignedClientId = body.client_id ?? null
    const ownerId = assignedClientId ?? ctx.userId
    const isAssigning = !!assignedClientId

    // Step 1: deactivate prior actives for this client. Remember which
    // row IDs we deactivated so we can re-activate the most recent one
    // if step 2 fails.
    let priorActiveIds: string[] = []
    if (isAssigning) {
      const { data: prior } = await service
        .from('meal_plans')
        .select('id')
        .eq('client_id', assignedClientId)
        .eq('is_active', true)
      priorActiveIds = ((prior as { id: string }[] | null) ?? []).map((r) => r.id)
      if (priorActiveIds.length > 0) {
        const { error: deactErr } = await service
          .from('meal_plans')
          .update({ is_active: false } as never)
          .in('id', priorActiveIds)
        if (deactErr) return badRequest(`Failed to deactivate prior plan: ${deactErr.message}`)
      }
    }

    // Step 2: insert the new plan row.
    const { data: planRow, error: insertErr } = await service
      .from('meal_plans')
      .insert({
        client_id: ownerId,
        nutritionist_id: ctx.userId,
        title: body.title.trim(),
        start_date: new Date().toISOString().slice(0, 10),
        weeks: body.weeks,
        is_active: isAssigning,
      } as never)
      .select('id')
      .single()

    if (insertErr || !planRow) {
      // Roll back step 1 by re-activating the most recent prior row.
      // This is a best-effort recovery — if rollback ALSO fails the
      // client is in a bad state, but we surface the original insert
      // error rather than the rollback failure.
      if (priorActiveIds.length > 0) {
        await service
          .from('meal_plans')
          .update({ is_active: true } as never)
          .eq('id', priorActiveIds[priorActiveIds.length - 1] as string)
      }
      return badRequest(`Failed to create plan: ${insertErr?.message ?? 'unknown'}`)
    }

    const planId = (planRow as { id: string }).id

    // Step 3: insert items. We validate every row before sending so a
    // single bad row doesn't half-write a plan.
    const itemRows: {
      plan_id: string
      week_idx: number
      day_idx: number
      meal_type: string
      recipe_id: string | null
      custom_name: string | null
      notes: string | null
    }[] = []
    for (const item of body.items) {
      if (
        typeof item.week_idx !== 'number' ||
        typeof item.day_idx !== 'number' ||
        typeof item.meal_type !== 'string' ||
        !(VALID_MEAL_TYPES as readonly string[]).includes(item.meal_type)
      ) {
        // Step 3 failed validation: delete the plan row we just created
        // so we don't leave an empty plan behind.
        await service.from('meal_plans').delete().eq('id', planId)
        return badRequest('Each item must include week_idx, day_idx, and a valid meal_type.')
      }
      itemRows.push({
        plan_id: planId,
        week_idx: item.week_idx,
        day_idx: item.day_idx,
        meal_type: item.meal_type,
        recipe_id: isUuid(item.recipe_id) ? item.recipe_id : null,
        custom_name: item.custom_name ?? null,
        notes: item.notes ?? null,
      })
    }

    if (itemRows.length > 0) {
      const { error: itemsErr } = await service
        .from('meal_plan_items')
        .insert(itemRows as never)
      if (itemsErr) {
        await service.from('meal_plans').delete().eq('id', planId)
        return badRequest(`Failed to save plan items: ${itemsErr.message}`)
      }
    }

    await logAudit({
      action: 'meal_plans.create',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'meal_plans',
      resourceId: planId,
      newValue: {
        client_id: assignedClientId,
        title: body.title.trim(),
        weeks: body.weeks,
        item_count: itemRows.length,
      },
      ip: ipFromRequest(req),
    })

    return json({ ok: true, planId })
  },
)
