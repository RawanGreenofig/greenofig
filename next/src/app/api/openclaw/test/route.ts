import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { json } from '@/lib/api/response'

/**
 * GET /api/openclaw/test
 *
 * Admin-only round-trip probe: calls the public webhook with the server
 * secret and the safe `get_platform_stats` action. Used by the OpenClaw
 * admin page to render a green / amber check after setup.
 *
 * Response: { configured: boolean, ok: boolean, status: number, body: string }
 */

export const GET = withAdmin(async (req: NextRequest, _ctx: AuthedContext) => {
  void _ctx
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  if (!secret) {
    return json({
      configured: false,
      ok: false,
      status: 503,
      body: 'OPENCLAW_WEBHOOK_SECRET is not set on the server.',
    })
  }

  try {
    const probe = await fetch(`${req.nextUrl.origin}/api/openclaw/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openclaw-secret': secret,
      },
      body: JSON.stringify({
        action: 'get_platform_stats',
        requestedBy: 'admin-test',
      }),
    })
    const body = await probe.text()
    return json({
      configured: true,
      ok: probe.ok,
      status: probe.status,
      body,
    })
  } catch (err) {
    return json({
      configured: true,
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : 'Network error',
    })
  }
})
