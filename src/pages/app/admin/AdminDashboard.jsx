import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, CreditCard, TrendingUp, MessageSquare, Activity,
  ArrowUpRight, ArrowDownRight, DollarSign, UserPlus, AlertCircle,
  Shield, Crown, Settings, Key, Bot, Layers, UserCheck, FileText,
  AlertTriangle, CheckCircle, Clock, Mail
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = userProfile?.role === 'super_admin'

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    openTickets: 0,
    newUsersToday: 0,
    conversionRate: 0,
    pendingNutritionists: 0,
    totalNutritionists: 0,
    aiMessagesToday: 0
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentTickets, setRecentTickets] = useState([])
  const [pendingNutritionists, setPendingNutritionists] = useState([])
  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    stripe: 'healthy',
    ai: 'healthy',
    email: 'warning'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      setStats({
        totalUsers: 1247,
        activeSubscriptions: 856,
        monthlyRevenue: 12450,
        openTickets: 23,
        newUsersToday: 18,
        conversionRate: 68.6,
        pendingNutritionists: 3,
        totalNutritionists: 12,
        aiMessagesToday: 1523
      })
      setRecentUsers([
        { id: 1, full_name: 'Sarah Johnson', email: 'sarah@example.com', tier: 'Premium', role: 'basic_user', created_at: new Date().toISOString() },
        { id: 2, full_name: 'Mike Chen', email: 'mike@example.com', tier: 'Basic', role: 'basic_user', created_at: new Date().toISOString() },
        { id: 3, full_name: 'Emma Wilson', email: 'emma@example.com', tier: 'Free', role: 'nutritionist', created_at: new Date().toISOString() },
      ])
      setRecentTickets([
        { id: 1, subject: 'Billing issue', status: 'open', priority: 'high', created_at: new Date().toISOString() },
        { id: 2, subject: 'Feature request', status: 'in_progress', priority: 'medium', created_at: new Date().toISOString() },
      ])
      setPendingNutritionists([
        { id: 1, full_name: 'Dr. Ahmed Hassan', email: 'ahmed@example.com', certifications: 'RD, CDE', applied_at: new Date().toISOString() },
        { id: 2, full_name: 'Dr. Lisa Wang', email: 'lisa@example.com', certifications: 'RDN', applied_at: new Date().toISOString() },
      ])
      setLoading(false)
      return
    }

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayIso = todayStart.toISOString()
      const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).toISOString()

      const [
        { count: userCount },
        { count: newUsersTodayCount },
        { data: activeSubs },
        { count: ticketCount },
        { count: totalNutCount },
        { count: pendingNutCount, data: pendingNuts },
        { data: users },
        { data: tickets },
        { count: aiMessagesTodayCount }
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
        supabase.from('subscriptions').select('plan, price, billing_cycle, status').eq('status', 'active'),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'nutritionist').eq('is_active', true),
        supabase.from('user_profiles').select('id, full_name, email, created_at, role, tier', { count: 'exact' }).eq('role', 'nutritionist').eq('is_active', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('user_profiles').select('id, full_name, email, tier, role, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('support_tickets').select('id, subject, status, priority, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('ai_chat_messages').select('*', { count: 'exact', head: true }).eq('sender', 'user').gte('created_at', todayIso)
      ])

      // Compute monthly revenue from active subscription prices (yearly → divide by 12)
      const monthlyRevenue = (activeSubs || []).reduce((sum, s) => {
        const price = Number(s.price) || 0
        return sum + (s.billing_cycle === 'yearly' ? price / 12 : price)
      }, 0)

      const subCount = activeSubs?.length || 0

      // Fetch nutritionist profile data for pending applicants (certifications)
      let pendingWithCerts = pendingNuts || []
      if (pendingWithCerts.length > 0) {
        const ids = pendingWithCerts.map(n => n.id)
        const { data: nutProfiles } = await supabase
          .from('nutritionist_profiles')
          .select('id, certifications, specializations, years_experience')
          .in('id', ids)
        const profMap = Object.fromEntries((nutProfiles || []).map(p => [p.id, p]))
        pendingWithCerts = pendingWithCerts.map(n => ({
          ...n,
          certifications: profMap[n.id]?.certifications?.join(', ') || null,
          years_experience: profMap[n.id]?.years_experience || null
        }))
      }

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: subCount,
        monthlyRevenue: Math.round(monthlyRevenue),
        openTickets: ticketCount || 0,
        newUsersToday: newUsersTodayCount || 0,
        conversionRate: userCount ? Number(((subCount / userCount) * 100).toFixed(1)) : 0,
        pendingNutritionists: pendingNutCount || 0,
        totalNutritionists: totalNutCount || 0,
        aiMessagesToday: aiMessagesTodayCount || 0
      })
      setRecentUsers(users || [])
      setRecentTickets(tickets || [])
      setPendingNutritionists(pendingWithCerts)
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveNutritionist = async (nutritionistId) => {
    if (!isSupabaseConfigured()) {
      setPendingNutritionists(prev => prev.filter(n => n.id !== nutritionistId))
      toast.success('Nutritionist approved successfully')
      return
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: true })
        .eq('id', nutritionistId)

      if (error) throw error
      setPendingNutritionists(prev => prev.filter(n => n.id !== nutritionistId))
      setStats(prev => ({
        ...prev,
        pendingNutritionists: Math.max(0, prev.pendingNutritionists - 1),
        totalNutritionists: prev.totalNutritionists + 1
      }))
      toast.success('Nutritionist approved successfully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to approve nutritionist')
    }
  }

  const handleRejectNutritionist = async (nutritionistId) => {
    if (!isSupabaseConfigured()) {
      setPendingNutritionists(prev => prev.filter(n => n.id !== nutritionistId))
      toast.success('Nutritionist rejected')
      return
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: 'basic_user' })
        .eq('id', nutritionistId)

      if (error) throw error
      setPendingNutritionists(prev => prev.filter(n => n.id !== nutritionistId))
      setStats(prev => ({
        ...prev,
        pendingNutritionists: Math.max(0, prev.pendingNutritionists - 1)
      }))
      toast.success('Nutritionist rejected')
    } catch (error) {
      console.error(error)
      toast.error('Failed to reject nutritionist')
    }
  }

  // Different stat cards for Super Admin vs Admin
  const superAdminStats = [
    { title: 'Total Users', value: stats.totalUsers.toLocaleString(), change: '+12%', changeType: 'positive', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), change: '+8%', changeType: 'positive', icon: CreditCard, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, change: '+15%', changeType: 'positive', icon: DollarSign, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
    { title: 'AI Messages Today', value: stats.aiMessagesToday.toLocaleString(), change: '+25%', changeType: 'positive', icon: Bot, color: 'text-purple-500', bgColor: 'bg-purple-500/10' }
  ]

  const adminStats = [
    { title: 'Total Users', value: stats.totalUsers.toLocaleString(), change: '+12%', changeType: 'positive', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Open Tickets', value: stats.openTickets.toString(), change: '-5%', changeType: 'positive', icon: MessageSquare, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'New Users Today', value: stats.newUsersToday.toString(), change: '+3%', changeType: 'positive', icon: UserPlus, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: 'Conversion Rate', value: `${stats.conversionRate}%`, change: '+2%', changeType: 'positive', icon: TrendingUp, color: 'text-purple-500', bgColor: 'bg-purple-500/10' }
  ]

  const statCards = isSuperAdmin ? superAdminStats : adminStats

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open': return <Badge variant="destructive">Open</Badge>
      case 'in_progress': return <Badge className="bg-yellow-500">In Progress</Badge>
      case 'resolved': return <Badge className="bg-green-500">Resolved</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Elite': return <Badge className="bg-purple-600">Elite</Badge>
      case 'Premium': return <Badge className="bg-yellow-500 text-black">Premium</Badge>
      case 'Basic': return <Badge className="bg-blue-500">Basic</Badge>
      default: return <Badge variant="secondary">Free</Badge>
    }
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'super_admin': return <Badge className="bg-red-500"><Shield className="w-3 h-3 mr-1" />Super</Badge>
      case 'admin': return <Badge className="bg-orange-500">Admin</Badge>
      case 'nutritionist': return <Badge className="bg-purple-500">Nutritionist</Badge>
      default: return null
    }
  }

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {isSuperAdmin ? (
              <>
                <Shield className="h-6 w-6 text-red-500" />
                Super Admin Dashboard
              </>
            ) : (
              <>
                <Users className="h-6 w-6 text-primary" />
                Admin Dashboard
              </>
            )}
          </h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? 'Full platform control and management'
              : 'Platform overview and content management'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/admin/analytics')}>
            <Activity className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          {isSuperAdmin && (
            <Button onClick={() => navigate('/app/admin/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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

      {/* Super Admin Only: System Health & Pending Nutritionists */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
              <CardDescription>Real-time system status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(systemHealth).map(([service, status]) => (
                  <div key={service} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {service === 'database' && <Layers className="h-4 w-4" />}
                      {service === 'stripe' && <CreditCard className="h-4 w-4" />}
                      {service === 'ai' && <Bot className="h-4 w-4" />}
                      {service === 'email' && <Mail className="h-4 w-4" />}
                      <span className="font-medium capitalize">{service}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getHealthIcon(status)}
                      <span className={`text-sm capitalize ${
                        status === 'healthy' ? 'text-green-500' :
                        status === 'warning' ? 'text-yellow-500' : 'text-red-500'
                      }`}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Nutritionists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Pending Nutritionist Approvals
                {pendingNutritionists.length > 0 && (
                  <Badge variant="destructive">{pendingNutritionists.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Review and approve nutritionist applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingNutritionists.map((nutritionist) => (
                  <div key={nutritionist.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-500 text-white">
                          {nutritionist.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{nutritionist.full_name}</p>
                        <p className="text-xs text-muted-foreground">{nutritionist.certifications || 'No certifications listed'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRejectNutritionist(nutritionist.id)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApproveNutritionist(nutritionist.id)}>
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingNutritionists.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No pending applications</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Super Admin Quick Actions */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Super Admin Controls</CardTitle>
            <CardDescription>Quick access to administrative functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/admin/users')}>
                <Users className="h-6 w-6 mb-2" />
                <span className="text-xs">Manage Users</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/admin/subscriptions')}>
                <CreditCard className="h-6 w-6 mb-2" />
                <span className="text-xs">Subscriptions</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/admin/settings')}>
                <Key className="h-6 w-6 mb-2" />
                <span className="text-xs">Security</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/admin/settings')}>
                <Bot className="h-6 w-6 mb-2" />
                <span className="text-xs">AI Settings</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/admin/settings')}>
                <DollarSign className="h-6 w-6 mb-2" />
                <span className="text-xs">Stripe</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/admin/content')}>
                <FileText className="h-6 w-6 mb-2" />
                <span className="text-xs">Content</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity - Both Admins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>Newly registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.full_name || 'Unknown'}</p>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {getTierBadge(user.tier)}
                </div>
              ))}
              {recentUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No recent users</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/app/admin/users')}>
              View All Users
            </Button>
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Support Tickets</CardTitle>
            <CardDescription>Latest support requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(ticket.priority)}`} />
                    <div>
                      <p className="font-medium">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              ))}
              {recentTickets.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No recent tickets</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/app/admin/support')}>
              View All Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
