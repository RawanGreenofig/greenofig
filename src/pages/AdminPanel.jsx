import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { hasPermission, getAccessibleTabs, isSuperAdmin, PERMISSIONS } from '@/lib/rbac'
import {
  LayoutDashboard,
  Eye,
  BarChart3,
  DollarSign,
  AlertTriangle,
  Users,
  CreditCard,
  Ticket,
  Gift,
  AlertCircle,
  MessageSquare,
  FileText,
  Globe,
  Megaphone,
  Bot,
  Wand2,
  Settings,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Send,
  Download,
  Upload,
  Save,
  RefreshCw,
  Shield,
  Star,
  Crown,
  Zap,
  Database,
  Server,
  Lock,
  Unlock,
  Mail,
  Bell,
  ExternalLink,
  Copy,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

// Admin Tab definitions with RBAC
const ADMIN_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tier-preview', label: 'Tier Preview', icon: Eye },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'errors', label: 'Errors', icon: AlertTriangle },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'referrals', label: 'Referrals', icon: Gift },
  { id: 'issues', label: 'Issues', icon: AlertCircle },
  { id: 'messaging', label: 'Messaging', icon: MessageSquare },
  { id: 'blog', label: 'Blog', icon: FileText },
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'ads', label: 'Ads', icon: Megaphone },
  { id: 'ai-coach', label: 'AI Coach', icon: Bot },
  { id: 'studio', label: 'Studio', icon: Wand2 },
]

