import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MessageSquare, Search, Filter, MoreVertical, Clock, User,
  CheckCircle, AlertCircle, XCircle, Send, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminSupport() {
  const { t } = useTranslation()
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [ticketResponses, setTicketResponses] = useState([])

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      const mockTickets = [
        { id: '1', subject: 'Billing issue with subscription', user_name: 'Sarah Johnson', user_email: 'sarah@example.com', status: 'open', priority: 'high', category: 'Billing', created_at: '2024-01-25T10:30:00', message: 'I was charged twice for my subscription this month. Please help resolve this issue.' },
        { id: '2', subject: 'Feature request: Dark mode', user_name: 'Mike Chen', user_email: 'mike@example.com', status: 'in_progress', priority: 'medium', category: 'Feature Request', created_at: '2024-01-24T14:20:00', message: 'Would love to see a dark mode option for the mobile app.' },
        { id: '3', subject: 'Cannot access AI Coach', user_name: 'Emma Wilson', user_email: 'emma@example.com', status: 'open', priority: 'urgent', category: 'Technical', created_at: '2024-01-25T09:15:00', message: 'The AI Coach feature keeps showing an error when I try to start a conversation.' },
        { id: '4', subject: 'How to cancel subscription?', user_name: 'John Doe', user_email: 'john@example.com', status: 'resolved', priority: 'low', category: 'Account', created_at: '2024-01-23T16:45:00', message: 'I need help finding where to cancel my subscription in the settings.' },
        { id: '5', subject: 'App crashes on launch', user_name: 'Lisa Brown', user_email: 'lisa@example.com', status: 'in_progress', priority: 'high', category: 'Technical', created_at: '2024-01-24T11:00:00', message: 'The iOS app crashes immediately after opening. Running iOS 17.2 on iPhone 15.' },
      ]
      setTickets(mockTickets)
      setStats({
        total: 5,
        open: 2,
        inProgress: 2,
        resolved: 1
      })
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          user_profiles (full_name, email)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedData = data?.map(ticket => ({
        ...ticket,
        user_name: ticket.user_profiles?.full_name,
        user_email: ticket.user_profiles?.email
      })) || []

      setTickets(formattedData)

      const open = formattedData.filter(t => t.status === 'open').length
      const inProgress = formattedData.filter(t => t.status === 'in_progress').length
      const resolved = formattedData.filter(t => t.status === 'resolved').length

      setStats({
        total: formattedData.length,
        open,
        inProgress,
        resolved
      })
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  const openTicketDetails = async (ticket) => {
    setSelectedTicket(ticket)
    setTicketDialogOpen(true)

    // Mock responses
    if (!isSupabaseConfigured()) {
      setTicketResponses([
        { id: '1', message: 'Thank you for contacting us. We are looking into this issue.', is_admin: true, created_at: '2024-01-25T11:00:00' },
        { id: '2', message: 'Please provide your transaction ID so we can investigate further.', is_admin: true, created_at: '2024-01-25T11:30:00' },
      ])
      return
    }

    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setTicketResponses(data || [])
    } catch (error) {
      console.error('Error fetching responses:', error)
    }
  }

  const updateTicketStatus = async (ticketId, newStatus) => {
    if (!isSupabaseConfigured()) {
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }
      toast.success('Status updated')
      return
    }

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (error) throw error

      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus })
      }
      toast.success('Status updated')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const sendReply = async () => {
    if (!replyText.trim()) return

    const newResponse = {
      id: Date.now().toString(),
      message: replyText,
      is_admin: true,
      created_at: new Date().toISOString()
    }

    if (!isSupabaseConfigured()) {
      setTicketResponses([...ticketResponses, newResponse])
      setReplyText('')
      toast.success('Reply sent')
      return
    }

    try {
      const { error } = await supabase
        .from('ticket_responses')
        .insert([{
          ticket_id: selectedTicket.id,
          message: replyText,
          is_admin: true
        }])

      if (error) throw error

      setTicketResponses([...ticketResponses, newResponse])
      setReplyText('')
      toast.success('Reply sent')
    } catch (error) {
      console.error('Error sending reply:', error)
      toast.error('Failed to send reply')
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Open</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>
      case 'resolved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>
      case 'closed':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-600">Urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>
      case 'low':
        return <Badge variant="secondary">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return `${Math.floor(diffInHours / 24)}d ago`
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
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">Manage customer support requests</p>
        </div>
        <Button onClick={fetchTickets}>
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
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
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
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
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
                placeholder="Search tickets..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredTickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-muted/30 cursor-pointer"
                onClick={() => openTicketDetails(ticket)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {ticket.user_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{ticket.subject}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{ticket.user_name}</span>
                        <span>•</span>
                        <span>{ticket.category}</span>
                        <span>•</span>
                        <span>{getTimeAgo(ticket.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No tickets found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Details Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedTicket?.subject}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span>{selectedTicket?.user_name}</span>
              <span>•</span>
              <span>{selectedTicket?.user_email}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 py-2">
            {getStatusBadge(selectedTicket?.status)}
            {getPriorityBadge(selectedTicket?.priority)}
            <Badge variant="outline">{selectedTicket?.category}</Badge>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Original Message */}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{selectedTicket?.message}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedTicket?.created_at && new Date(selectedTicket.created_at).toLocaleString()}
              </p>
            </div>

            {/* Responses */}
            {ticketResponses.map((response) => (
              <div
                key={response.id}
                className={`p-4 rounded-lg ${response.is_admin ? 'bg-primary/10 ml-8' : 'bg-muted mr-8'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={response.is_admin ? 'default' : 'secondary'}>
                    {response.is_admin ? 'Support' : 'User'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(response.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{response.message}</p>
              </div>
            ))}
          </div>

          {/* Reply Input */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={selectedTicket?.status === 'open' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateTicketStatus(selectedTicket?.id, 'open')}
              >
                Open
              </Button>
              <Button
                variant={selectedTicket?.status === 'in_progress' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateTicketStatus(selectedTicket?.id, 'in_progress')}
              >
                In Progress
              </Button>
              <Button
                variant={selectedTicket?.status === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateTicketStatus(selectedTicket?.id, 'resolved')}
              >
                Resolved
              </Button>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                className="flex-1"
              />
              <Button onClick={sendReply} disabled={!replyText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
