import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, fetchProfile, fetchSubscription } from '@/lib/supabase'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadUserData(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadUserData(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setSubscription(null)
        }
        setLoading(false)
      }
    )

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [])

  const loadUserData = async (userId) => {
    try {
      const [profileResult, subscriptionResult] = await Promise.all([
        fetchProfile(userId),
        fetchSubscription(userId),
      ])

      if (profileResult.data) {
        setProfile(profileResult.data)
      }

      if (subscriptionResult.data) {
        setSubscription(subscriptionResult.data)
      }
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (user?.id) {
      await loadUserData(user.id)
    }
  }

  const isAuthenticated = !!user
  const isAdmin = profile?.role === 'admin'
  const isNutritionist = profile?.role === 'nutritionist'
  const isPremium = subscription?.tier && subscription.tier !== 'base'
  const tier = subscription?.tier || 'base'

  const value = {
    user,
    profile,
    subscription,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isNutritionist,
    isPremium,
    tier,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
