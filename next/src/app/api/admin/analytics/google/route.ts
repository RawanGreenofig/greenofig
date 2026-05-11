import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { forbidden, json } from '@/lib/api/response'
import {
  fetchAnalyticsSummary,
  getAnalyticsClient,
  getAnalyticsConfigError,
} from '@/lib/google-analytics'

/**
 * GET /api/admin/analytics/google
 *
 * Returns live GA4 traffic. Admin-only.
 *
 * Response shapes:
 *   { configured: false, reason: string }    when env not wired up
 *   { configured: true, data: GaSummary }    happy path
 *   { configured: true, error: string,       when the Data API call
 *     code?, details? }                       itself failed
 */
function describeError(err: unknown): {
  message: string
  code?: number | string
  details?: string
  status?: string
} {
  if (err && typeof err === 'object') {
    const e = err as {
      message?: string
      code?: number | string
      details?: string
      status?: string
      reason?: string
      errors?: unknown
      response?: { statusText?: string; data?: unknown }
    }
    const message =
      e.message ||
      (typeof e.details === 'string' ? e.details : '') ||
      e.status ||
      e.reason ||
      e.response?.statusText ||
      'Unknown error from Google Analytics Data API.'
    return {
      message,
      code: e.code,
      details: e.details || JSON.stringify(e.errors ?? e.response?.data ?? ''),
      status: e.status,
    }
  }
  return { message: String(err) }
}

export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')

  const client = getAnalyticsClient()
  if (!client) {
    return json({
      configured: false,
      reason: getAnalyticsConfigError() ?? 'Not configured.',
    })
  }
  try {
    const data = await fetchAnalyticsSummary()
    return json({ configured: true, data })
  } catch (err) {
    const desc = describeError(err)
    console.error('[ga] fetchAnalyticsSummary failed:', desc, err)
    return json({ configured: true, error: desc.message, code: desc.code, details: desc.details, status: desc.status }, 502)
  }
})

export const dynamic = 'force-dynamic'
export const revalidate = 0
