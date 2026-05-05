import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'
import type { FeatureFlagRow, PlatformSettingRow } from '@/lib/supabase/types'

/**
 * GET /api/features
 *
 * Returns every feature flag resolved against the caller's tier, plus
 * the cluster of `platform_settings` toggles the marketing site reads
 * (store_enabled, scanner_enabled, …). Cached for 5 minutes via
 * Cache-Control so polling clients don't hammer Supabase.
 *
 * Response: {
 *   features: { feature: string, isEnabled: boolean }[],
 *   settings: Record<string, unknown>
 * }
 */

const SETTING_KEYS = [
  'store_enabled',
  'store_enabled_tiers',
  'booking_enabled',
  'scanner_enabled',
  'community_enabled',
  'ai_chat_enabled',
  'research_desk_enabled',
  'maintenance_mode',
  'free_tier_scanner_limit',
  'site_announcement',
  'currency',
  'member_discount_percent',
] as const

export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  void _req

  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  const [flagsRes, settingsRes] = await Promise.all([
    supabase
      .from('feature_flags')
      .select('feature, enabled_for_tiers, is_globally_enabled, description'),
    supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', SETTING_KEYS as unknown as string[]),
  ])

  const tier = ctx.profile.tier
  const flags = (flagsRes.data as FeatureFlagRow[] | null) ?? []
  const features = flags.map((f) => ({
    feature: f.feature,
    isEnabled:
      f.is_globally_enabled && (f.enabled_for_tiers ?? []).includes(tier),
  }))

  const settingsRows = (settingsRes.data as Pick<PlatformSettingRow, 'key' | 'value'>[] | null) ?? []
  const settings: Record<string, unknown> = {}
  for (const row of settingsRows) settings[row.key] = row.value

  return new Response(JSON.stringify({ features, settings }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  })
  // Note: keep `json()` import unused to avoid linter complaints
  // — we need explicit Cache-Control here.
  void json
})
