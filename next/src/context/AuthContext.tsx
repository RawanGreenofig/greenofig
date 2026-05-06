'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getBrowserSupabase } from '@/lib/supabase/client'
import type { Profile, UserRole, UserTier } from '@/lib/supabase/types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: UserRole | null
  tier: UserTier | null
  isLoading: boolean
  signOut: () => Promise<void>
  /** Force-refetch the profile. Used by callers that just performed
   *  an action they expect to change the tier (e.g. returning from
   *  Stripe checkout with ?upgraded=1). */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TIER_RANK: Record<UserTier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  vip: 3,
}

/**
 * AuthProvider tier-flicker guard
 * --------------------------------
 * The dashboard reads `tier` to decide whether to show premium UI. The
 * Stripe webhook updates the row a few hundred ms after the user lands
 * back on the app, so the FIRST profile fetch can come back as `free`
 * before the webhook has written `premium`. Without protection, the
 * dashboard renders `free` chrome, then `premium` chrome a moment later
 * — visible as a flash of the upgrade card.
 *
 * The fix is a `tierRef` + a "never downgrade mid-session" rule: any
 * fetch whose tier ranks LOWER than the cached tier is treated as a
 * stale read and ignored. Real downgrades (cancellation) take effect
 * on next page load. We also drop the visibilitychange / focus /
 * route-change refetch listeners — those were the multipliers that
 * turned a single stale read into a flicker every time the user
 * tabbed in or navigated.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(!!supabase)

  // Cached tier — survives across renders, lets us reject stale reads.
  const tierRef = useRef<UserTier | null>(null)

  const fetchAndApplyProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      const next = (data as Profile | null) ?? null
      if (!next) return

      const incoming = (next.tier ?? 'free') as UserTier
      const current = (tierRef.current ?? 'free') as UserTier

      // Never downgrade mid-session. A stale read landing as 'free'
      // when we've already cached 'premium' would otherwise wipe the
      // user's premium UI for one render cycle.
      if (TIER_RANK[incoming] < TIER_RANK[current]) {
        return
      }

      tierRef.current = incoming
      setProfile(next)
    },
    [supabase],
  )

  const refresh = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    if (data.session?.user) {
      await fetchAndApplyProfile(data.session.user.id)
    } else {
      setProfile(null)
      tierRef.current = null
    }
    setIsLoading(false)
  }, [supabase, fetchAndApplyProfile])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    void refresh()

    // ONLY refetch on auth state transitions. No focus / visibility /
    // pathname listeners — those were the source of the flicker.
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        setSession(nextSession)
        if (event === 'SIGNED_OUT' || !nextSession?.user) {
          setProfile(null)
          tierRef.current = null
          return
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchAndApplyProfile(nextSession.user.id)
        }
      },
    )

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [supabase, refresh, fetchAndApplyProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    tierRef.current = null
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      role: profile?.role ?? null,
      tier: profile?.tier ?? null,
      isLoading,
      signOut,
      refresh,
    }),
    [session, profile, isLoading, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
