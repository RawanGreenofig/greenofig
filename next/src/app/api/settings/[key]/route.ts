import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/settings/[key]
 *
 * Body: { value: unknown, valueAr?: unknown }
 *
 * Updates a row in `platform_settings`. The key MUST be on the whitelist
 * — never let arbitrary callers stash data under arbitrary keys.
 *
 * Auth: admin only.
 *
 * Side effects:
 *   - Audited via `logAudit` with old/new values
 *   - Supabase realtime broadcasts the row change automatically because
 *     `platform_settings` is on the realtime publication; subscribed
 *     clients see the change in milliseconds.
 */

const ALLOWED_KEYS = [
  'store_enabled',
  'store_enabled_tiers',
  'booking_enabled',
  'scanner_enabled',
  'community_enabled',
  'ai_chat_enabled',
  'research_desk_enabled',
  'maintenance_mode',
  'free_tier_scanner_limit',
  'booking_price_cents',
  'site_announcement',
  'currency',
  'member_discount_percent',
  'site_hero',
  'site_about',
  'site_pricing',
  'site_faq',
  'site_footer',
  'site_general',
  'site_branding',
  'site_integrations',
  'ai_limits_scanner',
  'ai_limits_chat',
  'ai_limits_research',
  'ai_daily_global_cap',
] as const

const isAllowed = (k: string): boolean =>
  (ALLOWED_KEYS as readonly string[]).includes(k)

interface Body {
  value: unknown
  valueAr?: unknown
}

export const GET = withAdmin<{ key: string }>(
  async (_req: NextRequest, _ctx: AuthedContext, { params }) => {
    const key = params.key
    if (!isAllowed(key)) {
      return badRequest(`Setting "${key}" is not editable.`)
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data: row } = await service
      .from('platform_settings')
      .select('value, value_ar, updated_at')
      .eq('key', key)
      .maybeSingle()

    if (!row) return notFound(`Setting "${key}" has no row yet.`)
    return json(row)
  },
)

export const POST = withAdmin<{ key: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    const key = params.key
    if (!isAllowed(key)) {
      return badRequest(`Setting "${key}" is not editable.`)
    }

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }
    if (body.value === undefined) {
      return badRequest('value is required.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Read previous value for the audit diff
    const { data: prevRow } = await service
      .from('platform_settings')
      .select('value, value_ar')
      .eq('key', key)
      .maybeSingle()
    const prev = prevRow as { value: unknown; value_ar: unknown } | null

    const { error } = await service
      .from('platform_settings')
      .upsert({
        key,
        value: body.value,
        value_ar: body.valueAr ?? null,
      } as never, { onConflict: 'key' })

    if (error) return badRequest(error.message)

    await logAudit({
      action: 'platform_settings.update',
      actorId: ctx.userId,
      actorRole: 'admin',
      resourceType: 'platform_settings',
      resourceId: key,
      oldValue: prev,
      newValue: { value: body.value, value_ar: body.valueAr ?? null },
      ip: ipFromRequest(req),
    })

    return json({ success: true, key, value: body.value })
  },
)
