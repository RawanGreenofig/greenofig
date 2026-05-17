import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Per-post comments backed by `post_comments` (migration 025).
 *
 * GET  /api/dashboard/posts/comments?postId=X
 *      → { comments: [{ id, body, author_id, author_name, created_at }] }
 *
 * POST /api/dashboard/posts/comments  body { post_id, body }
 *      → { ok, id }
 *
 * DELETE /api/dashboard/posts/comments  body { id }
 *      → { ok } (author or staff only — enforced at RLS, but we
 *        also guard here so a non-admin can't delete someone
 *        else's comment via service-role bypass).
 *
 * Was local-state only on the community page — every comment
 * vanished on refresh.
 */

interface PostBody {
  post_id?: string
  body?: string
}

interface DeleteBody {
  id?: string
}

const isUuidLike = (s: unknown): s is string =>
  typeof s === 'string' && s.length > 0

export const GET = withAuth(async (req: NextRequest, _ctx: AuthedContext) => {
  void _ctx
  const url = new URL(req.url)
  const postId = url.searchParams.get('postId')
  if (!isUuidLike(postId)) return badRequest('postId is required.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  type Row = {
    id: string
    body: string
    author_id: string
    created_at: string
  }
  const { data, error } = await service
    .from('post_comments')
    .select('id, body, author_id, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return badRequest(error.message)

  const rows = (data as Row[] | null) ?? []
  if (rows.length === 0) return json({ comments: [] })

  // Hydrate author display names in one round-trip.
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)))
  const { data: profs } = await service
    .from('profiles')
    .select('id, full_name')
    .in('id', authorIds)
  const nameOf = new Map(
    ((profs as { id: string; full_name: string | null }[] | null) ?? []).map(
      (p) => [p.id, p.full_name ?? 'Anonymous'],
    ),
  )

  return json({
    comments: rows.map((r) => ({
      id: r.id,
      body: r.body,
      author_id: r.author_id,
      author_name: nameOf.get(r.author_id) ?? 'Anonymous',
      created_at: r.created_at,
    })),
  })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuidLike(body.post_id)) return badRequest('post_id is required.')
  if (typeof body.body !== 'string' || body.body.trim().length === 0) {
    return badRequest('body is required.')
  }
  if (body.body.length > 2000) return badRequest('body must be ≤ 2000 chars.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data, error } = await service
    .from('post_comments')
    .insert({
      post_id: body.post_id,
      author_id: ctx.userId,
      body: body.body.trim(),
    } as never)
    .select('id, created_at')
    .single()
  if (error) return badRequest(error.message)

  const row = data as { id?: string; created_at?: string } | null
  return json({ ok: true, id: row?.id, created_at: row?.created_at })
})

export const DELETE = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: DeleteBody
  try {
    body = (await req.json()) as DeleteBody
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuidLike(body.id)) return badRequest('id is required.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Service role bypasses RLS, so we re-check authorship here. Staff
  // (admin/nutritionist) can also delete for moderation.
  const isStaff =
    ctx.profile.role === 'admin' || ctx.profile.role === 'nutritionist'
  if (!isStaff) {
    const { data: row } = await service
      .from('post_comments')
      .select('author_id')
      .eq('id', body.id)
      .maybeSingle()
    const rowAuthor = (row as { author_id?: string } | null)?.author_id
    if (rowAuthor !== ctx.userId) return badRequest('Not your comment.')
  }

  const { error } = await service.from('post_comments').delete().eq('id', body.id)
  if (error) return badRequest(error.message)

  return json({ ok: true })
})
