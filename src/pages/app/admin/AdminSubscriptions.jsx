import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  CreditCard, Search, Filter, MoreVertical, Calendar, DollarSign,
  TrendingUp, AlertCircle, CheckCircle, XCircle, Clock, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminSubscriptions() {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    cancelled: 0,
    revenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      const mockSubs = [
        { id: '1', user_email: 'sarah@example.com', user_name: 'Sarah Johnson', plan: 'Premium', status: 'active', amount: 29.99, start_date: '2024-01-01', next_billing: '2024-02-01' },
        { id: '2', user_email: 'mike@example.com', user_name: 'Mike Chen', plan: 'Basic', status: 'active', amount: 9.99, start_date: '2024-01-05', next_billing: '2024-02-05' },
        { id: '3', user_email: 'emma@example.com', user_name: 'Emma Wilson', plan: 'Premium', status: 'cancelled', amount: 29.99, start_date: '2023-11-01', end_date: '2024-01-15' },
        { id: '4', user_email: 'john@example.com', user_name: 'John Doe', plan: 'Basic', status: 'past_due', amount: 9.99, start_date: '2024-01-10', next_billing: '2024-02-10' },
        { id: '5', user_email: 'lisa@example.com', user_name: 'Lisa Brown', plan: 'Premium', status: 'active', amount: 29.99, start_date: '2024-01-12', next_billing: '2024-02-12' },
      ]
      setSubscriptions(mockSubs)
      setStats({
        total: 5,
        active: 3,
        cancelled: 1,
        revenue: 109.95
      })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          user_profiles (full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.map(sub => ({
        ...sub,
        user_name: sub.user_profiles?.full_name,
        user_email: sub.user_profiles?.email
      })) || []

      setSubscriptions(formattedData)

      const active = formattedData.filter(s => s.status === 'active').length
      const cancelled = formattedData.filter(s => s.status === 'cancelled').length
      const revenue = formattedData
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.amount || 0), 0)

      setStats({
        total: formattedData.length,
        active,
        cancelled,
        revenue
      })
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      toast.error('Failed to fetch subscriptions')
    } finally {
      setLoading(false)
    }
  }

  const cancelSubscription = async (subscription) => {
    if (!isSupabaseConfigured()) {
      setSubscriptions(subscriptions.map(s =>
        s.id === subscription.id ? { ...s, status: 'cancelled' } : s
      ))
      toast.success('Subscription cancelled')
      return
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', end_date: new Date().toISOString() })
        .eq('id', subscription.id)

      if (error) throw error

      setSubscriptions(subscriptions.map(s =>
        s.id === subscription.id ? { ...s, status: 'cancelled' } : s
      ))
      toast.success('Subscription cancelled')
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error('Failed to cancel subscription')
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
    const matchesPlan = planFilter === 'all' || sub.plan === planFilter
    return matchesSearch && matchesStatus && matchesPlan
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      case 'past_due':
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />Past Due</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Trial</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getPlanBadge = (plan) => {
    switch (plan) {
      case 'Premium':
        return <Badge className="bg-yellow-500 text-black">Premium</Badge>
      case 'Basic':
        return <Badge className="bg-blue-500">Basic</Badge>
      default:
        return <Badge variant="outline">{plan}</Badge>
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
          <h1 className="text-2xl font-bold">Subscription Management</h1>
          <p className="text-muted-foreground">Manage all platform subscriptions</p>
        </div>
        <Button onClick={fetchSubscriptions}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.cancelled}</p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.revenue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Basic">Basic</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Start Date</th>
                  <th className="text-left p-4 font-medium">Next Billing</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub, index) => (
                  <motion.tr
                    key={sub.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{sub.user_name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                      </div>
                    </td>
                    <td className="p-4">{getPlanBadge(sub.plan)}</td>
                    <td className="p-4">{getStatusBadge(sub.status)}</td>
                    <td className="p-4 font-medium">${sub.amount?.toFixed(2) || '0.00'}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(sub.start_date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {sub.status === 'cancelled'
                        ? 'N/A'
                        : sub.next_billing
                          ? new Date(sub.next_billing).toLocaleDateString()
                          : '-'
                      }
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Calendar className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Upgrade Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => cancelSubscription(sub)}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Subscription
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No subscriptions found matching your criteria
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
