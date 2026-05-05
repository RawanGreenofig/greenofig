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
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(!!supabase)

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return null
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      return (data as Profile | null) ?? null
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
      setProfile(await fetchProfile(data.session.user.id))
    } else {
      setProfile(null)
    }
    setIsLoading(false)
  }, [supabase, fetchProfile])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }
    void refresh()

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession)
        if (nextSession?.user) {
          setProfile(await fetchProfile(nextSession.user.id))
        } else {
          setProfile(null)
        }
      },
    )
    return () => sub.subscription.unsubscribe()
  }, [supabase, refresh, fetchProfile])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
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
