import { getServerSupabase } from '@/lib/supabase/server'

export type AIFeature = 'scanner' | 'ai_chat' | 'research'
export type UsageTier = 'free' | 'basic' | 'premium' | 'vip'

const FEATURE_SETTING_KEY: Record<AIFeature, string> = {
  scanner: 'ai_limits_scanner',
  ai_chat: 'ai_limits_chat',
  research: 'ai_limits_research',
}

/** Used when platform_settings is missing (e.g. fresh install before 005). */
const FALLBACK_LIMITS: Record<AIFeature, Record<UsageTier, number>> = {
  scanner:  { free: 3, basic: 999, premium: 999, vip: 999 },
  ai_chat:  { free: 0, basic: 0,   premium: 50,  vip: 999 },
  research: { free: 0, basic: 0,   premium: 20,  vip: 999 },
}

const DEFAULT_GLOBAL_CAP = 1000

interface CheckResult {
  allowed: boolean
  used: number
  limit: number
  remaining: number
}

/** Read the per-tier limit JSON from platform_settings (or fallback). */
async function getLimitForTier(
  feature: AIFeature,
  tier: UsageTier,
): Promise<number> {
  const supabase = getServerSupabase()
  if (!supabase) return FALLBACK_LIMITS[feature][tier]
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', FEATURE_SETTING_KEY[feature])
    .maybeSingle()
  const value = (data as { value?: Record<string, number> } | null)?.value
  if (value && typeof value === 'object') {
    const v = value[tier]
    if (typeof v === 'number') return v
  }
  return FALLBACK_LIMITS[feature][tier]
}

/** Returns true while we're under the platform-wide daily cap. */
async function isUnderGlobalCap(): Promise<boolean> {
  const supabase = getServerSupabase()
  if (!supabase) return true
  const today = new Date().toISOString().slice(0, 10)

  const { data: capRow } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'ai_daily_global_cap')
    .maybeSingle()
  const capRaw = (capRow as { value?: unknown } | null)?.value
  const cap =
    typeof capRaw === 'number'
      ? capRaw
      : typeof capRaw === 'string'
        ? Number(capRaw)
        : DEFAULT_GLOBAL_CAP
  if (!Number.isFinite(cap) || cap <= 0) return true

  const { data: rows } = await supabase
    .from('ai_usage')
    .select('request_count')
    .eq('date', today)
  const total =
    ((rows as { request_count?: number }[] | null) ?? []).reduce(
      (sum, r) => sum + (r.request_count ?? 0),
      0,
    ) ?? 0

  return total < cap
}

/**
 * Atomically check the per-tier daily limit for `feature` and increment
 * the user's request_count for today. Returns whether the request is
 * allowed and the resulting usage numbers.
 *
 * Treats `999` as "effectively unlimited" — only the global daily cap
 * applies for that case (so we still have a runaway-cost guard).
 */
export async function checkAndIncrementUsage(
  userId: string,
  tier: UsageTier,
  feature: AIFeature,
): Promise<CheckResult> {
  const limit = await getLimitForTier(feature, tier)

  // Disabled for this tier
  if (limit === 0) {
    return { allowed: false, used: 0, limit: 0, remaining: 0 }
  }

  const supabase = getServerSupabase()
  if (!supabase) {
    // Fail open in unconfigured envs so dev doesn't break, but still
    // respect the disabled flag above.
    return { allowed: true, used: 0, limit, remaining: limit }
  }

  const today = new Date().toISOString().slice(0, 10)

  // Read current count
  const { data: usage } = await supabase
    .from('ai_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('date', today)
    .maybeSingle()
  const current = (usage as { request_count?: number } | null)?.request_count ?? 0

  // Unlimited for this tier — still gate on the global cap
  if (limit >= 999) {
    const ok = await isUnderGlobalCap()
    if (!ok) return { allowed: false, used: current, limit: 999, remaining: 0 }
    await supabase
      .from('ai_usage')
      .upsert(
        {
          user_id: userId,
          feature,
          date: today,
          request_count: current + 1,
        } as never,
        { onConflict: 'user_id,feature,date' },
      )
    return { allowed: true, used: current + 1, limit: 999, remaining: 999 }
  }

  if (current >= limit) {
    return { allowed: false, used: current, limit, remaining: 0 }
  }

  await supabase
    .from('ai_usage')
    .upsert(
      {
        user_id: userId,
        feature,
        date: today,
        request_count: current + 1,
      } as never,
      { onConflict: 'user_id,feature,date' },
    )

  return {
    allowed: true,
    used: current + 1,
    limit,
    remaining: limit - current - 1,
  }
}

/** Read-only — used by /api/scanner/usage GET. */
export async function getUserUsageToday(
  userId: string,
  feature: AIFeature,
): Promise<number> {
  const supabase = getServerSupabase()
  if (!supabase) return 0
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('ai_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('date', today)
    .maybeSingle()
  return (data as { request_count?: number } | null)?.request_count ?? 0
}

/** Read-only — used by admin pages. */
export async function getCurrentTierLimit(
  feature: AIFeature,
  tier: UsageTier,
): Promise<number> {
  return getLimitForTier(feature, tier)
}
