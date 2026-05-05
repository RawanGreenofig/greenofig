// Role-Based Access Control (RBAC) for GreenoFig

export const ROLES = {
  super_admin: 'super_admin',
  admin: 'admin',
  nutritionist: 'nutritionist',
  user: 'user',
}

export const PERMISSIONS = {
  // Admin tabs permissions
  dashboard: ['super_admin', 'admin'],
  'tier-preview': ['super_admin'],
  analytics: ['super_admin', 'admin'],
  revenue: ['super_admin', 'admin'],
  errors: ['super_admin', 'admin'],
  customers: ['super_admin', 'admin'],
  subscriptions: ['super_admin', 'admin'],
  payments: ['super_admin', 'admin'],
  coupons: ['super_admin', 'admin'],
  referrals: ['super_admin', 'admin'],
  issues: ['super_admin', 'admin'],
  messaging: ['super_admin', 'admin'],
  blog: ['super_admin', 'admin', 'nutritionist'],
  website: ['super_admin', 'admin'],
  ads: ['super_admin', 'admin'],
  'ai-coach': ['super_admin', 'admin'],
  studio: ['super_admin'],
}

export const isAdmin = (user) => {
  return user?.role === 'super_admin' || user?.role === 'admin'
}

export const isSuperAdmin = (user) => {
  return user?.role === 'super_admin'
}

export const isNutritionist = (user) => {
  return user?.role === 'nutritionist'
}

export const hasPermission = (user, permission) => {
  if (!user || !user.role) return false
  const allowedRoles = PERMISSIONS[permission] || []
  return allowedRoles.includes(user.role)
}

export const getAccessibleTabs = (user, allTabs) => {
  if (!user || !user.role) return []
  return allTabs.filter(tab => hasPermission(user, tab.id))
}

export const getRoleBadgeVariant = (role) => {
  switch (role) {
    case 'super_admin':
      return 'destructive'
    case 'admin':
      return 'default'
    case 'nutritionist':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const getRoleLabel = (role) => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin'
    case 'admin':
      return 'Admin'
    case 'nutritionist':
      return 'Nutritionist'
    case 'user':
      return 'User'
    default:
      return role
  }
}
