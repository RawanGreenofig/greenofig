import React, { useState } from 'react'
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  Utensils,
  Dumbbell,
  TrendingUp,
  Calendar,
  MessageSquare,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Crown,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import Logo from './Logo'
import FloatingAIChat from '@/components/features/FloatingAIChat'
import { signOut } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

const mainNavItems = [
  { href: '/app/dashboard', icon: LayoutDashboard, label: 'sidebar.dashboard' },
  { href: '/app/ai-coach', icon: Bot, label: 'sidebar.aiCoach' },
  { href: '/app/nutrition', icon: Utensils, label: 'sidebar.nutrition' },
  { href: '/app/fitness', icon: Dumbbell, label: 'sidebar.fitness' },
  { href: '/app/progress', icon: TrendingUp, label: 'sidebar.progress' },
  { href: '/app/appointments', icon: Calendar, label: 'sidebar.appointments' },
  { href: '/app/messages', icon: MessageSquare, label: 'sidebar.messages' },
]

const bottomNavItems = [
  { href: '/app/settings', icon: Settings, label: 'sidebar.settings' },
  { href: '/app/billing', icon: CreditCard, label: 'sidebar.billing' },
  { href: '/app/support', icon: HelpCircle, label: 'sidebar.support' },
]

export function AppLayout() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { user, profile, isAuthenticated, loading, isPremium, tier } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const NavItem = ({ item, collapsed }) => {
    const isActive = location.pathname === item.href
    return (
      <Link
        to={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && <span className="text-sm font-medium">{t(item.label)}</span>}
      </Link>
    )
  }

  const SidebarContent = ({ collapsed }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('p-4', collapsed && 'px-2')}>
        <Logo showText={!collapsed} size={collapsed ? 'sm' : 'default'} linkTo="/app/dashboard" />
      </div>

      <Separator className="mb-4" />

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          <p className={cn('text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2', collapsed && 'sr-only')}>
            {t('sidebar.mainMenu')}
          </p>
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        <Separator className="my-4" />

        {/* Bottom Navigation */}
        <div className="space-y-1">
          {bottomNavItems.map((item) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Upgrade Card */}
        {!isPremium && !collapsed && (
          <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">{t('sidebar.upgrade')}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {t('popup.unlockExperience')}
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link to="/app/billing">{t('common.upgrade')}</Link>
            </Button>
          </div>
        )}
      </ScrollArea>

      <Separator className="mt-4" />

      {/* User Section */}
      <div className={cn('p-4', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>{getInitials(profile?.full_name || user?.email)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('nav.logout')}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 z-40 hidden lg:flex flex-col bg-card border-r transition-all duration-300',
          isRTL ? 'right-0 border-l border-r-0' : 'left-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent collapsed={isCollapsed} />

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border bg-background shadow-sm',
            isRTL ? '-left-3' : '-right-3'
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            isRTL ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            isRTL ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>

      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-30 lg:hidden bg-card border-b h-16 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex justify-center">
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'fixed top-0 bottom-0 z-50 w-64 bg-card border-r lg:hidden',
                isRTL ? 'right-0 border-l border-r-0' : 'left-0'
              )}
            >
              <SidebarContent collapsed={false} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          'pt-16 lg:pt-0',
          isRTL
            ? isCollapsed ? 'lg:mr-16' : 'lg:mr-64'
            : isCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between h-16 px-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      <FloatingAIChat />
    </div>
  )
}

export default AppLayout
