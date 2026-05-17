import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/admin/audience-counts
 *
 * Used by the broadcast composer (/admin/notifications) to show "this
 * will reach N people" before send. Replaces a hardcoded
 * `{ all: 412, free: 240, ... }` lookup that meant the recipient
 * preview was lying for every project except the one those numbers
 * were copy-pasted from.
 *
 * Response:
 *   {
 *     all: number,
 *     free: number, basic: number, premium: number, vip: number,
 *     nutritionist: number, admin: number
 *   }
 */

export const GET = withAdmin(async (_req: NextRequest, _ctx: AuthedContext) => {
  void _req
  void _ctx
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // One round-trip per audience: head:true + count='exact' returns
  // only the count, not the rows. Six small queries in parallel.
  const tiers = ['free', 'basic', 'premium', 'vip'] as const
  const roles = ['nutritionist', 'admin'] as const

  const [allRes, ...rest] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }),
    ...tiers.map((t) =>
      service
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tier', t)
        .eq('role', 'user'),
    ),
    ...roles.map((r) =>
      service
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', r),
    ),
  ])

  const [freeRes, basicRes, premiumRes, vipRes, nutRes, admRes] = rest

  return json({
    all: allRes.count ?? 0,
    free: freeRes.count ?? 0,
    basic: basicRes.count ?? 0,
    premium: premiumRes.count ?? 0,
    vip: vipRes.count ?? 0,
    nutritionist: nutRes.count ?? 0,
    admin: admRes.count ?? 0,
  })
})
