import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Dashboard from './Dashboard'
import NutritionistDashboard from './NutritionistDashboard'
import AdminDashboard from './AdminDashboard'

// Smart dashboard router that shows the appropriate dashboard based on user role
export default function DashboardRouter() {
  const { profile, loading, isAdmin, isNutritionist } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  // Admin gets admin dashboard
  if (isAdmin || profile?.role === 'admin' || profile?.role === 'super_admin') {
    return <AdminDashboard />
  }

  // Nutritionist gets nutritionist dashboard
  if (isNutritionist || profile?.role === 'nutritionist') {
    return <NutritionistDashboard />
  }

  // Regular users get the standard dashboard
  return <Dashboard />
}
