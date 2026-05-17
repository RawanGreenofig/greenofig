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
 * Tier AND chrome-profile fields are persisted across reloads so the
 * first render of any page already has the right role/tier/name. Without
 * this the dashboard renders `free` + 'Guest' + empty role pill on every
 * cold load while the profile fetch is in flight, then flips to the real
 * values once the fetch resolves — visible as a flicker, or worse on slow
 * networks an apparently-stuck "Guest/free" admin chrome. TTL is 1h.
 * Cleared on sign-out. */
const TIER_KEY = 'gf_tier'
const TIER_TS_KEY = 'gf_tier_ts'
const CHROME_KEY = 'gf_chrome'
const CHROME_TS_KEY = 'gf_chrome_ts'
const TIER_TTL_MS = 60 * 60 * 1000

/** The subset of Profile fields the chrome (sidebar/topbar) reads on
 *  first render. Persisted to localStorage so a returning user never
 *  sees the empty-chrome flash. */
export interface ChromeProfile {
  role: UserRole
  tier: UserTier
  full_name: string | null
  avatar_url: string | null
}

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

function readCachedChrome(): ChromeProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CHROME_KEY)
    const ts = window.localStorage.getItem(CHROME_TS_KEY)
    if (!raw || !ts) return null
    const age = Date.now() - Number(ts)
    if (Number.isNaN(age) || age >= TIER_TTL_MS) return null
    const parsed = JSON.parse(raw) as Partial<ChromeProfile>
    if (
      !parsed.role ||
      !['user', 'nutritionist', 'admin'].includes(parsed.role) ||
      !parsed.tier ||
      !['free', 'basic', 'premium', 'vip'].includes(parsed.tier)
    ) {
      return null
    }
    return {
      role: parsed.role as UserRole,
      tier: parsed.tier as UserTier,
      full_name: parsed.full_name ?? null,
      avatar_url: parsed.avatar_url ?? null,
    }
  } catch {
    return null
  }
}

function writeCachedChrome(c: ChromeProfile): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CHROME_KEY, JSON.stringify(c))
    window.localStorage.setItem(CHROME_TS_KEY, String(Date.now()))
  } catch {
    /* private mode / quota — fine */
  }
}

function clearCachedTier(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TIER_KEY)
    window.localStorage.removeItem(TIER_TS_KEY)
    window.localStorage.removeItem(CHROME_KEY)
    window.localStorage.removeItem(CHROME_TS_KEY)
  } catch {
    /* fine */
  }
}

/* ── DEV-ONLY: localhost admin shim ────────────────────────────────
 * Mirrors the middleware + requireRole bypass so the chrome (sidebar
 * avatar / topbar plan badge / role pill) reads as "Admin" instead of
 * the "Guest FREE" fallback that appears with no session.
 * Hard-gated on:
 *   • NODE_ENV !== 'production'
 *   • hostname: localhost / 127.0.0.1
 * Cannot leak into deployed environments.
 * TODO(role-bypass): revisit once admin-styling pass is complete.
 */
