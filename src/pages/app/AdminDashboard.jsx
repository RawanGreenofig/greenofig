import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Users,
  UserCog,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Settings,
  FileText,
  Shield,
  Database,
  Globe,
  Mail,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalNutritionists: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    newUsersToday: 0,
    pendingApprovals: 0,
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch total users count
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')

      // Fetch total nutritionists count
      const { count: nutritionistsCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'nutritionist')

      // Fetch active subscriptions
      const { count: subscriptionsCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Fetch recent users
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalUsers: usersCount || 0,
        totalNutritionists: nutritionistsCount || 0,
        totalRevenue: 12450, // This would come from payments table
        activeSubscriptions: subscriptionsCount || 0,
        newUsersToday: 12,
        pendingApprovals: 3,
      })

      if (usersData) {
        setRecentUsers(usersData)
      }
    } catch (error) {
      console.error('Error loading admin dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return language === 'ar' ? 'صباح الخير' : 'Good Morning'
    if (hour < 18) return language === 'ar' ? 'مساء الخير' : 'Good Afternoon'
    return language === 'ar' ? 'مساء الخير' : 'Good Evening'
  }

  const statsCards = [
    {
      key: 'totalUsers',
      value: stats.totalUsers,
      label: language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users',
      icon: Users,
      color: 'bg-blue-500',
      change: '+15%',
      trend: 'up'
    },
    {
      key: 'totalNutritionists',
      value: stats.totalNutritionists,
      label: language === 'ar' ? 'أخصائيي التغذية' : 'Nutritionists',
      icon: UserCog,
      color: 'bg-green-500',
      change: '+8%',
      trend: 'up'
    },
    {
      key: 'totalRevenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      label: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
      icon: DollarSign,
      color: 'bg-purple-500',
      change: '+23%',
      trend: 'up'
    },
    {
      key: 'activeSubscriptions',
      value: stats.activeSubscriptions,
      label: language === 'ar' ? 'الاشتراكات النشطة' : 'Active Subscriptions',
      icon: Activity,
      color: 'bg-orange-500',
      change: '+12%',
      trend: 'up'
    },
  ]

  const quickActions = [
    {
      icon: Users,
      label: language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users',
      href: '/app/admin/users',
      color: 'bg-blue-500'
    },
    {
      icon: UserCog,
      label: language === 'ar' ? 'الأخصائيين' : 'Nutritionists',
      href: '/app/admin/nutritionists',
      color: 'bg-green-500'
    },
    {
      icon: FileText,
      label: language === 'ar' ? 'المحتوى' : 'Content',
      href: '/app/admin/content',
      color: 'bg-purple-500'
    },
    {
      icon: Settings,
      label: language === 'ar' ? 'الإعدادات' : 'Settings',
      href: '/app/admin/settings',
      color: 'bg-gray-500'
    },
    {
      icon: BarChart3,
      label: language === 'ar' ? 'التحليلات' : 'Analytics',
      href: '/app/admin/analytics',
      color: 'bg-cyan-500'
    },
    {
      icon: Mail,
      label: language === 'ar' ? 'الرسائل' : 'Messages',
      href: '/app/messages',
      color: 'bg-pink-500'
    },
    {
      icon: Globe,
      label: language === 'ar' ? 'الترجمات' : 'Translations',
      href: '/app/admin/translations',
      color: 'bg-indigo-500'
    },
    {
      icon: Database,
      label: language === 'ar' ? 'النسخ الاحتياطي' : 'Backups',
      href: '/app/admin/backups',
      color: 'bg-red-500'
    },
  ]

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
              <Shield className="h-3 w-3 mr-1" />
              {language === 'ar' ? 'مدير النظام' : 'Admin'}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || (language === 'ar' ? 'مدير' : 'Admin')}! 🛡️
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'لوحة تحكم إدارة النظام' : 'System Administration Dashboard'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {stats.pendingApprovals > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <div className="flex-1">
              <p className="font-medium text-orange-500">
                {language === 'ar'
                  ? `لديك ${stats.pendingApprovals} طلبات في انتظار الموافقة`
                  : `You have ${stats.pendingApprovals} pending approval requests`}
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
              {language === 'ar' ? 'مراجعة الآن' : 'Review Now'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ key, value, label, icon: Icon, color, change, trend }, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                    <div className={cn('flex items-center gap-1 text-xs mt-1', trend === 'up' ? 'text-green-500' : 'text-red-500')}>
                      {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {change}
                    </div>
                  </div>
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
          <CardDescription>
            {language === 'ar' ? 'الوصول السريع لأدوات الإدارة' : 'Quick access to admin tools'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map(({ icon: Icon, label, href, color }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{language === 'ar' ? 'المستخدمون الجدد' : 'Recent Users'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'آخر المسجلين في المنصة' : 'Latest platform registrations'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              {language === 'ar' ? 'عرض الكل' : 'View All'}
              <ArrowRight className={cn('h-4 w-4', isRTL ? 'mr-1 rotate-180' : 'ml-1')} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <Avatar>
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user.full_name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={cn(
                      user.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      user.role === 'nutritionist' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    )}>
                      {user.role || 'user'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا يوجد مستخدمون جدد' : 'No recent users'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'حالة النظام' : 'System Health'}</CardTitle>
            <CardDescription>
              {language === 'ar' ? 'نظرة عامة على أداء النظام' : 'Overview of system performance'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{language === 'ar' ? 'استخدام الخادم' : 'Server Usage'}</span>
                  <span className="text-sm text-muted-foreground">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{language === 'ar' ? 'سعة التخزين' : 'Storage'}</span>
                  <span className="text-sm text-muted-foreground">62%</span>
                </div>
                <Progress value={62} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{language === 'ar' ? 'استخدام الذاكرة' : 'Memory'}</span>
                  <span className="text-sm text-muted-foreground">38%</span>
                </div>
                <Progress value={38} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{language === 'ar' ? 'قاعدة البيانات' : 'Database'}</span>
                  <span className="text-sm text-muted-foreground">28%</span>
                </div>
                <Progress value={28} className="h-2" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-500 font-medium">
                  {language === 'ar' ? 'جميع الأنظمة تعمل بشكل طبيعي' : 'All systems operational'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
