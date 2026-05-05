import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  TrendingUp,
  MessageSquare,
  Calendar,
  Bot,
  Settings,
  CreditCard,
  HelpCircle,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Users,
  FileText,
  BarChart3,
  PenSquare,
  Target,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const userNavItemsData = [
  { key: 'dashboard', path: '/app/dashboard', icon: LayoutDashboard },
  { key: 'aiCoach', path: '/app/ai-coach', icon: Bot },
  { key: 'nutrition', path: '/app/nutrition', icon: Utensils },
  { key: 'mealPlans', path: '/app/meal-plans', icon: FileText },
  { key: 'fitness', path: '/app/fitness', icon: Dumbbell },
  { key: 'progress', path: '/app/progress', icon: TrendingUp },
  { key: 'appointments', path: '/app/appointments', icon: Calendar },
  { key: 'messages', path: '/app/messages', icon: MessageSquare },
]

const nutritionistNavItemsData = [
  { key: 'dashboard', path: '/app/nutritionist', icon: LayoutDashboard },
  { key: 'clients', path: '/app/nutritionist/clients', icon: Users },
  { key: 'mealPlans', path: '/app/nutritionist/meal-plans', icon: Utensils },
  { key: 'schedule', path: '/app/nutritionist/schedule', icon: Calendar },
  { key: 'messages', path: '/app/nutritionist/messages', icon: MessageSquare },
  { key: 'blog', path: '/app/nutritionist/blog', icon: PenSquare },
]

// Regular admin items (no settings)
const adminNavItemsData = [
  { key: 'dashboard', path: '/app/admin', icon: LayoutDashboard },
  { key: 'users', path: '/app/admin/users', icon: Users },
  { key: 'leads', path: '/app/admin/leads', icon: Target },
  { key: 'content', path: '/app/admin/content', icon: FileText },
  { key: 'support', path: '/app/admin/support', icon: HelpCircle },
]

// Super admin gets all controls
const superAdminNavItemsData = [
  { key: 'dashboard', path: '/app/admin', icon: LayoutDashboard },
  { key: 'users', path: '/app/admin/users', icon: Users },
  { key: 'leads', path: '/app/admin/leads', icon: Target },
  { key: 'subscriptions', path: '/app/admin/subscriptions', icon: CreditCard },
  { key: 'analytics', path: '/app/admin/analytics', icon: BarChart3 },
  { key: 'content', path: '/app/admin/content', icon: FileText },
  { key: 'support', path: '/app/admin/support', icon: HelpCircle },
  { key: 'settings', path: '/app/admin/settings', icon: Settings },
]

const customerBottomNavItemsData = [
  { key: 'billing', path: '/app/billing', icon: CreditCard },
  { key: 'support', path: '/app/support', icon: HelpCircle },
  { key: 'settings', path: '/app/settings', icon: Settings },
]

const staffBottomNavItemsData = [
  { key: 'support', path: '/app/support', icon: HelpCircle },
  { key: 'settings', path: '/app/settings', icon: Settings },
]

export function AppLayout() {
  const { t } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userProfile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const mapNavItems = (items) => items.map(item => ({
    ...item,
    name: t(`appNav.${item.key}`)
  }))

  const getNavItems = () => {
    if (!userProfile) return mapNavItems(userNavItemsData)
    switch (userProfile.role) {
      case 'super_admin':
        return mapNavItems(superAdminNavItemsData)
      case 'admin':
        return mapNavItems(adminNavItemsData)
      case 'nutritionist':
        return mapNavItems(nutritionistNavItemsData)
      default:
        return mapNavItems(userNavItemsData)
    }
  }

  const isStaff = ['nutritionist', 'admin', 'super_admin'].includes(userProfile?.role)
  const navItems = getNavItems()
  const bottomNavItems = mapNavItems(isStaff ? staffBottomNavItemsData : customerBottomNavItemsData)

  const roleLabel = (() => {
    switch (userProfile?.role) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'nutritionist': return 'Nutritionist'
      default: return null
    }
  })()

  const Sidebar = ({ mobile = false }) => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r border-border",
      mobile ? "w-full" : sidebarCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {(!sidebarCollapsed || mobile) && (
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="GreenoFig" className="h-8 w-auto" />
          </Link>
        )}
        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </Button>
        )}
      </div>

      {/* User info */}
      <div className={cn("p-4 border-b border-border", sidebarCollapsed && !mobile && "px-2")}>
        <div className={cn("flex items-center", sidebarCollapsed && !mobile ? "justify-center" : "space-x-3")}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.profile_picture_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {userProfile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {(!sidebarCollapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userProfile?.full_name || 'User'}</p>
              {isStaff ? (
                <Badge variant="outline" className="text-xs">{roleLabel}</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {userProfile?.tier || 'Free'}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => mobile && setSidebarOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg transition-colors",
                    sidebarCollapsed && !mobile ? "justify-center p-3" : "px-3 py-2 space-x-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {(!sidebarCollapsed || mobile) && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom navigation */}
      <div className="p-2 border-t border-border">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => mobile && setSidebarOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg transition-colors",
                    sidebarCollapsed && !mobile ? "justify-center p-3" : "px-3 py-2 space-x-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {(!sidebarCollapsed || mobile) && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              onClick={handleSignOut}
              className={cn(
                "w-full flex items-center rounded-lg transition-colors text-destructive hover:bg-destructive/10",
                sidebarCollapsed && !mobile ? "justify-center p-3" : "px-3 py-2 space-x-3"
              )}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {(!sidebarCollapsed || mobile) && (
                <span className="text-sm font-medium">{t('appNav.logOut')}</span>
              )}
            </button>
          </li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden"
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="GreenoFig" className="h-8 w-auto" />
          </Link>
          <Avatar className="h-8 w-8">
            <AvatarImage src={userProfile?.profile_picture_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {userProfile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
