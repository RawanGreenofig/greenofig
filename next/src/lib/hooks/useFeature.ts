'use client'

import { useEffect, useRef, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import type { FeatureFlagRow, UserTier } from '@/lib/supabase/types'
import type { FeatureFlag } from '@/lib/constants'
import { useUser } from './useUser'

interface FeatureCacheEntry {
  flag: FeatureFlagRow | null
  fetchedAt: number
}

const CACHE: Map<string, FeatureCacheEntry> = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Returns whether the given feature is enabled for the current user.
 *
 * Truth source: `feature_flags` table — checked against:
 *   1. `is_globally_enabled` (kill switch)
 *   2. `enabled_for_tiers` includes the user's tier
 *
 * Cached for 5 minutes per feature name so dashboards don't refetch
 * the same row from every island.
 */
export function useFeature(feature: FeatureFlag) {
  const { tier } = useUser()
  const [isEnabled, setIsEnabled] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = getBrowserSupabase()
      if (!supabase) {
        if (!cancelled) {
          setIsEnabled(false)
          setIsLoading(false)
        }
        return
      }

      const cached = CACHE.get(feature)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        if (!cancelled) {
          setIsEnabled(checkAccess(cached.flag, tier))
          setIsLoading(false)
        }
        return
      }

      const { data } = await supabase
        .from('feature_flags')
        .select('feature, enabled_for_tiers, is_globally_enabled, description')
        .eq('feature', feature)
        .maybeSingle()

      const flag = (data as FeatureFlagRow | null) ?? null
      CACHE.set(feature, { flag, fetchedAt: Date.now() })

      if (!cancelled) {
        setIsEnabled(checkAccess(flag, tier))
        setIsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [feature, tier])

  return { isEnabled, isLoading }
}

function checkAccess(flag: FeatureFlagRow | null, tier: UserTier | null): boolean {
  if (!flag) return false
  if (!flag.is_globally_enabled) return false
  if (!tier) return false
  return flag.enabled_for_tiers.includes(tier)
}
