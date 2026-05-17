import { getServiceSupabase } from '@/lib/supabase/service'
import type { UserTier } from '@/lib/supabase/types'

/**
 * Server-side feature-gate helpers. Mirrors the customer-side
 * `usePlatformSetting` hook but for API routes — used to block requests
 * (not just hide UI) when a feature is turned off in /admin/store.
 *
 * Every helper is fail-safe: if Supabase is unreachable or the row is
 * missing, the feature is treated as ENABLED. The admin toggling a row
 * off MUST result in a row existing, so "no row" can only mean the
 * environment is misconfigured — refusing requests in that case would
 * brick the whole site on a transient blip.
 *
 * 60-second in-process cache so a busy endpoint doesn't query
 * `platform_settings` once per request. Admins toggling a flag will
 * see propagation within ~a minute, which matches the realtime debouncing
 * customers already see via the existing `usePlatformSetting` hook.
 */

interface CacheEntry {
  value: unknown
  fetchedAt: number
}

const CACHE = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

async function readSetting<T>(key: string): Promise<T | null> {
  const cached = CACHE.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value as T | null
  }
  const supabase = getServiceSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  const row = data as { value?: T } | null
  const value = row?.value ?? null
  CACHE.set(key, { value, fetchedAt: Date.now() })
  return value
}

/**
 * Returns false ONLY when the row exists and the value is the literal
 * boolean false (or {enabled: false} for object-shaped rows). Missing
 * row / missing column / Supabase error → returns true. See file
 * comment for why.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const value = await readSetting<unknown>(key)
  if (value === null || value === undefined) return true
  if (typeof value === 'boolean') return value
  if (typeof value === 'object' && value !== null && 'enabled' in value) {
    return (value as { enabled: unknown }).enabled !== false
  }
  return true
}

/**
 * Returns true when the site is in maintenance mode. Same fail-safe
 * semantics as isFeatureEnabled — a missing row / Supabase error
 * resolves to false (treated as not-in-maintenance) so a transient
 * blip doesn't lock the world out.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const value = await readSetting<unknown>('maintenance_mode')
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'object' && value !== null && 'enabled' in value) {
    return (value as { enabled: unknown }).enabled === true
  }
  return false
}

/**
 * One-shot gate for API routes that need to refuse requests when a
 * specific feature is off OR the whole site is in maintenance. Returns
 * a 503 Response when blocked, `null` when the request should proceed.
 *
 * ```ts
 * const blocked = await requireFeature('scanner_enabled')
 * if (blocked) return blocked
 * ```
 *
 * The 503 status pairs with a structured body so the client can
 * distinguish maintenance from a feature toggle and surface different
 * copy. Browsers + monitoring will retry 503s naturally, which is the
 * right behaviour for both modes — once the admin flips the toggle
 * back on, the next request succeeds.
 */
export async function requireFeature(
  key: string,
): Promise<Response | null> {
  if (await isMaintenanceMode()) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'maintenance',
          message: 'Greenofig is briefly down for maintenance. Try again shortly.',
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
  if (!(await isFeatureEnabled(key))) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'feature_disabled',
          message: 'This feature is temporarily unavailable.',
        },
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
  return null
}

/**
 * Returns the allowed-tier list for `store_enabled_tiers`. When the row
 * is missing or shaped unexpectedly, returns null — callers should treat
 * null as "no tier restriction" (every signed-in tier allowed).
 */
export async function getStoreAllowedTiers(): Promise<UserTier[] | null> {
  const value = await readSetting<unknown>('store_enabled_tiers')
  if (!Array.isArray(value)) return null
  const allowed = value.filter(
    (t): t is UserTier =>
      t === 'free' || t === 'basic' || t === 'premium' || t === 'vip',
  )
  return allowed.length ? allowed : null
}

/** Bust the cache. Called after admin writes via /api/settings/[key]. */
export function invalidateFeatureCache(key?: string): void {
  if (key) CACHE.delete(key)
  else CACHE.clear()
}
