import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/admin/api-keys
 *
 * Admin-only. Adds a row to public.api_keys for an external provider
 * (anthropic / supabase / stripe / google / custom). The raw key is
 * stored in `encrypted_key`; the public-readable preview holds only
 * the last 4 chars so the UI can show "••••••••XXXX".
 *
 * NOTE on encryption: the column is named `encrypted_key` for forward
 * compatibility with KMS-wrapped values. Today we store the raw key
 * as the project doesn't ship a KMS integration. Treat this column
 * the same way you'd treat any other secret — RLS gates it to admin
 * only, and the dashboard UI never exposes the full value.
 *
 * Body: { name: string, provider: string, key: string, environment?: string }
 *
 * Errors:
 *   401 — caller not authed
 *   403 — caller not admin
 *   400 — missing/invalid field, unknown provider
 */
// Must match the api_provider enum (see migration 014b).
const PROVIDERS = [
  'anthropic',
  'supabase',
  'stripe',
  'google',
  'custom',
  'openai',
  'gemini',
  'n8n',
  'sendgrid',
  'twilio',
  'supabase_service',
] as const

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: { name?: string; provider?: string; key?: string; environment?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const name = (body.name ?? '').trim()
  const provider = (body.provider ?? '').trim()
  const key = (body.key ?? '').trim()
  const environment = (body.environment ?? 'production').trim()

  if (name.length === 0 || name.length > 80) {
    return badRequest('name is required (max 80 chars).')
  }
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return badRequest(`provider must be one of: ${PROVIDERS.join(', ')}.`)
  }
  if (key.length < 8) {
    return badRequest('key must be at least 8 characters.')
  }

  const preview = key.slice(-4)

  const { data: inserted, error } = await service
    .from('api_keys')
    .insert({
      name,
      provider,
      key_preview: preview,
      encrypted_key: key,
      environment,
      is_active: true,
      created_by: ctx.userId,
    } as never)
    .select('id, name, provider, key_preview, is_active, created_at')
    .single()
  if (error || !inserted) {
    console.error('[admin/api-keys] insert failed:', error)
    return internalError()
  }

  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'api_key_created',
    resource_type: 'api_key',
    resource_id: (inserted as { id: string }).id,
    new_value: { name, provider, environment },
  } as never)

  return json({ ok: true, key: inserted })
})
