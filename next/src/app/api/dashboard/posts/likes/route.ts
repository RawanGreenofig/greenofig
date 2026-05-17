import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Per-post likes backed by `post_likes` (migration 025).
 *
 * GET  /api/dashboard/posts/likes?postId=X
 *      → { count, mine }
 *
 * POST /api/dashboard/posts/likes  body { post_id, like: boolean }
 *      → { count, mine }
 *
 * Was a local-state toggle on the community page — every like was
 * forgotten the moment the user navigated or refreshed.
 */

const isUuidLike = (s: unknown): s is string =>
  typeof s === 'string' && s.length > 0

interface PostBody {
  post_id?: string
  like?: boolean
}

async function countForPost(
  service: ReturnType<typeof getServiceSupabase>,
  postId: string,
): Promise<number> {
  if (!service) return 0
  const { count } = await service
    .from('post_likes')
    .select('post_id', { count: 'exact', head: true })
    .eq('post_id', postId)
  return count ?? 0
}

export const GET = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  const url = new URL(req.url)
  const postId = url.searchParams.get('postId')
  if (!isUuidLike(postId)) return badRequest('postId is required.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const [{ count }, { data: mine }] = await Promise.all([
    service
      .from('post_likes')
      .select('post_id', { count: 'exact', head: true })
      .eq('post_id', postId),
    service
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', ctx.userId)
      .maybeSingle(),
  ])

  return json({ count: count ?? 0, mine: !!mine })
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuidLike(body.post_id)) return badRequest('post_id is required.')
  if (typeof body.like !== 'boolean') return badRequest('like must be a boolean.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  if (body.like) {
    // Insert is idempotent thanks to the (post_id, user_id) primary key.
    // upsert with onConflict skips on duplicate.
    const { error } = await service
      .from('post_likes')
      .upsert(
        { post_id: body.post_id, user_id: ctx.userId } as never,
        { onConflict: 'post_id,user_id', ignoreDuplicates: true },
      )
    if (error) return badRequest(error.message)
  } else {
    const { error } = await service
      .from('post_likes')
      .delete()
      .eq('post_id', body.post_id)
      .eq('user_id', ctx.userId)
    if (error) return badRequest(error.message)
  }

  const count = await countForPost(service, body.post_id)
  return json({ count, mine: body.like })
})
