import type { NextRequest } from 'next/server'
import {
  withNutritionistOrAdmin,
  type AuthedContext,
} from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Product CRUD for the head-coach store curation page.
 *
 * POST   /api/nutritionist/products  body { id?, ...fields }       → upsert
 * POST   /api/nutritionist/products  body { id, toggle: 'pick' | 'visible' } → flip flag
 * DELETE /api/nutritionist/products  body { id }                   → delete
 *
 * Was three separate fire-and-forget supabase writes (toggle pick,
 * toggle visible, full save) — failures invisible.
 *
 * The page itself is head-coach-only via the layout guard, so the
 * withNutritionistOrAdmin gate is enough at the API level.
 */

interface Body {
  id?: string
  toggle?: 'pick' | 'visible'
  name?: string
  category?: string
  price?: number
  stock?: number
  description?: string | null
  drNote?: string | null
  drPick?: boolean
  visible?: boolean
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

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Toggle path: flip a single flag without overwriting the rest of
    // the row. Reads the prior value so the flip is symmetrical.
    if (body.toggle === 'pick' || body.toggle === 'visible') {
      if (!isUuid(body.id)) return badRequest('id is required for toggle.')
      const col = body.toggle === 'pick' ? 'is_nutritionist_pick' : 'is_active'
      const { data: prev } = await service
        .from('products')
        .select(col)
        .eq('id', body.id)
        .maybeSingle()
      const prevRow = prev as Record<string, boolean | null> | null
      const next = !(prevRow?.[col] ?? false)
      const { error } = await service
        .from('products')
        .update({ [col]: next } as never)
        .eq('id', body.id)
      if (error) return badRequest(error.message)

      await logAudit({
        action: 'products.toggle',
        actorId: ctx.userId,
        actorRole: 'nutritionist',
        resourceType: 'products',
        resourceId: body.id,
        newValue: { [col]: next },
        ip: ipFromRequest(req),
      })
      return json({ ok: true, [col]: next })
    }

    // Upsert path.
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      return badRequest('name is required.')
    }
    const row = {
      name: body.name.trim(),
      category: body.category ?? 'supplements',
      price_cents: Math.round((body.price ?? 0) * 100),
      stock_quantity: body.stock ?? 0,
      description: body.description ?? null,
      nutritionist_note: body.drNote ?? null,
      is_nutritionist_pick: body.drPick === true,
      is_active: body.visible !== false,
    }

    if (body.id && isUuid(body.id)) {
      const { error } = await service
        .from('products')
        .update(row as never)
        .eq('id', body.id)
      if (error) return badRequest(error.message)
      await logAudit({
        action: 'products.update',
        actorId: ctx.userId,
        actorRole: 'nutritionist',
        resourceType: 'products',
        resourceId: body.id,
        newValue: row,
        ip: ipFromRequest(req),
      })
      return json({ ok: true, id: body.id })
    }

    const { data, error } = await service
      .from('products')
      .insert(row as never)
      .select('id')
      .single()
    if (error) return badRequest(error.message)
    const inserted = (data as { id?: string } | null) ?? null
    await logAudit({
      action: 'products.create',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'products',
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

    const { error } = await service.from('products').delete().eq('id', body.id)
    if (error) return badRequest(error.message)

    await logAudit({
      action: 'products.delete',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'products',
      resourceId: body.id,
      ip: ipFromRequest(req),
    })
    return json({ ok: true })
  },
)
