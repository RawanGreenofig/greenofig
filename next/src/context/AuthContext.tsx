'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

/* ── localStorage cache ────────────────────────────────────────
 * Tier is persisted across reloads so the first render of any
 * page already knows the user's level. Without this, the dashboard
 * renders `free` chrome on every cold load while the profile fetch
 * is in flight, then flips to `premium` once the fetch resolves —
 * visible as a flicker. TTL is 1h. Cleared on sign-out. */
const TIER_KEY = 'gf_tier'
const TIER_TS_KEY = 'gf_tier_ts'
const TIER_TTL_MS = 60 * 60 * 1000

function readCachedTier(): UserTier | null {
  if (typeof window === 'undefined') return null
  try {
    const tier = window.localStorage.getItem(TIER_KEY)
    const ts = window.localStorage.getItem(TIER_TS_KEY)
    if (!tier || !ts) return null
    const age = Date.now() - Number(ts)
    if (Number.isNaN(age) || age >= TIER_TTL_MS) return null
    if (tier !== 'free' && tier !== 'basic' && tier !== 'premium' && tier !== 'vip') {
      return null
    }
    return tier as UserTier
  } catch {
    return null
  }
}

function writeCachedTier(tier: UserTier): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TIER_KEY, tier)
    window.localStorage.setItem(TIER_TS_KEY, String(Date.now()))
  } catch {
    /* private mode / quota — fine */
  }
}

function clearCachedTier(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TIER_KEY)
    window.localStorage.removeItem(TIER_TS_KEY)
  } catch {
    /* fine */
  }
}

/**
 * AuthProvider — tier-flicker hardened
 *
 * Three layers of protection against the dashboard flashing `free` to
 * a paying user:
 *
 *   1. localStorage cache. The very first render reads the last-known
 *      tier from localStorage, so a paying user never sees `free`
 *      chrome between page load and profile fetch.
 *   2. Never-downgrade rule. Any incoming tier ranked LOWER than the
 *      currently-applied tier is treated as a stale read and ignored.
 *      Real downgrades (cancellation) take effect on next page load.
 *   3. Single refetch trigger. Only mount + Supabase auth events
 *      (SIGNED_IN / TOKEN_REFRESHED / SIGNED_OUT) fire a refetch.
 *      No focus / visibilitychange / pathname listeners — those were
 *      the multipliers turning one stale read into a visible flicker.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Tier lives separately from profile so we can seed it from
  // localStorage before any network round-trip. Reading from cache
  // inside the initializer keeps the first render synchronous.
  const [tier, setTier] = useState<UserTier | null>(() => readCachedTier())
  const [isLoading, setIsLoading] = useState<boolean>(!!supabase)

  const applyTier = useCallback((incoming: UserTier) => {
    setTier((current) => {
      const currentRank = current ? TIER_RANK[current] : -1
      const incomingRank = TIER_RANK[incoming]
      // Never downgrade mid-session.
      if (incomingRank < currentRank) return current
      // Persist whenever we accept a write so the next page load
      // already has it.
      writeCachedTier(incoming)
      return incoming
    })
  }, [])

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
      setProfile(next)
      applyTier((next.tier ?? 'free') as UserTier)
    },
    [supabase, applyTier],
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
      setTier(null)
      clearCachedTier()
    }
    setIsLoading(false)
  }, [supabase, fetchAndApplyProfile])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    void refresh()

    // ONLY refetch on auth state transitions — never on focus or
    // visibilitychange or route change.
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        setSession(nextSession)
        if (event === 'SIGNED_OUT' || !nextSession?.user) {
          setProfile(null)
          setTier(null)
          clearCachedTier()
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
    // Sign out at Supabase + scope=local also wipes the localStorage
    // session so the next page render can't read it back. Without this,
    // some setups left the cookie behind and the user appeared "signed
    // back in" on the next protected page.
    await supabase.auth.signOut({ scope: 'local' })
    setSession(null)
    setProfile(null)
    setTier(null)
    clearCachedTier()
    // Hard-redirect to the marketing home so the middleware sees no
    // cookie and protected components don't try to render with stale
    // state during the React unmount.
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      role: profile?.role ?? null,
      // Prefer the dedicated tier state (which is seeded from cache
      // and rank-guarded). Fall back to whatever the profile carries
      // for the brief window between fetch and the applyTier write.
      tier: tier ?? profile?.tier ?? null,
      isLoading,
      signOut,
      refresh,
    }),
    [session, profile, tier, isLoading, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
