import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { forbidden, json } from '@/lib/api/response'
import { fetchAnalyticsSummary, getAnalyticsClient } from '@/lib/google-analytics'

/**
 * GET /api/admin/analytics/google
 *
 * Returns live Google Analytics 4 traffic for the marketing site.
 * Pulls real-time active users plus 30d rollups (country, device,
 * top pages, daily timeseries). Admin-only.
 *
 * Returns { configured: false } when GA_PROPERTY_ID or
 * GA_SERVICE_ACCOUNT_JSON env vars aren't set so the dashboard can
 * render setup instructions inline.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')
  if (!getAnalyticsClient()) {
    return json({ configured: false })
  }
  try {
    const data = await fetchAnalyticsSummary()
    return json({ configured: true, data })
  } catch (err: unknown) {
    console.error('[ga] fetchAnalyticsSummary failed:', err)
    const message =
      err instanceof Error ? err.message : 'Failed to fetch GA data'
    return json({ configured: true, error: message }, 502)
  }
})

// Force dynamic — we always want fresh real-time numbers, not cached
export const dynamic = 'force-dynamic'
export const revalidate = 0
