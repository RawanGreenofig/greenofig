'use client'

import { useAuth } from '@/context/AuthContext'

/**
 * Convenience read of the currently signed-in user/profile/role/tier.
 * For mutations or sign-out use `useAuth()` directly.
 */
export function useUser() {
  const { user, profile, role, tier, isLoading } = useAuth()
  return { user, profile, role, tier, isLoading }
}
