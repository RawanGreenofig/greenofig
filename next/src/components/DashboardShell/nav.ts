import {
  Sun,
  Camera,
  BookOpen,
  Target,
  Lightbulb,
  ChefHat,
  Heart,
  MessageSquare,
  ShoppingBag,
  Package,
  Calendar,
  Settings,
  Users,
  PenLine,
  Microscope,
  TrendingUp,
  Wallet,
  LayoutDashboard,
  Flag,
  Key,
  Wrench,
  Database,
  ShieldCheck,
  Bell,
  AlertOctagon,
  Bot,
  type LucideIcon,
} from 'lucide-react'
import type { Tier } from '@/lib/constants'

export interface DashboardNavItem {
  /** URL path the link points to. */
  href: string
  /** Fully qualified i18n message path (e.g. `dashboard.tabs.today`). */
  labelKey: string
  Icon: LucideIcon
  /** Tier gate hint — display the lock state when user is below this set. */
  tiers?: Tier[]
}

/** User-role sidebar. Order matters — first 5 power the mobile bottom bar. */
export const USER_NAV: DashboardNavItem[] = [
  { href: '/dashboard',           labelKey: 'dashboard.tabs.today',     Icon: Sun },
  { href: '/dashboard/scanner',   labelKey: 'dashboard.tabs.scanner',   Icon: Camera,    tiers: ['free', 'basic', 'premium', 'vip'] },
  { href: '/dashboard/track',     labelKey: 'dashboard.tabs.track',     Icon: BookOpen,  tiers: ['basic', 'premium', 'vip'] },
  { href: '/dashboard/progress',  labelKey: 'dashboard.tabs.progress',  Icon: Target,    tiers: ['basic', 'premium', 'vip'] },
  { href: '/dashboard/meal-plan', labelKey: 'dashboard.tabs.mealPlan',  Icon: Lightbulb, tiers: ['premium', 'vip'] },
  { href: '/dashboard/recipes',   labelKey: 'dashboard.tabs.recipes',   Icon: ChefHat,   tiers: ['basic', 'premium', 'vip'] },
  { href: '/dashboard/community', labelKey: 'dashboard.tabs.community', Icon: Heart },
  { href: '/dashboard/messages',  labelKey: 'dashboard.tabs.messages',  Icon: MessageSquare, tiers: ['vip'] },
  { href: '/dashboard/store',     labelKey: 'dashboard.tabs.store',     Icon: ShoppingBag },
  { href: '/dashboard/orders',    labelKey: 'dashboard.tabs.orders',    Icon: Package },
  { href: '/dashboard/bookings',  labelKey: 'dashboard.tabs.bookings',  Icon: Calendar },
  { href: '/dashboard/settings',  labelKey: 'dashboard.tabs.settings',  Icon: Settings },
]

/** Nutritionist-role sidebar. */
export const NUTRITIONIST_NAV: DashboardNavItem[] = [
  { href: '/nutritionist',                 labelKey: 'nutritionist.today',           Icon: Sun },
  { href: '/nutritionist/clients',         labelKey: 'nutritionist.myClients',       Icon: Users },
  { href: '/nutritionist/meal-plans',      labelKey: 'nutritionist.mealPlanBuilder', Icon: Lightbulb },
  { href: '/nutritionist/recipes',         labelKey: 'nutritionist.recipeBuilder',   Icon: ChefHat },
  { href: '/nutritionist/content',         labelKey: 'nutritionist.content',         Icon: PenLine },
  { href: '/nutritionist/calendar',        labelKey: 'nutritionist.calendar',        Icon: Calendar },
  { href: '/nutritionist/messages',        labelKey: 'nutritionist.messages',        Icon: MessageSquare },
  { href: '/nutritionist/store',           labelKey: 'nutritionist.storeCuration',   Icon: ShoppingBag },
  { href: '/nutritionist/research',        labelKey: 'nutritionist.research',        Icon: Microscope },
  { href: '/nutritionist/analytics',       labelKey: 'nutritionist.analytics',       Icon: TrendingUp },
  { href: '/nutritionist/earnings',        labelKey: 'nutritionist.earnings',        Icon: Wallet },
  { href: '/nutritionist/settings',        labelKey: 'nutritionist.settings',        Icon: Settings },
]

export const NUTRITIONIST_MOBILE_TABS: DashboardNavItem[] = [
  NUTRITIONIST_NAV[0],  // Today
  NUTRITIONIST_NAV[1],  // Clients
  NUTRITIONIST_NAV[5],  // Calendar
  NUTRITIONIST_NAV[6],  // Messages
]
export const NUTRITIONIST_MOBILE_FAB = NUTRITIONIST_NAV[2] // Meal plan builder — center FAB

/** Admin-role sidebar. */
export const ADMIN_NAV: DashboardNavItem[] = [
  { href: '/admin',                labelKey: 'admin.overview',     Icon: LayoutDashboard },
  { href: '/admin/users',          labelKey: 'admin.users',        Icon: Users },
  { href: '/admin/store',          labelKey: 'admin.store',        Icon: ShoppingBag },
  { href: '/admin/orders',         labelKey: 'admin.orders',       Icon: Package },
  { href: '/admin/bookings',       labelKey: 'admin.bookings',     Icon: Calendar },
  { href: '/admin/content',        labelKey: 'admin.content',      Icon: PenLine },
  { href: '/admin/moderation',     labelKey: 'admin.moderation',   Icon: AlertOctagon },
  { href: '/admin/analytics',      labelKey: 'admin.analytics',    Icon: TrendingUp },
  { href: '/admin/notifications',  labelKey: 'admin.notifications', Icon: Bell },
  { href: '/admin/feature-flags',  labelKey: 'admin.featureFlags', Icon: Flag },
  { href: '/admin/api-keys',       labelKey: 'admin.apiKeys',      Icon: Key },
  { href: '/admin/site-editor',    labelKey: 'admin.siteEditor',   Icon: Wrench },
  { href: '/admin/audit-log',      labelKey: 'admin.auditLog',     Icon: ShieldCheck },
  { href: '/admin/data-export',    labelKey: 'admin.dataExport',   Icon: Database },
  { href: '/admin/openclaw',       labelKey: 'admin.openclaw',     Icon: Bot },
  { href: '/admin/settings',       labelKey: 'admin.settings',     Icon: Settings },
]

export const ADMIN_MOBILE_TABS: DashboardNavItem[] = [
  ADMIN_NAV[0],  // Overview
  ADMIN_NAV[1],  // Users
  ADMIN_NAV[7],  // Analytics
  ADMIN_NAV[6],  // Moderation
]
export const ADMIN_MOBILE_FAB = ADMIN_NAV[5] // Content — center FAB

/** Top-level mobile tabs (4 + FAB). Picked from USER_NAV. */
export const USER_MOBILE_TABS: DashboardNavItem[] = [
  USER_NAV[0],  // Today
  USER_NAV[2],  // Track
  USER_NAV[3],  // Progress
  USER_NAV[6],  // Community
]
export const USER_MOBILE_FAB = USER_NAV[1] // Scanner — center FAB
