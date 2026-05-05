import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { isNutritionist } from '@/lib/rbac'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Target,
  Utensils,
  Calendar,
  MessageSquare,
  BarChart3,
  CreditCard,
  BookOpen,
  FileText,
  Settings,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Star,
  Phone,
  Mail,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  Download,
  Upload,
  Save,
  X,
  Check,
  Bell,
  Activity,
  Heart,
  Flame,
  Droplets,
  Moon,
  Apple,
  Dumbbell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// Tab definitions
const NUTRITIONIST_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'meals', label: 'Meal Plans', icon: Utensils },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'blog', label: 'Blog', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function NutritionistPanel() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [clients, setClients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [messages, setMessages] = useState([])
  const [mealPlans, setMealPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    pendingOnboarding: 0,
    todayAppointments: 0,
    unreadMessages: 0,
    monthlyRevenue: 0,
    avgClientProgress: 0,
    clientSatisfaction: 0,
  })
  const isRTL = i18n.language === 'ar'

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch clients assigned to this nutritionist
      const { data: clientsData } = await supabase
        .from('nutritionist_clients')
        .select(`
          *,
          profiles:client_id (
            id,
            full_name,
            email,
            avatar_url,
            subscription_tier,
            created_at
          )
        `)
        .eq('nutritionist_id', user.id)
        .order('created_at', { ascending: false })

      if (clientsData) {
        setClients(clientsData)
        setStats(prev => ({
          ...prev,
          totalClients: clientsData.length,
          activeClients: clientsData.filter(c => c.status === 'active').length,
          pendingOnboarding: clientsData.filter(c => c.status === 'pending').length,
        }))
      }

      // Fetch today's appointments
      const today = new Date().toISOString().split('T')[0]
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('nutritionist_id', user.id)
        .gte('scheduled_at', `${today}T00:00:00`)
        .lte('scheduled_at', `${today}T23:59:59`)
        .order('scheduled_at', { ascending: true })

      if (appointmentsData) {
        setAppointments(appointmentsData)
        setStats(prev => ({
          ...prev,
          todayAppointments: appointmentsData.length,
        }))
      }

      // Fetch unread messages
      const { data: messagesData, count } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('recipient_id', user.id)
        .eq('read', false)

      if (messagesData) {
        setMessages(messagesData)
        setStats(prev => ({
          ...prev,
          unreadMessages: count || 0,
        }))
      }

      // Fetch meal plans created by nutritionist
      const { data: mealsData } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (mealsData) {
        setMealPlans(mealsData)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Dashboard Tab Component
  const DashboardTab = () => (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {t('common.welcome')}, {profile?.full_name?.split(' ')[0] || 'Nutritionist'}! 👋
                </h2>
                <p className="text-muted-foreground mt-1">
                  You have {stats.todayAppointments} appointments today and {stats.unreadMessages} unread messages.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="secondary" className="text-green-600">
                  <Activity className="h-3 w-3 mr-1" />
                  {stats.activeClients} Active Clients
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeClients}</p>
                <p className="text-xs text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingOnboarding}</p>
                <p className="text-xs text-muted-foreground">Pending Onboarding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayAppointments}</p>
                <p className="text-xs text-muted-foreground">Today's Appointments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Schedule & Recent Clients */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No appointments today</p>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{apt.client_name || 'Client'}</p>
                          <p className="text-sm text-muted-foreground">{apt.type || 'Consultation'}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Recent Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No clients yet</p>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.profiles?.avatar_url} />
                          <AvatarFallback>
                            {client.profiles?.full_name?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{client.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.profiles?.subscription_tier || 'Free'} plan
                          </p>
                        </div>
                      </div>
                      <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                        {client.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('clients')}>
                <UserPlus className="h-5 w-5" />
                <span className="text-xs">Add Client</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('meals')}>
                <Utensils className="h-5 w-5" />
                <span className="text-xs">Create Meal Plan</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('schedule')}>
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Schedule Call</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('messages')}>
                <MessageSquare className="h-5 w-5" />
                <span className="text-xs">Send Message</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Clients Tab Component
  const ClientsTab = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedClient, setSelectedClient] = useState(null)
    const [showAddDialog, setShowAddDialog] = useState(false)

    const filteredClients = clients.filter(client => {
      const matchesSearch = client.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           client.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter
      return matchesSearch && matchesStatus
    })

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Management
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Client
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No clients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={client.profiles?.avatar_url} />
                              <AvatarFallback>
                                {client.profiles?.full_name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{client.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{client.profiles?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{client.profiles?.subscription_tier || 'Free'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            client.status === 'active' ? 'default' :
                            client.status === 'pending' ? 'secondary' : 'outline'
                          }>
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(client.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={client.progress || 0} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">{client.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedClient(client)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }

  // Onboarding Tab Component
  const OnboardingTab = () => {
    const pendingClients = clients.filter(c => c.status === 'pending')

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Client Onboarding
              </CardTitle>
              <CardDescription>
                Manage new client intake and onboarding processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingClients.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="font-semibold text-lg">All Caught Up!</h3>
                  <p className="text-muted-foreground">No pending onboarding requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingClients.map((client) => (
                    <Card key={client.id} className="border-orange-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={client.profiles?.avatar_url} />
                              <AvatarFallback>
                                {client.profiles?.full_name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{client.profiles?.full_name || 'New Client'}</p>
                              <p className="text-sm text-muted-foreground">{client.profiles?.email}</p>
                              <Badge variant="secondary" className="mt-1">
                                {client.profiles?.subscription_tier || 'Free'} Plan
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Review Profile
                            </Button>
                            <Button size="sm">
                              <Check className="h-4 w-4 mr-2" />
                              Start Onboarding
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Onboarding Checklist */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Checklist Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  'Initial health assessment questionnaire',
                  'Dietary preferences and restrictions',
                  'Current eating habits review',
                  'Goal setting session',
                  'First meal plan creation',
                  'App features walkthrough',
                  'Schedule first follow-up'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }

  // Goals Tab Component
  const GoalsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Client Goals Management
                </CardTitle>
                <CardDescription>Track and manage goals for your clients</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal Template
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active">
              <TabsList>
                <TabsTrigger value="active">Active Goals</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-4">
                <div className="space-y-4">
                  {clients.slice(0, 5).map((client) => (
                    <Card key={client.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={client.profiles?.avatar_url} />
                              <AvatarFallback>
                                {client.profiles?.full_name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{client.profiles?.full_name || 'Client'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  <Target className="h-3 w-3 mr-1" />
                                  Weight Loss
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Heart className="h-3 w-3 mr-1" />
                                  Heart Health
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <Progress value={65} className="w-24 h-2" />
                              <span className="text-sm font-medium">65%</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Target: 30 days left</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Completed goals will appear here</p>
                </div>
              </TabsContent>
              <TabsContent value="templates" className="mt-4">
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { title: 'Weight Loss Journey', icon: TrendingDown, color: 'text-blue-500' },
                    { title: 'Muscle Building', icon: Dumbbell, color: 'text-orange-500' },
                    { title: 'Better Sleep', icon: Moon, color: 'text-purple-500' },
                    { title: 'Hydration Goals', icon: Droplets, color: 'text-cyan-500' },
                    { title: 'Balanced Diet', icon: Apple, color: 'text-green-500' },
                    { title: 'Calorie Control', icon: Flame, color: 'text-red-500' },
                  ].map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 text-center">
                        <template.icon className={`h-8 w-8 mx-auto mb-2 ${template.color}`} />
                        <p className="font-medium">{template.title}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Meals Tab Component
  const MealsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5" />
                  Meal Plan Builder
                </CardTitle>
                <CardDescription>Create and manage personalized meal plans</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Meal Plan
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="plans">
              <TabsList>
                <TabsTrigger value="plans">My Plans</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Library</TabsTrigger>
              </TabsList>
              <TabsContent value="plans" className="mt-4">
                {mealPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No Meal Plans Yet</h3>
                    <p className="text-muted-foreground mb-4">Start creating personalized meal plans for your clients</p>
                    <Button>Create Your First Plan</Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {mealPlans.map((plan) => (
                      <Card key={plan.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{plan.name}</h4>
                              <p className="text-sm text-muted-foreground">{plan.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary">{plan.duration || '7'} days</Badge>
                                <Badge variant="outline">{plan.calories || '2000'} kcal/day</Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="templates" className="mt-4">
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'Mediterranean Diet', calories: 1800, duration: 14 },
                    { name: 'Keto Starter', calories: 1500, duration: 7 },
                    { name: 'High Protein', calories: 2200, duration: 7 },
                    { name: 'Vegan Balanced', calories: 1600, duration: 14 },
                    { name: 'Low Carb', calories: 1400, duration: 7 },
                    { name: 'Heart Healthy', calories: 1700, duration: 21 },
                  ].map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <h4 className="font-semibold">{template.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{template.duration} days</Badge>
                          <Badge variant="outline">{template.calories} kcal</Badge>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-3">
                          Use Template
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="recipes" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4" />
                  <p>Recipe library coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Schedule Tab Component
  const ScheduleTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Appointment Schedule
                </CardTitle>
                <CardDescription>Manage your consultation appointments</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No Appointments</h3>
                  <p className="text-muted-foreground mb-4">Schedule consultations with your clients</p>
                  <Button>Schedule First Appointment</Button>
                </div>
              ) : (
                appointments.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{apt.client_name || 'Client'}</p>
                            <p className="text-sm text-muted-foreground">{apt.type || 'Consultation'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {new Date(apt.scheduled_at).toLocaleDateString()}
                              </Badge>
                              <Badge variant="secondary">
                                {new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Phone className="h-4 w-4 mr-2" />
                            Join Call
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Availability Settings */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Availability Settings</CardTitle>
            <CardDescription>Set your available hours for client bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                <div key={day} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">{day}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">9:00 AM - 5:00 PM</Badge>
                    <Switch defaultChecked />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Messages Tab Component
  const MessagesTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Client Messages
              </CardTitle>
              <Badge variant="secondary">{stats.unreadMessages} unread</Badge>
            </div>
          </CardHeader>
          <div className="flex flex-1 overflow-hidden">
            {/* Conversations List */}
            <div className="w-1/3 border-r overflow-y-auto">
              {clients.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No conversations yet
                </div>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    className="p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.profiles?.avatar_url} />
                        <AvatarFallback>
                          {client.profiles?.full_name?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{client.profiles?.full_name || 'Client'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Last message preview...
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Message Area */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="text-center text-muted-foreground">
                  Select a conversation to view messages
                </div>
              </div>
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Input placeholder="Type a message..." className="flex-1" />
                  <Button>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Analytics Tab Component
  const AnalyticsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Practice Analytics
            </CardTitle>
            <CardDescription>Track your performance and client outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">87%</p>
                  <p className="text-xs text-muted-foreground">Client Success Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">4.8</p>
                  <p className="text-xs text-muted-foreground">Average Rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{stats.activeClients}</p>
                  <p className="text-xs text-muted-foreground">Active Clients</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">24</p>
                  <p className="text-xs text-muted-foreground">Sessions This Month</p>
                </CardContent>
              </Card>
            </div>

            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Charts coming soon</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Payments Tab Component
  const PaymentsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Management
            </CardTitle>
            <CardDescription>Track earnings and manage invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">$2,450</p>
                  <p className="text-xs text-green-500">+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">$350</p>
                  <p className="text-xs text-muted-foreground">3 invoices</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">$18,200</p>
                  <p className="text-xs text-muted-foreground">Lifetime</p>
                </CardContent>
              </Card>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No payment records yet
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Resources Tab Component
  const ResourcesTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Educational Resources
                </CardTitle>
                <CardDescription>Share resources with your clients</CardDescription>
              </div>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Resource
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="library">
              <TabsList>
                <TabsTrigger value="library">My Library</TabsTrigger>
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="guides">Guides</TabsTrigger>
              </TabsList>
              <TabsContent value="library" className="mt-4">
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No Resources Yet</h3>
                  <p className="text-muted-foreground mb-4">Upload PDFs, guides, and other resources for your clients</p>
                  <Button>Upload Your First Resource</Button>
                </div>
              </TabsContent>
              <TabsContent value="templates" className="mt-4">
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    'Meal Prep Guide',
                    'Grocery Shopping List',
                    'Food Diary Template',
                    'Progress Tracker',
                    'Recipe Card Template',
                    'Weekly Planner'
                  ].map((template, index) => (
                    <Card key={index} className="cursor-pointer hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{template}</p>
                          <Button variant="link" size="sm" className="p-0 h-auto">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="guides" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Professional guides coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Blog Tab Component
  const BlogTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Blog Management
                </CardTitle>
                <CardDescription>Write and publish health & nutrition articles</CardDescription>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="drafts">
              <TabsList>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="ideas">Ideas</TabsTrigger>
              </TabsList>
              <TabsContent value="drafts" className="mt-4">
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No Drafts</h3>
                  <p className="text-muted-foreground mb-4">Start writing your next article</p>
                  <Button>Create New Draft</Button>
                </div>
              </TabsContent>
              <TabsContent value="published" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>No published articles yet</p>
                </div>
              </TabsContent>
              <TabsContent value="ideas" className="mt-4">
                <div className="space-y-3">
                  {[
                    '10 Healthy Breakfast Ideas',
                    'Understanding Macros',
                    'Meal Prep for Beginners',
                    'Healthy Snacking Tips',
                    'Hydration Myths Debunked'
                  ].map((idea, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span>{idea}</span>
                      <Button variant="outline" size="sm">Start Writing</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Settings Tab Component
  const SettingsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Practice Settings
            </CardTitle>
            <CardDescription>Configure your nutritionist profile and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">Profile Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input defaultValue={profile?.full_name || ''} />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight">Weight Management</SelectItem>
                      <SelectItem value="sports">Sports Nutrition</SelectItem>
                      <SelectItem value="clinical">Clinical Nutrition</SelectItem>
                      <SelectItem value="pediatric">Pediatric Nutrition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea placeholder="Tell clients about your experience and approach..." rows={4} />
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Notifications</h3>
              <div className="space-y-3">
                {[
                  { label: 'New client requests', description: 'Get notified when someone wants to join' },
                  { label: 'Appointment reminders', description: 'Reminders before scheduled calls' },
                  { label: 'Client messages', description: 'New messages from clients' },
                  { label: 'Goal completions', description: 'When clients achieve their goals' },
                ].map((setting, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{setting.label}</p>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />
      case 'clients': return <ClientsTab />
      case 'onboarding': return <OnboardingTab />
      case 'goals': return <GoalsTab />
      case 'meals': return <MealsTab />
      case 'schedule': return <ScheduleTab />
      case 'messages': return <MessagesTab />
      case 'analytics': return <AnalyticsTab />
      case 'payments': return <PaymentsTab />
      case 'resources': return <ResourcesTab />
      case 'blog': return <BlogTab />
      case 'settings': return <SettingsTab />
      default: return <DashboardTab />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner h-8 w-8" />
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-64 border-r min-h-screen sticky top-0">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.full_name?.charAt(0) || 'N'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{profile?.full_name || 'Nutritionist'}</p>
                <Badge variant="secondary" className="text-xs">Nutritionist</Badge>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {NUTRITIONIST_TABS.map((tab) => (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {tab.id === 'messages' && stats.unreadMessages > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs h-5 w-5 p-0 flex items-center justify-center">
                        {stats.unreadMessages}
                      </Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50">
          <div className="flex overflow-x-auto py-2 px-4 gap-1">
            {NUTRITIONIST_TABS.slice(0, 5).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-2 rounded-lg min-w-[60px] ${
                  activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
