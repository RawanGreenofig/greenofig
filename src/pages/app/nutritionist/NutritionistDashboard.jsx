import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Calendar, MessageSquare, TrendingUp, Clock,
  ArrowUpRight, Star, CheckCircle, Activity, DollarSign,
  FileText, PenSquare, Video, Bell, Award, Target
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  return `${Math.floor(seconds / 86400)} days ago`
}

function formatApptType(type) {
  if (!type) return 'Consultation'
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function NutritionistDashboard() {
  const { t } = useTranslation()
  const { user, userProfile } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    todayAppointments: 0,
    pendingMessages: 0,
    rating: 0,
    totalReviews: 0,
    completedSessions: 0,
    monthlyEarnings: 0,
    pendingPayouts: 0,
    mealPlansCreated: 0
  })
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [recentClients, setRecentClients] = useState([])
  const [recentMessages, setRecentMessages] = useState([])
  const [monthlyGoals, setMonthlyGoals] = useState({
    sessionsTarget: 50,
    sessionsCompleted: 38,
    newClientsTarget: 10,
    newClientsAcquired: 7
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      setStats({
        totalClients: 45,
        activeClients: 32,
        todayAppointments: 6,
        pendingMessages: 8,
        rating: 4.8,
        totalReviews: 127,
        completedSessions: 156,
        monthlyEarnings: 4250,
        pendingPayouts: 850,
        mealPlansCreated: 89
      })
      setUpcomingAppointments([
        { id: '1', client_name: 'Sarah Johnson', client_avatar: null, time: '09:00 AM', type: 'Initial Consultation', status: 'confirmed', duration: 60 },
        { id: '2', client_name: 'Mike Chen', client_avatar: null, time: '10:30 AM', type: 'Follow-up', status: 'confirmed', duration: 30 },
        { id: '3', client_name: 'Emma Wilson', client_avatar: null, time: '02:00 PM', type: 'Meal Plan Review', status: 'pending', duration: 45 },
        { id: '4', client_name: 'John Doe', client_avatar: null, time: '04:00 PM', type: 'Video Call', status: 'confirmed', duration: 30 },
      ])
      setRecentClients([
        { id: '1', full_name: 'Sarah Johnson', goal: 'Weight Loss', progress: 75, last_session: '2024-01-25', tier: 'Premium' },
        { id: '2', full_name: 'Mike Chen', goal: 'Muscle Gain', progress: 60, last_session: '2024-01-24', tier: 'Premium' },
        { id: '3', full_name: 'Emma Wilson', goal: 'Healthy Lifestyle', progress: 85, last_session: '2024-01-23', tier: 'Elite' },
      ])
      setRecentMessages([
        { id: '1', from: 'Sarah Johnson', message: 'Thank you for the meal plan! Quick question about...', time: '10 min ago', unread: true },
        { id: '2', from: 'Mike Chen', message: 'Hi! I wanted to update you on my progress...', time: '1 hour ago', unread: true },
        { id: '3', from: 'John Doe', message: 'Looking forward to our session tomorrow!', time: '3 hours ago', unread: false },
      ])
      setLoading(false)
      return
    }

    try {
      if (!user?.id) {
        setLoading(false)
        return
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)
      const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1).toISOString()

      const [
        { data: clients },
        { data: todayAppts },
        { data: upcomingAppts },
        { count: completedSessionsCount },
        { data: nutProfile },
        { count: mealPlansCount },
        { data: monthlyAppts }
      ] = await Promise.all([
        supabase
          .from('client_nutritionist')
          .select('id, client_id, status, start_date, end_date, notes')
          .eq('nutritionist_id', user.id),
        supabase
          .from('appointments')
          .select('id, title, appointment_type, scheduled_at, duration_minutes, status, user_id')
          .eq('nutritionist_id', user.id)
          .gte('scheduled_at', todayStart.toISOString())
          .lt('scheduled_at', todayEnd.toISOString())
          .order('scheduled_at', { ascending: true }),
        supabase
          .from('appointments')
          .select('id, title, appointment_type, scheduled_at, duration_minutes, status, user_id')
          .eq('nutritionist_id', user.id)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(8),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('nutritionist_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('nutritionist_profiles')
          .select('rating, total_reviews, total_clients, hourly_rate')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('meal_plans')
          .select('id', { count: 'exact', head: true })
          .eq('nutritionist_id', user.id),
        supabase
          .from('appointments')
          .select('duration_minutes, status')
          .eq('nutritionist_id', user.id)
          .gte('scheduled_at', monthStart)
          .eq('status', 'completed')
      ])

      // Pull profiles for all known client_ids (from client_nutritionist + appointments)
      const allClientIds = [...new Set([
        ...(clients || []).map(c => c.client_id),
        ...(upcomingAppts || []).map(a => a.user_id),
        ...(todayAppts || []).map(a => a.user_id)
      ].filter(Boolean))]
      let clientNameMap = {}
      if (allClientIds.length > 0) {
        const { data: clientProfiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, profile_picture_url, tier')
          .in('id', allClientIds)
        clientNameMap = Object.fromEntries((clientProfiles || []).map(p => [p.id, p]))
      }

      // Recent messages: find conversations involving this nutritionist
      const { data: convos } = await supabase
        .from('conversations')
        .select('id, last_message_at')
        .order('last_message_at', { ascending: false })
        .limit(20)

      let recentMsgs = []
      let pendingMsgCount = 0
      if (convos && convos.length > 0) {
        const convoIds = convos.map(c => c.id)
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, content, is_read, created_at')
          .in('conversation_id', convoIds)
          .neq('sender_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)

        const senderIds = [...new Set((msgs || []).map(m => m.sender_id))]
        let senderMap = {}
        if (senderIds.length > 0) {
          const { data: senders } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', senderIds)
          senderMap = Object.fromEntries((senders || []).map(s => [s.id, s.full_name]))
        }

        // Latest unread per conversation
        const seen = new Set()
        recentMsgs = (msgs || [])
          .filter(m => {
            if (seen.has(m.conversation_id)) return false
            seen.add(m.conversation_id)
            return true
          })
          .slice(0, 4)
          .map(m => ({
            id: m.id,
            from: senderMap[m.sender_id] || 'Client',
            message: m.content,
            time: timeAgo(m.created_at),
            unread: !m.is_read
          }))

        pendingMsgCount = (msgs || []).filter(m => !m.is_read).length
      }

      // Monthly earnings from completed sessions × hourly rate
      const hourlyRate = Number(nutProfile?.hourly_rate) || 0
      const monthlyEarnings = (monthlyAppts || []).reduce((sum, a) => {
        const hours = (a.duration_minutes || 30) / 60
        return sum + hours * hourlyRate
      }, 0)

      const sessionsThisMonth = (monthlyAppts || []).length

      setStats({
        totalClients: clients?.length || 0,
        activeClients: clients?.filter(c => c.status === 'active').length || 0,
        todayAppointments: todayAppts?.length || 0,
        pendingMessages: pendingMsgCount,
        rating: Number(nutProfile?.rating) || 0,
        totalReviews: nutProfile?.total_reviews || 0,
        completedSessions: completedSessionsCount || 0,
        monthlyEarnings: Math.round(monthlyEarnings),
        pendingPayouts: Math.round(monthlyEarnings * 0.2),
        mealPlansCreated: mealPlansCount || 0
      })

      setUpcomingAppointments((upcomingAppts || []).map(apt => ({
        id: apt.id,
        client_name: clientNameMap[apt.user_id]?.full_name || 'Client',
        client_avatar: clientNameMap[apt.user_id]?.profile_picture_url || null,
        time: new Date(apt.scheduled_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }),
        type: apt.title || formatApptType(apt.appointment_type),
        status: apt.status,
        duration: apt.duration_minutes || 30
      })))

      setRecentClients((clients || []).slice(0, 6).map(c => ({
        id: c.client_id,
        full_name: clientNameMap[c.client_id]?.full_name || 'Unknown',
        goal: c.notes || 'General Health',
        progress: 0,
        last_session: c.start_date,
        tier: clientNameMap[c.client_id]?.tier || 'Free'
      })))

      setRecentMessages(recentMsgs)

      setMonthlyGoals(prev => ({
        ...prev,
        sessionsCompleted: sessionsThisMonth,
        newClientsAcquired: (clients || []).filter(c =>
          new Date(c.start_date) >= new Date(monthStart)
        ).length
      }))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { title: 'Active Clients', value: stats.activeClients, subtitle: `of ${stats.totalClients} total`, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: "Today's Sessions", value: stats.todayAppointments, subtitle: 'appointments', icon: Calendar, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: 'Pending Messages', value: stats.pendingMessages, subtitle: 'need response', icon: MessageSquare, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Monthly Earnings', value: `$${stats.monthlyEarnings.toLocaleString()}`, subtitle: `$${stats.pendingPayouts} pending`, icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-500/10' }
  ]

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTierBadge = (tier) => {
    switch (tier) {
      case 'Elite':
        return <Badge className="bg-purple-600 text-xs">Elite</Badge>
      case 'Premium':
        return <Badge className="bg-yellow-500 text-black text-xs">Premium</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Basic</Badge>
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nutritionist Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {userProfile?.full_name?.split(' ')[0]}! Here's your overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-full">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-yellow-600">{stats.rating}</span>
            <span className="text-xs text-muted-foreground">({stats.totalReviews} reviews)</span>
          </div>
          <Button onClick={() => navigate('/app/nutritionist/schedule')}>
            <Calendar className="mr-2 h-4 w-4" />
            Manage Schedule
          </Button>
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
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Monthly Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Monthly Goals
          </CardTitle>
          <CardDescription>Track your progress this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sessions Completed</span>
                <span className="font-medium">{monthlyGoals.sessionsCompleted}/{monthlyGoals.sessionsTarget}</span>
              </div>
              <Progress value={(monthlyGoals.sessionsCompleted / monthlyGoals.sessionsTarget) * 100} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {monthlyGoals.sessionsTarget - monthlyGoals.sessionsCompleted} more to reach your goal
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>New Clients Acquired</span>
                <span className="font-medium">{monthlyGoals.newClientsAcquired}/{monthlyGoals.newClientsTarget}</span>
              </div>
              <Progress value={(monthlyGoals.newClientsAcquired / monthlyGoals.newClientsTarget) * 100} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {monthlyGoals.newClientsTarget - monthlyGoals.newClientsAcquired} more to reach your goal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="font-bold text-primary">{appointment.time}</p>
                      <p className="text-xs text-muted-foreground">{appointment.duration}min</p>
                    </div>
                    <div className="w-px h-10 bg-border" />
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={appointment.client_avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {appointment.client_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{appointment.client_name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{appointment.type}</p>
                          {appointment.type === 'Video Call' && <Video className="h-3 w-3 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(appointment.status)}
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              ))}
              {upcomingAppointments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No appointments scheduled for today</p>
              )}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/app/nutritionist/schedule')}>
              View Full Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Messages
              {stats.pendingMessages > 0 && (
                <Badge variant="destructive" className="ml-auto">{stats.pendingMessages}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMessages.map((message) => (
                <div key={message.id} className={`p-3 rounded-lg ${message.unread ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{message.from}</p>
                    <span className="text-xs text-muted-foreground">{message.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/app/nutritionist/messages')}>
              View All Messages
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Active Clients
          </CardTitle>
          <CardDescription>Your clients and their progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {recentClients.map((client) => (
              <div key={client.id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {client.full_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{client.full_name}</p>
                      {getTierBadge(client.tier)}
                    </div>
                    <p className="text-xs text-muted-foreground">{client.goal}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{client.progress}%</span>
                  </div>
                  <Progress value={client.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Last session: {client.last_session ? new Date(client.last_session).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/app/nutritionist/clients')}>
            View All Clients
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/nutritionist/clients')}>
              <Users className="h-6 w-6 mb-2" />
              <span className="text-xs">Clients</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/nutritionist/meal-plans')}>
              <FileText className="h-6 w-6 mb-2" />
              <span className="text-xs">Meal Plans</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/nutritionist/schedule')}>
              <Calendar className="h-6 w-6 mb-2" />
              <span className="text-xs">Schedule</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/nutritionist/messages')}>
              <MessageSquare className="h-6 w-6 mb-2" />
              <span className="text-xs">Messages</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => navigate('/app/nutritionist/blog')}>
              <PenSquare className="h-6 w-6 mb-2" />
              <span className="text-xs">Write Article</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
