import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * Tiny DB-backed rate limiter for the unauthenticated public routes
 * (clinic-link / intake / update / pay). One row per hit; we count rows
 * in the window. Reliable across serverless instances (unlike in-memory),
 * cheap enough for low-traffic public endpoints. Fails OPEN if Supabase
 * is unavailable — never block a legitimate user because the limiter is down.
 *
 * Returns true when the request is ALLOWED.
 */
export async function rateLimit(
  bucket: string,
  opts: { limit: number; windowSec: number },
): Promise<boolean> {
  const service = getServiceSupabase()
  if (!service) return true

  const since = new Date(Date.now() - opts.windowSec * 1000).toISOString()
  const { count } = await service
    .from('rate_limit_events')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .gte('created_at', since)

  if ((count ?? 0) >= opts.limit) return false

  await service.from('rate_limit_events').insert({ bucket } as never)

  // Opportunistic cleanup so the table stays bounded (rows older than a day).
  if (Math.random() < 0.05) {
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
    await service.from('rate_limit_events').delete().lt('created_at', dayAgo)
  }
  return true
}
