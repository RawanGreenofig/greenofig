import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const AuthContext = createContext({})

// Demo accounts for testing different roles
export const DEMO_ACCOUNTS = {
  user: {
    email: 'user@greenofig.com',
    password: 'user123',
    profile: {
      id: 'demo-user',
      full_name: 'Demo User',
      email: 'user@greenofig.com',
      role: 'basic_user',
      tier: 'Free',
      subscription_tier: 'Free',
      is_active: true,
      community_points: 150,
    }
  },
  basic: {
    email: 'basic@greenofig.com',
    password: 'basic123',
    profile: {
      id: 'demo-basic',
      full_name: 'Basic User',
      email: 'basic@greenofig.com',
      role: 'basic_user',
      tier: 'Basic',
      subscription_tier: 'Basic',
      is_active: true,
      community_points: 500,
    }
  },
  premium: {
    email: 'premium@greenofig.com',
    password: 'premium123',
    profile: {
      id: 'demo-premium',
      full_name: 'Premium User',
      email: 'premium@greenofig.com',
      role: 'basic_user',
      tier: 'Premium',
      subscription_tier: 'Premium',
      is_active: true,
      community_points: 1200,
    }
  },
  elite: {
    email: 'elite@greenofig.com',
    password: 'elite123',
    profile: {
      id: 'demo-elite',
      full_name: 'Elite User',
      email: 'elite@greenofig.com',
      role: 'basic_user',
      tier: 'Elite',
      subscription_tier: 'Elite',
      is_active: true,
      community_points: 3000,
    }
  },
  nutritionist: {
    email: 'nutritionist@greenofig.com',
    password: 'nutri123',
    profile: {
      id: 'demo-nutritionist',
      full_name: 'Dr. Sarah Wellness',
      email: 'nutritionist@greenofig.com',
      role: 'nutritionist',
      tier: null,
      subscription_tier: null,
      is_active: true,
      specialization: 'Clinical Nutrition',
    }
  },
  admin: {
    email: 'admin@greenofig.com',
    password: 'admin123',
    profile: {
      id: 'demo-admin',
      full_name: 'Admin User',
      email: 'admin@greenofig.com',
      role: 'admin',
      tier: null,
      subscription_tier: null,
      is_active: true,
    }
  },
  superadmin: {
    email: 'superadmin@greenofig.com',
    password: 'super123',
    profile: {
      id: 'demo-superadmin',
      full_name: 'Super Admin',
      email: 'superadmin@greenofig.com',
      role: 'super_admin',
      tier: null,
      subscription_tier: null,
      is_active: true,
    }
  }
}

// Where each role lands after login / on /app
export const getHomePathForRole = (role) => {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return '/app/admin'
    case 'nutritionist':
      return '/app/nutritionist'
    default:
      return '/app/dashboard'
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId) => {
    if (!isSupabaseConfigured()) {
      // Demo mode - return mock profile
      setUserProfile({
        id: userId,
        full_name: 'Demo User',
        email: 'demo@greenofig.com',
        role: 'basic_user',
        tier: 'Base',
        subscription_tier: 'Base',
        is_active: true,
        community_points: 0,
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserProfile(session.user.id)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    // Check for demo accounts first
    const demoAccount = Object.values(DEMO_ACCOUNTS).find(
      acc => acc.email === email && acc.password === password
    )

    if (demoAccount) {
      setUser({ id: demoAccount.profile.id, email: demoAccount.email })
      setUserProfile(demoAccount.profile)
      return { error: null }
    }

    if (!isSupabaseConfigured()) {
      // Default demo mode for unknown accounts
      setUser({ id: 'demo-user', email })
      setUserProfile({
        id: 'demo-user',
        full_name: 'Demo User',
        email,
        role: 'basic_user',
        tier: 'Free',
        subscription_tier: 'Free',
        is_active: true,
        community_points: 0,
      })
      return { error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email, password, fullName) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    return { data, error }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured' } }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured()) {
      setUser(null)
      setUserProfile(null)
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setUserProfile(null)
    }
    return { error }
  }

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  // Helper functions for role/tier checks
  const isAdmin = () => {
    return userProfile?.role === 'admin' || userProfile?.role === 'super_admin'
  }

  const isSuperAdmin = () => {
    return userProfile?.role === 'super_admin'
  }

  const isNutritionist = () => {
    return userProfile?.role === 'nutritionist'
  }

  const isStaffMember = () => {
    return isAdmin() || isNutritionist()
  }

  // Tiers that should see ads: Free and Basic
  // Tiers that should NOT see ads: Premium, Elite, Staff (nutritionist, admin, super_admin)
  const shouldShowAds = () => {
    // Staff members never see ads
    if (isStaffMember()) return false

    // Premium and Elite users don't see ads
    const tier = userProfile?.tier || userProfile?.subscription_tier
    if (tier === 'Premium' || tier === 'Elite') return false

    // Free and Basic users see ads
    // Also visitors (no userProfile) see ads
    return true
  }

  const shouldShowUpgradePrompts = () => {
    // Staff members never see upgrade prompts
    if (isStaffMember()) return false

    // Premium and Elite users don't need to upgrade
    const tier = userProfile?.tier || userProfile?.subscription_tier
    if (tier === 'Premium' || tier === 'Elite') return false

    return true
  }

  const getTier = () => {
    return userProfile?.tier || userProfile?.subscription_tier || 'Free'
  }

  const getRole = () => {
    return userProfile?.role || 'visitor'
  }

  const getHomePath = () => getHomePathForRole(userProfile?.role)

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshUserProfile,
    isAuthenticated: !!user,
    // Role helpers
    isAdmin,
    isSuperAdmin,
    isNutritionist,
    isStaffMember,
    // Ad helpers
    shouldShowAds,
    shouldShowUpgradePrompts,
    getTier,
    getRole,
    getHomePath,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
