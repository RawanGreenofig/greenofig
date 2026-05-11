import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { forbidden, json } from '@/lib/api/response'
import {
  fetchAnalyticsSummary,
  getAnalyticsClient,
  getAnalyticsConfigError,
  getAnalyticsDiagnostic,
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
    const e = err as Record<string, unknown> & {
      message?: string
      code?: number | string
      details?: string
      status?: string
      reason?: string
      stack?: string
      cause?: unknown
      errors?: unknown
      response?: { statusText?: string; data?: unknown }
    }

    // Walk down err.cause to surface the deepest informative message —
    // googleapis often wraps the real network/auth failure inside one
    // or two outer errors with blank fields.
    let deep: unknown = err
    for (let i = 0; i < 5 && deep && typeof deep === 'object'; i++) {
      const d = deep as { cause?: unknown }
      if (!d.cause) break
      deep = d.cause
    }
    const deepObj = (deep && typeof deep === 'object') ? deep as Record<string, unknown> : {}

    // Pick the first informative string from any of these places.
    const candidates: unknown[] = [
      e.message,
      deepObj.message,
      typeof e.details === 'string' ? e.details : undefined,
      e.status,
      e.reason,
      e.response?.statusText,
      e.stack ? String(e.stack).split('\n')[0] : undefined,
      err instanceof Error ? err.toString() : undefined,
    ]
    const message =
      candidates.find((c) => typeof c === 'string' && c.trim() && c !== 'undefined undefined: undefined') as
        | string
        | undefined ||
      'Unknown error from Google Analytics Data API.'

    // Dump every own property (enumerable + non-enumerable) so we can
    // see what the SDK actually filled in. Don't expose values that
    // could include the private key itself, just the shape.
    const ownProps: Record<string, unknown> = {}
    for (const key of Object.getOwnPropertyNames(err)) {
      try {
        const v = (err as Record<string, unknown>)[key]
        if (typeof v === 'function') continue
        if (key === 'stack' && typeof v === 'string') {
          ownProps[key] = v.split('\n').slice(0, 3).join(' | ')
        } else if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          ownProps[key] = v
        } else if (v && typeof v === 'object') {
          ownProps[key] = JSON.parse(JSON.stringify(v, (_k, val) => {
            if (typeof val === 'string' && val.length > 240) return val.slice(0, 240) + '…'
            return val
          }))
        }
      } catch {
        /* skip */
      }
    }

    return {
      message,
      code: e.code,
      details: JSON.stringify(ownProps),
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
      diagnostic: getAnalyticsDiagnostic(),
    })
  }
  try {
    const data = await fetchAnalyticsSummary()
    return json({ configured: true, data })
  } catch (err) {
    const desc = describeError(err)
    console.error('[ga] fetchAnalyticsSummary failed:', desc, err)
    return json(
      {
        configured: true,
        error: desc.message,
        code: desc.code,
        details: desc.details,
        status: desc.status,
        diagnostic: getAnalyticsDiagnostic(),
      },
      502,
    )
  }
})

export const dynamic = 'force-dynamic'
export const revalidate = 0
