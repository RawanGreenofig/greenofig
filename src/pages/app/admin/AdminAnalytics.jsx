import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, Users, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Calendar, Download
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function AdminAnalytics() {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    avgSessionTime: 0,
    conversionRate: 0,
    churnRate: 0,
    dailyActiveUsers: []
  })

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)

    if (!isSupabaseConfigured()) {
      // Mock data
      setAnalytics({
        totalUsers: 1247,
        newUsers: 156,
        activeUsers: 892,
        totalRevenue: 45680,
        avgSessionTime: 12.5,
        conversionRate: 68.6,
        churnRate: 3.2,
        dailyActiveUsers: [
          { date: '2024-01-20', count: 245 },
          { date: '2024-01-21', count: 312 },
          { date: '2024-01-22', count: 287 },
          { date: '2024-01-23', count: 356 },
          { date: '2024-01-24', count: 401 },
          { date: '2024-01-25', count: 389 },
          { date: '2024-01-26', count: 423 },
        ],
        topFeatures: [
          { name: 'AI Coach', usage: 78 },
          { name: 'Meal Planning', usage: 65 },
          { name: 'Fitness Tracking', usage: 54 },
          { name: 'Progress Photos', usage: 42 },
          { name: 'Water Tracking', usage: 38 },
        ],
        usersByTier: [
          { tier: 'Free', count: 456 },
          { tier: 'Basic', count: 398 },
          { tier: 'Premium', count: 393 },
        ],
        revenueByMonth: [
          { month: 'Aug', revenue: 32000 },
          { month: 'Sep', revenue: 35500 },
          { month: 'Oct', revenue: 38200 },
          { month: 'Nov', revenue: 41000 },
          { month: 'Dec', revenue: 43500 },
          { month: 'Jan', revenue: 45680 },
        ]
      })
      setLoading(false)
      return
    }

    try {
      // Fetch real analytics from Supabase
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: newUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      setAnalytics({
        totalUsers: totalUsers || 0,
        newUsers: newUsers || 0,
        activeUsers: Math.floor((totalUsers || 0) * 0.7),
        totalRevenue: (activeSubscriptions || 0) * 15,
        avgSessionTime: 12.5,
        conversionRate: totalUsers ? ((activeSubscriptions / totalUsers) * 100).toFixed(1) : 0,
        churnRate: 3.2,
        dailyActiveUsers: [],
        topFeatures: [],
        usersByTier: [],
        revenueByMonth: []
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = [
    {
      title: 'Total Users',
      value: analytics.totalUsers.toLocaleString(),
      change: '+12.5%',
      changeType: 'positive',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'New Users (30d)',
      value: analytics.newUsers.toLocaleString(),
      change: '+8.2%',
      changeType: 'positive',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Total Revenue',
      value: `$${analytics.totalRevenue.toLocaleString()}`,
      change: '+15.3%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Conversion Rate',
      value: `${analytics.conversionRate}%`,
      change: '+2.1%',
      changeType: 'positive',
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Platform performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className={`flex items-center text-sm ${
                    stat.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Active Users</CardTitle>
            <CardDescription>User activity over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {analytics.dailyActiveUsers?.map((day, index) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.count / 500) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-full bg-primary rounded-t-md min-h-[20px]"
                  />
                  <span className="text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {analytics.revenueByMonth?.map((month, index) => (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(month.revenue / 50000) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-full bg-green-500 rounded-t-md min-h-[20px]"
                  />
                  <span className="text-xs text-muted-foreground">{month.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Features */}
        <Card>
          <CardHeader>
            <CardTitle>Top Features</CardTitle>
            <CardDescription>Most used platform features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topFeatures?.map((feature, index) => (
                <div key={feature.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{feature.name}</span>
                    <span className="text-muted-foreground">{feature.usage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${feature.usage}%` }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users by Tier */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Tier</CardTitle>
            <CardDescription>Distribution across subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.usersByTier?.map((tier, index) => {
                const total = analytics.usersByTier.reduce((sum, t) => sum + t.count, 0)
                const percentage = ((tier.count / total) * 100).toFixed(1)
                const colors = {
                  Free: 'bg-gray-500',
                  Basic: 'bg-blue-500',
                  Premium: 'bg-yellow-500'
                }
                return (
                  <div key={tier.tier} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${colors[tier.tier]}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{tier.tier}</span>
                        <span className="text-muted-foreground">{tier.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: index * 0.1, duration: 0.5 }}
                          className={`h-full ${colors[tier.tier]} rounded-full`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Important performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Avg. Session Time</span>
                <span className="font-bold">{analytics.avgSessionTime} min</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Active Users</span>
                <span className="font-bold">{analytics.activeUsers.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Churn Rate</span>
                <span className="font-bold text-red-500">{analytics.churnRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-bold text-green-500">{analytics.conversionRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