export default function AdminPanel() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    pendingIssues: 0,
    errorCount: 0,
    conversionRate: 0,
    churnRate: 0,
    avgSessionTime: 0,
  })
  const [users, setUsers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [coupons, setCoupons] = useState([])
  const [issues, setIssues] = useState([])
  const [blogPosts, setBlogPosts] = useState([])
  const isRTL = i18n.language === 'ar'

  // Filter tabs based on user permissions
  const accessibleTabs = getAccessibleTabs({ role: profile?.role }, ADMIN_TABS)

  useEffect(() => {
    if (user) {
      fetchAdminData()
    }
  }, [user])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Fetch subscriptions
      const { data: subsData, count: subCount } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact' })
        .eq('status', 'active')

      if (subsData) setSubscriptions(subsData)

      // Fetch recent users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (usersData) setUsers(usersData)

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (paymentsData) setPayments(paymentsData)

      // Fetch coupons
      const { data: couponsData } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (couponsData) setCoupons(couponsData)

      // Fetch support issues
      const { data: issuesData, count: issueCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact' })
        .eq('status', 'open')

      if (issuesData) setIssues(issuesData)

      // Fetch blog posts
      const { data: postsData } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (postsData) setBlogPosts(postsData)

      // Calculate revenue
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', thisMonth.toISOString())
        .eq('status', 'completed')

      const monthlyRevenue = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

      setStats({
        totalUsers: userCount || 0,
        activeSubscriptions: subCount || 0,
        monthlyRevenue,
        pendingIssues: issueCount || 0,
        errorCount: 0,
        conversionRate: userCount ? ((subCount || 0) / userCount * 100).toFixed(1) : 0,
        churnRate: 2.5,
        avgSessionTime: 12,
      })

    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Dashboard Tab
  const DashboardTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome & Quick Stats */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                <p className="text-muted-foreground mt-1">
                  Welcome back, {profile?.full_name?.split(' ')[0]}! Here's your platform overview.
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="secondary" className={isSuperAdmin({ role: profile?.role }) ? 'bg-red-500/10 text-red-500' : ''}>
                  <Shield className="h-3 w-3 mr-1" />
                  {isSuperAdmin({ role: profile?.role }) ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-green-500">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12% this month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{stats.activeSubscriptions.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <CreditCard className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-green-500">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8% this month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">${(stats.monthlyRevenue / 100).toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-green-500">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +15% this month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Issues</p>
                <p className="text-2xl font-bold">{stats.pendingIssues}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <div className="flex items-center mt-2 text-xs text-orange-500">
              <Clock className="h-3 w-3 mr-1" />
              Needs attention
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-xl font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Churn Rate</p>
                <p className="text-xl font-bold">{stats.churnRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Clock className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Session</p>
                <p className="text-xl font-bold">{stats.avgSessionTime} min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Signups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{u.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{u.subscription_tier || 'free'}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('customers')}>
                  <Users className="h-5 w-5" />
                  <span className="text-xs">View Users</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('coupons')}>
                  <Ticket className="h-5 w-5" />
                  <span className="text-xs">Create Coupon</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('messaging')}>
                  <Send className="h-5 w-5" />
                  <span className="text-xs">Send Broadcast</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setActiveTab('blog')}>
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">New Blog Post</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )

  // Tier Preview Tab (Super Admin Only)
  const TierPreviewTab = () => {
    const [selectedTier, setSelectedTier] = useState('free')
    const tiers = ['free', 'basic', 'premium', 'ultimate', 'elite']

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Tier Experience Preview
              </CardTitle>
              <CardDescription>
                Preview the user experience for each subscription tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                {tiers.map((tier) => (
                  <Button
                    key={tier}
                    variant={selectedTier === tier ? 'default' : 'outline'}
                    onClick={() => setSelectedTier(tier)}
                    className="capitalize"
                  >
                    {tier === 'elite' && <Crown className="h-4 w-4 mr-1" />}
                    {tier}
                  </Button>
                ))}
              </div>

              <Card className="border-2 border-dashed">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold capitalize">{selectedTier} Tier Preview</h3>
                    <p className="text-muted-foreground">This is how users on this tier see the app</p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Features Available</h4>
                        <ul className="space-y-2 text-sm">
                          {selectedTier === 'free' && (
                            <>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 3 AI messages/day</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Basic tracking</li>
                              <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Meal plans</li>
                              <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Workout plans</li>
                            </>
                          )}
                          {selectedTier === 'basic' && (
                            <>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 5 AI messages/day</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Meal plans</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Workout plans</li>
                              <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Barcode scanner</li>
                            </>
                          )}
                          {selectedTier === 'premium' && (
                            <>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 20 AI messages/day</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Barcode scanner</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Wearable integration</li>
                              <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Nutritionist access</li>
                            </>
                          )}
                          {selectedTier === 'ultimate' && (
                            <>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> 50 AI messages/day</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Nutritionist access</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Advanced analytics</li>
                              <li className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Photo recognition</li>
                            </>
                          )}
                          {selectedTier === 'elite' && (
                            <>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Unlimited AI messages</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Photo recognition</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Doctor consultations</li>
                              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> All features unlocked</li>
                            </>
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Ads Display</h4>
                        {selectedTier === 'free' || selectedTier === 'basic' ? (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                            <Megaphone className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                            <p className="text-sm">Ads are shown to {selectedTier} users</p>
                          </div>
                        ) : (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                            <p className="text-sm">Ad-free experience</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-2">Support Level</h4>
                        <div className="space-y-2">
                          <Badge variant={selectedTier === 'free' ? 'outline' : 'default'}>
                            {selectedTier === 'free' ? 'Community' :
                             selectedTier === 'basic' ? 'Email' :
                             selectedTier === 'premium' ? 'Priority' : 'VIP'}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {selectedTier === 'elite' && 'Dedicated support team'}
                            {selectedTier === 'ultimate' && '4-hour response time'}
                            {selectedTier === 'premium' && '24-hour response time'}
                            {selectedTier === 'basic' && '48-hour response time'}
                            {selectedTier === 'free' && 'Self-service support'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }

  // Analytics Tab
  const AnalyticsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Platform Analytics
            </CardTitle>
            <CardDescription>Detailed metrics and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stats.conversionRate}%</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stats.avgSessionTime}m</p>
                  <p className="text-sm text-muted-foreground">Avg Session</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">4.7</p>
                  <p className="text-sm text-muted-foreground">App Rating</p>
                </CardContent>
              </Card>
            </div>

            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Analytics charts coming soon</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Revenue Tab
  const RevenueTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">${(stats.monthlyRevenue / 100).toLocaleString()}</p>
                  <p className="text-xs text-green-500">+15% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">MRR</p>
                  <p className="text-2xl font-bold">$12,450</p>
                  <p className="text-xs text-muted-foreground">Monthly Recurring</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">ARR</p>
                  <p className="text-2xl font-bold">$149,400</p>
                  <p className="text-xs text-muted-foreground">Annual Recurring</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">LTV</p>
                  <p className="text-2xl font-bold">$285</p>
                  <p className="text-xs text-muted-foreground">Avg Lifetime Value</p>
                </CardContent>
              </Card>
            </div>

            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Revenue charts coming soon</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Errors Tab
  const ErrorsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Error Monitoring
                </CardTitle>
                <CardDescription>Track and resolve application errors</CardDescription>
              </div>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold">All Systems Operational</h3>
              <p className="text-muted-foreground">No critical errors detected</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Customers Tab
  const CustomersTab = () => {
    const [searchQuery, setSearchQuery] = useState('')
    const [tierFilter, setTierFilter] = useState('all')

    const filteredUsers = users.filter(u => {
      const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTier = tierFilter === 'all' || u.subscription_tier === tierFilter
      return matchesSearch && matchesTier
    })

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Management
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="ultimate">Ultimate</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback>{u.full_name?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          u.subscription_tier === 'elite' ? 'default' :
                          u.subscription_tier === 'ultimate' ? 'default' :
                          u.subscription_tier === 'premium' ? 'secondary' : 'outline'
                        } className="capitalize">
                          {u.subscription_tier || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          u.role === 'super_admin' ? 'destructive' :
                          u.role === 'admin' ? 'default' :
                          u.role === 'nutritionist' ? 'secondary' : 'outline'
                        }>
                          {u.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            {isSuperAdmin({ role: profile?.role }) && (
                              <DropdownMenuItem className="text-red-500">
                                <Lock className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    )
  }

  // Subscriptions Tab
  const SubscriptionsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4 mb-6">
              {['free', 'basic', 'premium', 'ultimate', 'elite'].map((tier) => {
                const count = users.filter(u => (u.subscription_tier || 'free') === tier).length
                return (
                  <Card key={tier}>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground capitalize">{tier}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Renews</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No active subscriptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.user_id}</TableCell>
                      <TableCell><Badge className="capitalize">{sub.tier}</Badge></TableCell>
                      <TableCell><Badge variant="default">{sub.status}</Badge></TableCell>
                      <TableCell>{new Date(sub.started_at).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(sub.renews_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Manage</Button>
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

  // Payments Tab
  const PaymentsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment History
              </CardTitle>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No payments recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}...</TableCell>
                      <TableCell>{payment.user_id}</TableCell>
                      <TableCell>${(payment.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
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

  // Coupons Tab
  const CouponsTab = () => {
    const [showCreateDialog, setShowCreateDialog] = useState(false)

    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  Coupon Management
                </CardTitle>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Coupon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No coupons created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>{coupon.discount}%</TableCell>
                        <TableCell>{coupon.uses || 0} / {coupon.max_uses || '∞'}</TableCell>
                        <TableCell>
                          <Badge variant={coupon.active ? 'default' : 'secondary'}>
                            {coupon.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
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

  // Referrals Tab
  const ReferralsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Referral Program
            </CardTitle>
            <CardDescription>Track and manage referral campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">156</p>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">42</p>
                  <p className="text-sm text-muted-foreground">Converted</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">$1,260</p>
                  <p className="text-sm text-muted-foreground">Revenue from Referrals</p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4" />
              <p>Referral tracking details coming soon</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Issues Tab
  const IssuesTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Support Issues
            </CardTitle>
            <CardDescription>Manage customer support tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                      <p className="text-muted-foreground">No open support tickets</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-mono text-xs">#{issue.id.slice(0, 6)}</TableCell>
                      <TableCell>{issue.user_email}</TableCell>
                      <TableCell>{issue.subject}</TableCell>
                      <TableCell>
                        <Badge variant={
                          issue.priority === 'high' ? 'destructive' :
                          issue.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {issue.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View</Button>
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

  // Messaging Tab
  const MessagingTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Broadcast Messaging
            </CardTitle>
            <CardDescription>Send announcements and notifications to users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="free">Free Users</SelectItem>
                  <SelectItem value="paid">Paid Users</SelectItem>
                  <SelectItem value="premium">Premium+</SelectItem>
                  <SelectItem value="elite">Elite Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message Title</Label>
              <Input placeholder="Enter message title..." />
            </div>

            <div className="space-y-2">
              <Label>Message Content</Label>
              <Textarea placeholder="Write your message..." rows={5} />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch id="push" />
                <Label htmlFor="push">Push Notification</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="email" />
                <Label htmlFor="email">Email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="in-app" defaultChecked />
                <Label htmlFor="in-app">In-App</Label>
              </div>
            </div>

            <Button className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send Broadcast
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Blog Tab
  const BlogTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Blog Management
              </CardTitle>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="published">
              <TabsList>
                <TabsTrigger value="published">Published</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              </TabsList>
              <TabsContent value="published" className="mt-4">
                {blogPosts.filter(p => p.status === 'published').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No published posts yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blogPosts.filter(p => p.status === 'published').map((post) => (
                      <Card key={post.id}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{post.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Published {new Date(post.published_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="drafts" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">No drafts</div>
              </TabsContent>
              <TabsContent value="scheduled" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">No scheduled posts</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Website Tab
  const WebsiteTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Website Settings
            </CardTitle>
            <CardDescription>Manage public website content</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="hero">
              <TabsList>
                <TabsTrigger value="hero">Hero Section</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>
              <TabsContent value="hero" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Hero Title</Label>
                  <Input defaultValue="Your AI-Powered Health Companion" />
                </div>
                <div className="space-y-2">
                  <Label>Hero Subtitle</Label>
                  <Textarea defaultValue="Transform your health journey with personalized nutrition and fitness guidance" />
                </div>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </TabsContent>
              <TabsContent value="features" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">Feature editor coming soon</div>
              </TabsContent>
              <TabsContent value="testimonials" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">Testimonials editor coming soon</div>
              </TabsContent>
              <TabsContent value="faq" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">FAQ editor coming soon</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Ads Tab
  const AdsTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Ad Management
            </CardTitle>
            <CardDescription>Configure ads for free/basic tier users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">12,450</p>
                  <p className="text-sm text-muted-foreground">Impressions Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">$245</p>
                  <p className="text-sm text-muted-foreground">Ad Revenue Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">2.4%</p>
                  <p className="text-sm text-muted-foreground">Click-through Rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Ad Placement Settings</h4>
              <div className="space-y-3">
                {[
                  { label: 'Dashboard Banner', description: 'Top banner on user dashboard' },
                  { label: 'Between Content', description: 'Ads between content sections' },
                  { label: 'Rewarded Video', description: 'Optional video ads for rewards' },
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
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // AI Coach Tab
  const AICoachTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Coach Configuration
            </CardTitle>
            <CardDescription>Configure the AI health coach behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">8,542</p>
                  <p className="text-sm text-muted-foreground">Messages Today</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">4.8</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">1.2s</p>
                  <p className="text-sm text-muted-foreground">Avg Response Time</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  rows={6}
                  placeholder="Enter the AI coach's system prompt..."
                  defaultValue="You are GreenoFig's AI health coach. You provide personalized nutrition and fitness advice..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input type="number" step="0.1" min="0" max="2" defaultValue="0.7" />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input type="number" defaultValue="500" />
                </div>
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Studio Tab (Super Admin Only)
  const StudioTab = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-500">
              <Wand2 className="h-5 w-5" />
              Super Admin Studio
            </CardTitle>
            <CardDescription>Advanced platform configuration tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="h-6 w-6 text-blue-500" />
                    <h4 className="font-semibold">Database Tools</h4>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Server className="h-4 w-4 mr-2" />
                      Run Migrations
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start text-red-500">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Layers className="h-6 w-6 text-purple-500" />
                    <h4 className="font-semibold">Feature Flags</h4>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'New Dashboard', enabled: true },
                      { label: 'AI Photo Recognition', enabled: false },
                      { label: 'Wearable Sync V2', enabled: true },
                    ].map((flag, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{flag.label}</span>
                        <Switch defaultChecked={flag.enabled} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-6 w-6 text-green-500" />
                    <h4 className="font-semibold">Security</h4>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Lock className="h-4 w-4 mr-2" />
                      View Audit Log
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="h-4 w-4 mr-2" />
                      Alert Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="h-6 w-6 text-yellow-500" />
                    <h4 className="font-semibold">Performance</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">API Latency</span>
                      <span className="font-medium">45ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DB Queries/min</span>
                      <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Error Rate</span>
                      <span className="font-medium text-green-500">0.02%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />
      case 'tier-preview': return <TierPreviewTab />
      case 'analytics': return <AnalyticsTab />
      case 'revenue': return <RevenueTab />
      case 'errors': return <ErrorsTab />
      case 'customers': return <CustomersTab />
      case 'subscriptions': return <SubscriptionsTab />
      case 'payments': return <PaymentsTab />
      case 'coupons': return <CouponsTab />
      case 'referrals': return <ReferralsTab />
      case 'issues': return <IssuesTab />
      case 'messaging': return <MessagingTab />
      case 'blog': return <BlogTab />
      case 'website': return <WebsiteTab />
      case 'ads': return <AdsTab />
      case 'ai-coach': return <AICoachTab />
      case 'studio': return <StudioTab />
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
                  {profile?.full_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{profile?.full_name || 'Admin'}</p>
                <Badge variant={isSuperAdmin({ role: profile?.role }) ? 'destructive' : 'default'} className="text-xs">
                  {isSuperAdmin({ role: profile?.role }) ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-1">
              {accessibleTabs.map((tab) => (
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
                    {tab.id === 'tier-preview' && (
                      <Badge variant="outline" className="ml-auto text-xs">Super</Badge>
                    )}
                    {tab.id === 'studio' && (
                      <Badge variant="outline" className="ml-auto text-xs">Super</Badge>
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
            {accessibleTabs.slice(0, 5).map((tab) => (
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
