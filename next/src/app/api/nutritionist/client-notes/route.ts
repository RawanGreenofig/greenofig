import type { NextRequest } from 'next/server'
import {
  withNutritionistOrAdmin,
  type AuthedContext,
} from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Clinical notes the nutritionist keeps about a client (not visible
 * to the client). Backed by `client_notes`.
 *
 * GET  /api/nutritionist/client-notes?clientId=<uuid>
 *      → { notes: ClientNote[] }
 *
 * POST /api/nutritionist/client-notes  body { client_id, body }
 *      → { ok: true, id }
 *
 * Was a setTimeout-faked save on the client (`/nutritionist/clients/
 * [id]` Notes tab) that never persisted — nutritionists who wrote
 * client notes lost every word on refresh.
 */

interface PostBody {
  client_id?: string
  body?: string
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

export const GET = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    void ctx
    const url = new URL(req.url)
    const clientId = url.searchParams.get('clientId')
    if (!isUuid(clientId)) return badRequest('clientId is required.')

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data, error } = await service
      .from('client_notes')
      .select('id, client_id, nutritionist_id, body, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return badRequest(error.message)
    return json({ notes: data ?? [] })
  },
)

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: PostBody
    try {
      body = (await req.json()) as PostBody
    } catch {
      return badRequest('Invalid JSON body.')
    }
    if (!isUuid(body.client_id)) return badRequest('client_id is required.')
    if (typeof body.body !== 'string' || body.body.trim().length === 0) {
      return badRequest('body is required.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data, error } = await service
      .from('client_notes')
      .insert({
        client_id: body.client_id,
        nutritionist_id: ctx.userId,
        body: body.body.trim(),
      } as never)
      .select('id')
      .single()
    if (error) return badRequest(error.message)
    const inserted = (data as { id?: string } | null) ?? null

    await logAudit({
      action: 'client_notes.create',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'client_notes',
      resourceId: inserted?.id,
      newValue: { client_id: body.client_id },
      ip: ipFromRequest(req),
    })

    return json({ ok: true, id: inserted?.id })
  },
)
