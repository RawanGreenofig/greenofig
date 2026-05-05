import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Users,
  Calendar,
  MessageSquare,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  ArrowRight,
  Plus,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export default function NutritionistDashboard() {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    todayAppointments: 0,
    pendingMessages: 0,
  })
  const [clients, setClients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch nutritionist's clients
      const { data: clientsData } = await supabase
        .from('nutritionist_clients')
        .select(`
          *,
          client:user_profiles!nutritionist_clients_client_id_fkey(*)
        `)
        .eq('nutritionist_id', profile?.id)
        .eq('status', 'active')
        .limit(5)

      if (clientsData) {
        setClients(clientsData)
        setStats(prev => ({
          ...prev,
          totalClients: clientsData.length,
          activeClients: clientsData.filter(c => c.status === 'active').length
        }))
      }

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0]
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select(`
          *,
          client:user_profiles!appointments_user_id_fkey(*)
        `)
        .eq('nutritionist_id', profile?.id)
        .gte('scheduled_at', today)
        .lt('scheduled_at', today + 'T23:59:59')
        .order('scheduled_at', { ascending: true })

      if (appointmentsData) {
        setAppointments(appointmentsData)
        setStats(prev => ({ ...prev, todayAppointments: appointmentsData.length }))
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
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
      key: 'totalClients',
      value: stats.totalClients,
      label: language === 'ar' ? 'إجمالي العملاء' : 'Total Clients',
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      key: 'activeClients',
      value: stats.activeClients,
      label: language === 'ar' ? 'العملاء النشطين' : 'Active Clients',
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+5%'
    },
    {
      key: 'todayAppointments',
      value: stats.todayAppointments,
      label: language === 'ar' ? 'مواعيد اليوم' : "Today's Appointments",
      icon: Calendar,
      color: 'bg-purple-500',
      change: '3 upcoming'
    },
    {
      key: 'pendingMessages',
      value: stats.pendingMessages,
      label: language === 'ar' ? 'رسائل معلقة' : 'Pending Messages',
      icon: MessageSquare,
      color: 'bg-orange-500',
      change: '2 new'
    },
  ]

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || (language === 'ar' ? 'أخصائي' : 'Nutritionist')}! 👨‍⚕️
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إليك نظرة عامة على عملائك ومواعيدك' : "Here's an overview of your clients and appointments"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'جدولة موعد' : 'Schedule Appointment'}
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'عميل جديد' : 'New Client'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ key, value, label, icon: Icon, color, change }, index) => (
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
                    <p className="text-xs text-green-500 mt-1">{change}</p>
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

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Appointments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{language === 'ar' ? 'مواعيد اليوم' : "Today's Appointments"}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'جدول مواعيدك لهذا اليوم' : 'Your schedule for today'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/appointments">
                {language === 'ar' ? 'عرض الكل' : 'View All'}
                <ArrowRight className={cn('h-4 w-4', isRTL ? 'mr-1 rotate-180' : 'ml-1')} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <Avatar>
                      <AvatarImage src={apt.client?.avatar_url} />
                      <AvatarFallback>
                        {apt.client?.full_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{apt.client?.full_name || 'Client'}</p>
                      <p className="text-sm text-muted-foreground">{apt.appointment_type}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={apt.status === 'confirmed' ? 'default' : 'outline'}>
                        {apt.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا توجد مواعيد اليوم' : 'No appointments today'}
                </p>
                <Button className="mt-4" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'جدولة موعد' : 'Schedule Appointment'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{language === 'ar' ? 'العملاء الأخيرين' : 'Recent Clients'}</CardTitle>
              <CardDescription>
                {language === 'ar' ? 'آخر العملاء الذين تعاملت معهم' : 'Latest clients you worked with'}
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} className="pl-9 w-40" />
            </div>
          </CardHeader>
          <CardContent>
            {clients.length > 0 ? (
              <div className="space-y-4">
                {clients.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <Avatar>
                      <AvatarImage src={item.client?.avatar_url} />
                      <AvatarFallback>
                        {item.client?.full_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{item.client?.full_name || 'Client'}</p>
                      <p className="text-sm text-muted-foreground">{item.client?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        {item.status}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد عملاء بعد' : 'No clients yet'}
                </p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'إضافة عميل' : 'Add Client'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/app/meal-plans" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-white">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-center">
                {language === 'ar' ? 'خطط الوجبات' : 'Meal Plans'}
              </span>
            </Link>
            <Link to="/app/messages" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                <MessageSquare className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-center">
                {language === 'ar' ? 'الرسائل' : 'Messages'}
              </span>
            </Link>
            <Link to="/app/reports" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-center">
                {language === 'ar' ? 'التقارير' : 'Reports'}
              </span>
            </Link>
            <Link to="/app/appointments" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                <Calendar className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-center">
                {language === 'ar' ? 'المواعيد' : 'Appointments'}
              </span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