function isLocalDev(): boolean {
  if (typeof window === 'undefined') return false
  if (process.env.NODE_ENV === 'production') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

const DEV_ADMIN_PROFILE: Profile = {
  id: 'dev-admin',
  role: 'admin',
  tier: 'vip',
  full_name: 'Greenofig Admin',
  avatar_url: null,
  phone: null,
  date_of_birth: null,
  gender: null,
  height_cm: null,
  weight_kg: null,
  target_weight_kg: null,
  target_calories: null,
  target_protein_g: null,
  target_carbs_g: null,
  target_fat_g: null,
  dietary_preferences: null,
  allergies: null,
  health_conditions: null,
  activity_level: null,
  primary_goal: null,
  medical_notes: null,
  preferred_locale: 'en',
  is_active: true,
  last_seen_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
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
  // Seed `profile` from the cached chrome snapshot on the very first
  // render. That gives the sidebar/topbar the right role + display
  // name on cold load — otherwise an admin sees the "Guest / empty
  // role pill" chrome until the profiles fetch returns, and on slow
  // networks that can look stuck. The cache is partial (chrome fields
  // only) so it gets replaced by the full Profile once the fetch
  // completes.
  const [profile, setProfile] = useState<Profile | null>(() => {
    const c = readCachedChrome()
    if (!c) return null
    // Build a Profile-shaped object from the cached chrome fields.
    // Other Profile columns are filled in by the real fetch.
    return {
      id: '',
      role: c.role,
      tier: c.tier,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      phone: null,
      date_of_birth: null,
      gender: null,
      height_cm: null,
      weight_kg: null,
      target_weight_kg: null,
      target_calories: null,
      target_protein_g: null,
      target_carbs_g: null,
      target_fat_g: null,
      dietary_preferences: null,
      allergies: null,
      health_conditions: null,
      activity_level: null,
      primary_goal: null,
      medical_notes: null,
      preferred_locale: 'en',
      is_active: true,
      last_seen_at: null,
      created_at: '',
      updated_at: '',
    } as Profile
  })
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
      // Refresh the chrome cache so the next cold load already has
      // the right role/tier/name without waiting on this fetch.
      writeCachedChrome({
        role: next.role,
        tier: (next.tier ?? 'free') as UserTier,
        full_name: next.full_name,
        avatar_url: next.avatar_url,
      })
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
        if (event === 'SIGNED_IN') {
          // New sign-in → drop any cached tier from a prior user
          // before fetching the new profile. Otherwise the
          // never-downgrade rule in applyTier holds onto the
          // previous account's tier (e.g. previous user was VIP
          // → admin signs in but UI still reads 'vip' from cache).
          setTier(null)
          clearCachedTier()
          await fetchAndApplyProfile(nextSession.user.id)
        }
        if (event === 'TOKEN_REFRESHED') {
          await fetchAndApplyProfile(nextSession.user.id)
        }
        // INITIAL_SESSION fires when Supabase restores a session from
        // storage on a fresh app open. Without re-fetching the profile
        // here, the cached tier from a previous session is the only
        // thing the UI sees — and if it's stale (e.g. user was Free
        // last time, was upgraded to VIP server-side, now reopens the
        // app), the dashboard paints the old tier. The never-downgrade
        // rule in applyTier still protects against flicker.
        if (event === 'INITIAL_SESSION') {
          await fetchAndApplyProfile(nextSession.user.id)
        }
      },
    )

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [supabase, refresh, fetchAndApplyProfile])

  const signOut = useCallback(async () => {
    // The redirect must run even if anything below throws or HANGS —
    // otherwise the user gets "stuck" with React state showing them as
    // still signed in. Two paths in parallel:
    //
    //   1. POST /api/auth/signout — server route that emits proper
    //      Set-Cookie headers expiring every sb-* cookie, including
    //      HttpOnly ones that document.cookie can't touch. This is
    //      what makes the sign-out actually stick on Capacitor +
    //      cookie-stored sessions; without it the cookies survive
    //      and supabase rehydrates the session on next load.
    //   2. supabase.auth.signOut() — clears the in-memory client +
    //      kicks the SIGNED_OUT event so React state matches.
    //
    // Both raced against a 3s timeout so a network hang doesn't
    // strand the user on a "signing out…" state.
    try {
      const serverEndpoint = fetch('/api/auth/signout', { method: 'POST' })
        .catch(() => undefined)
      const clientSignOut = supabase
        ? supabase.auth.signOut({ scope: 'global' }).catch(() => undefined)
        : Promise.resolve(undefined)
      await Promise.race([
        Promise.all([serverEndpoint, clientSignOut]),
        new Promise<void>((resolve) =>
          window.setTimeout(() => resolve(), 3000),
        ),
      ])
    } catch {
      /* fall through — local cleanup + redirect still happen */
    }
    // Clear all local React + cached state.
    setSession(null)
    setProfile(null)
    setTier(null)
    clearCachedTier()
    // Wipe every supabase persistence vector. supabase-js writes to
    // localStorage AND @supabase/ssr writes auth cookies — leaving
    // cookies behind let the session resurrect on the next page
    // load, which is exactly what was producing the "auto sign-in"
    // as the wrong tier.
    if (typeof window !== 'undefined') {
      // localStorage
      try {
        for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
          const k = window.localStorage.key(i)
          if (k && k.startsWith('sb-')) window.localStorage.removeItem(k)
        }
      } catch { /* private mode / disabled — fine */ }
      // sessionStorage (rare but documented in supabase storage adapter)
      try {
        for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
          const k = window.sessionStorage.key(i)
          if (k && k.startsWith('sb-')) window.sessionStorage.removeItem(k)
        }
      } catch { /* same */ }
      // cookies — @supabase/ssr's default storage. Clear by setting
      // each sb-* cookie to expire in the past on every path/domain
      // combination that's plausible.
      try {
        const cookies = document.cookie.split('; ')
        const host = window.location.hostname
        for (const raw of cookies) {
          const name = raw.split('=')[0]
          if (!name?.startsWith('sb-')) continue
          const expire = 'Thu, 01 Jan 1970 00:00:00 GMT'
          // Plain
          document.cookie = `${name}=; expires=${expire}; path=/`
          // Locked to current host
          document.cookie = `${name}=; expires=${expire}; path=/; domain=${host}`
          // Locked to parent host (e.g. .greenofig.com)
          const parts = host.split('.')
          if (parts.length > 2) {
            const parent = '.' + parts.slice(-2).join('.')
            document.cookie = `${name}=; expires=${expire}; path=/; domain=${parent}`
          }
        }
      } catch { /* document.cookie may be unavailable in some webviews */ }
      // Hard-redirect to the marketing home so the middleware sees no
      // cookie and no protected component lingers in memory.
      window.location.href = '/'
    }
  }, [supabase])

  const value = useMemo<AuthContextValue>(
    () => {
      // Localhost dev with no real session → return a fake admin
      // profile so the chrome reads as Admin/VIP instead of Guest/FREE.
      if (!session && !isLoading && isLocalDev()) {
        return {
          user: null,
          session: null,
          profile: DEV_ADMIN_PROFILE,
          role: DEV_ADMIN_PROFILE.role,
          tier: DEV_ADMIN_PROFILE.tier,
          isLoading: false,
          signOut,
          refresh,
        }
      }
      return {
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
      }
    },
    [session, profile, tier, isLoading, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
