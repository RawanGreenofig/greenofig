import type { NextRequest } from 'next/server'
import {
  withNutritionistOrAdmin,
  type AuthedContext,
} from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Post CRUD for /nutritionist/content.
 *
 * POST   /api/nutritionist/content  body { id?, ...fields }  → upsert
 * DELETE /api/nutritionist/content  body { id }              → delete
 *
 * Was fire-and-forget supabase writes from the browser — failed
 * publishes / deletes were silent.
 */

interface Body {
  id?: string
  title?: string
  content?: string | null
  excerpt?: string | null
  audience?: string
  hue?: string
  type?: string
  is_published?: boolean
  scheduled_at?: string | null
  published_at?: string | null
  image_url?: string | null
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
      author_id: ctx.userId,
      title: body.title.trim(),
      content: body.content ?? null,
      excerpt: body.excerpt ?? null,
      audience: body.audience ?? 'all',
      hue: body.hue ?? null,
      type: body.type ?? null,
      is_published: body.is_published === true,
      scheduled_at: body.scheduled_at ?? null,
      published_at: body.published_at ?? null,
      image_url: body.image_url ?? null,
    }

    if (body.id && isUuid(body.id)) {
      const { error } = await service
        .from('posts')
        .update(row as never)
        .eq('id', body.id)
      if (error) return badRequest(error.message)
      await logAudit({
        action: 'posts.update',
        actorId: ctx.userId,
        actorRole: 'nutritionist',
        resourceType: 'posts',
        resourceId: body.id,
        newValue: row,
        ip: ipFromRequest(req),
      })
      return json({ ok: true, id: body.id })
    }

    const { data, error } = await service
      .from('posts')
      .insert(row as never)
      .select('id')
      .single()
    if (error) return badRequest(error.message)
    const inserted = (data as { id?: string } | null) ?? null
    await logAudit({
      action: 'posts.create',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'posts',
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

    const { error } = await service.from('posts').delete().eq('id', body.id)
    if (error) return badRequest(error.message)

    await logAudit({
      action: 'posts.delete',
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'posts',
      resourceId: body.id,
      ip: ipFromRequest(req),
    })

    return json({ ok: true })
  },
)
