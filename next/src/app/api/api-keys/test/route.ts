import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'

/**
 * POST /api/api-keys/test
 *
 * Body: { provider: 'google' | 'gemini' | 'stripe' | 'supabase' | 'custom',
 *         key: string, url?: string }
 *
 * Hits the provider with a minimal probe. Never persists or echoes the
 * key — only the result + responseTime. Auth: admin only.
 */

interface Body {
  provider?: string
  key?: string
  /** Required for `supabase` (project URL). */
  url?: string
}

interface TestResult {
  success: boolean
  responseTime: number
  error?: string
  note?: string
}

export const POST = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const provider = (body.provider ?? '').trim().toLowerCase()
  const key = (body.key ?? '').trim()
  if (!provider) return badRequest('provider is required.')
  if (provider !== 'custom' && !key) return badRequest('key is required.')

  const start = Date.now()
  let result: TestResult

  try {
    switch (provider) {
      case 'stripe':
        result = await testStripe(key)
        break
      case 'supabase':
        result = await testSupabase(key, body.url)
        break
      case 'google':
      case 'gemini':
        result = await testGoogle(key)
        break
      case 'custom':
        result = {
          success: true,
          responseTime: 0,
          note: 'Cannot test custom providers — assumed valid.',
        }
        break
      default:
        result = {
          success: false,
          responseTime: 0,
          error: `Unknown provider "${provider}".`,
        }
    }
  } catch (err) {
    result = {
      success: false,
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }

  // Audit the result — provider only, never the key
  await logAudit({
    action: 'api_key.test',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'api_key',
    newValue: {
      provider,
      success: result.success,
      responseTime: result.responseTime,
    },
    ip: ipFromRequest(req),
  })

  return json(result)
})

/* ── Probes ─────────────────────────────────────────────────────── */

async function testStripe(key: string): Promise<TestResult> {
  const start = Date.now()
  const res = await fetch('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${key}` },
  })
  const time = Date.now() - start
  if (res.status === 401) {
    return { success: false, responseTime: time, error: 'Invalid key.' }
  }
  if (res.status >= 400) {
    return { success: false, responseTime: time, error: `HTTP ${res.status}` }
  }
  return { success: true, responseTime: time }
}

async function testSupabase(key: string, url?: string): Promise<TestResult> {
  if (!url) return { success: false, responseTime: 0, error: 'Project URL required.' }
  const start = Date.now()
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const time = Date.now() - start
  if (res.status === 401 || res.status === 403) {
    return { success: false, responseTime: time, error: 'Invalid key or URL.' }
  }
  return { success: res.ok, responseTime: time }
}

async function testGoogle(key: string): Promise<TestResult> {
  const start = Date.now()
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
  )
  const time = Date.now() - start
  if (res.status === 401 || res.status === 403) {
    return { success: false, responseTime: time, error: 'Invalid key.' }
  }
  if (res.status >= 400) {
    return { success: false, responseTime: time, error: `HTTP ${res.status}` }
  }
  return { success: true, responseTime: time }
}
