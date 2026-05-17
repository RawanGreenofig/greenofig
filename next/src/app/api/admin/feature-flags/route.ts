import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'
import type { UserTier } from '@/lib/supabase/types'

/**
 * Admin-only CRUD for the `feature_flags` table. /admin/feature-flags
 * used to upsert directly from the browser supabase client, which
 *   (a) silently dropped writes when RLS denied them, and
 *   (b) had no audit trail.
 *
 * GET  /api/admin/feature-flags
 *   → { flags: FeatureFlagRow[] }
 *
 * POST /api/admin/feature-flags
 *   body: { feature, is_globally_enabled?, enabled_for_tiers? }
 *   → { ok: true }
 *
 * The Tier enum is enforced server-side so a caller can't smuggle
 * in arbitrary strings.
 */

const VALID_TIERS = ['free', 'basic', 'premium', 'vip'] as const
type Tier = (typeof VALID_TIERS)[number]
const isTier = (s: unknown): s is Tier =>
  typeof s === 'string' && (VALID_TIERS as readonly string[]).includes(s)

interface UpsertBody {
  feature?: string
  is_globally_enabled?: boolean
  enabled_for_tiers?: UserTier[]
}

export const GET = withAdmin(async (_req: NextRequest, _ctx: AuthedContext) => {
  void _req
  void _ctx
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data, error } = await service
    .from('feature_flags')
    .select('feature, enabled_for_tiers, is_globally_enabled, description')

  if (error) return badRequest(error.message)
  return json({ flags: data ?? [] })
})

export const POST = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: UpsertBody
  try {
    body = (await req.json()) as UpsertBody
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const feature = body.feature
  if (!feature || typeof feature !== 'string') {
    return badRequest('feature is required.')
  }
  if (
    body.enabled_for_tiers !== undefined &&
    (!Array.isArray(body.enabled_for_tiers) ||
      body.enabled_for_tiers.some((t) => !isTier(t)))
  ) {
    return badRequest('enabled_for_tiers must be an array of valid tiers.')
  }
  if (
    body.is_globally_enabled !== undefined &&
    typeof body.is_globally_enabled !== 'boolean'
  ) {
    return badRequest('is_globally_enabled must be a boolean.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Read previous row for the audit diff so we can show "X turned
  // sleep_tracking off" in the audit log instead of just "feature
  // updated".
  const { data: prevRow } = await service
    .from('feature_flags')
    .select('enabled_for_tiers, is_globally_enabled')
    .eq('feature', feature)
    .maybeSingle()

  const update: Record<string, unknown> = { feature }
  if (body.is_globally_enabled !== undefined) {
    update.is_globally_enabled = body.is_globally_enabled
  }
  if (body.enabled_for_tiers !== undefined) {
    update.enabled_for_tiers = body.enabled_for_tiers
  }

  const { error } = await service
    .from('feature_flags')
    .upsert(update as never, { onConflict: 'feature' })

  if (error) return badRequest(error.message)

  await logAudit({
    action: 'feature_flags.update',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'feature_flags',
    resourceId: feature,
    oldValue: prevRow ?? null,
    newValue: update,
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
})
