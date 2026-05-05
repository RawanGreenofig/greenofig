import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin, isNutritionist, isSuperAdmin } from '@/lib/rbac'

// Lazy load dashboards for better performance
const UserDashboard = React.lazy(() => import('@/pages/UserDashboard'))
const NutritionistPanel = React.lazy(() => import('@/pages/NutritionistPanel'))
const AdminPanel = React.lazy(() => import('@/pages/AdminPanel'))

/**
 * DashboardRouter - Role-based dashboard routing component
 *
 * Routes users to the appropriate dashboard based on their role:
 * - super_admin / admin -> AdminPanel with 17 tabs
 * - nutritionist -> NutritionistPanel with 12 tabs
 * - user / default -> UserDashboard with tier-based features
 */
export default function DashboardRouter() {
  const { profile, loading } = useAuth()

  // Show loading state while fetching user profile
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  // Create user object for role checks
  const user = { role: profile?.role }

  // Route to appropriate dashboard based on role
  if (isAdmin(user) || isSuperAdmin(user)) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner h-8 w-8" />
          </div>
        }
      >
        <AdminPanel />
      </React.Suspense>
    )
  }

  if (isNutritionist(user)) {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner h-8 w-8" />
          </div>
        }
      >
        <NutritionistPanel />
      </React.Suspense>
    )
  }

  // Default: Regular user dashboard
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="spinner h-8 w-8" />
        </div>
      }
    >
      <UserDashboard />
    </React.Suspense>
  )
}
