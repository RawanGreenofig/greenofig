import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json } from '@/lib/api/response'
import { getCurrentTierLimit, getUserUsageToday } from '@/lib/ai-usage'

/**
 * GET /api/scanner/usage
 * Returns today's scanner usage for the authenticated user, the limit
 * derived from platform_settings.ai_limits_scanner for their tier, and
 * the remaining budget. Used by the scanner UI banner.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const tier = (ctx.profile.tier ?? 'free') as 'free' | 'basic' | 'premium' | 'vip'
  const used = await getUserUsageToday(ctx.userId, 'scanner')
  const limit = await getCurrentTierLimit('scanner', tier)
  const isUnlimited = limit >= 999
  const remaining = isUnlimited
    ? 999
    : Math.max(0, limit - used)
  return json({
    used,
    limit,
    remaining,
    tier,
    isUnlimited,
  })
})
