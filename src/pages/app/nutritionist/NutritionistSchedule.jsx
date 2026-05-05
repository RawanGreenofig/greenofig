import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, Plus, ChevronLeft, ChevronRight, User,
  Video, Phone, MapPin, MoreVertical, CheckCircle, XCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function NutritionistSchedule() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    date: '',
    time: '',
    duration: '30',
    type: 'video',
    notes: ''
  })

  useEffect(() => {
    fetchAppointments()
  }, [currentDate])

  const fetchAppointments = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      const today = new Date()
      setAppointments([
        { id: '1', client_name: 'Sarah Johnson', date: today.toISOString().split('T')[0], time: '09:00', duration: 30, type: 'video', status: 'confirmed' },
        { id: '2', client_name: 'Mike Chen', date: today.toISOString().split('T')[0], time: '10:30', duration: 45, type: 'video', status: 'confirmed' },
        { id: '3', client_name: 'Emma Wilson', date: today.toISOString().split('T')[0], time: '14:00', duration: 30, type: 'phone', status: 'pending' },
        { id: '4', client_name: 'John Doe', date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], time: '11:00', duration: 60, type: 'in-person', status: 'confirmed' },
        { id: '5', client_name: 'Lisa Brown', date: new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0], time: '15:30', duration: 30, type: 'video', status: 'confirmed' },
      ])
      setLoading(false)
      return
    }

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          user_profiles (full_name)
        `)
        .eq('nutritionist_id', user?.id)
        .gte('scheduled_at', startOfMonth.toISOString())
        .lte('scheduled_at', endOfMonth.toISOString())
        .order('scheduled_at', { ascending: true })

      if (error) throw error

      setAppointments(data?.map(apt => ({
        id: apt.id,
        client_name: apt.user_profiles?.full_name,
        date: apt.scheduled_at.split('T')[0],
        time: new Date(apt.scheduled_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
        duration: apt.duration,
        type: apt.type,
        status: apt.status
      })) || [])
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Failed to fetch appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.client_id || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!isSupabaseConfigured()) {
      const newAppointment = {
        id: Date.now().toString(),
        client_name: 'New Client',
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        type: formData.type,
        status: 'pending'
      }
      setAppointments([...appointments, newAppointment])
      toast.success('Appointment created')
      setCreateDialogOpen(false)
      resetForm()
      return
    }

    try {
      const scheduledAt = new Date(`${formData.date}T${formData.time}`)

      const { error } = await supabase
        .from('appointments')
        .insert([{
          nutritionist_id: user?.id,
          client_id: formData.client_id,
          scheduled_at: scheduledAt.toISOString(),
          duration: parseInt(formData.duration),
          type: formData.type,
          notes: formData.notes,
          status: 'pending'
        }])

      if (error) throw error

      toast.success('Appointment created')
      setCreateDialogOpen(false)
      resetForm()
      fetchAppointments()
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error('Failed to create appointment')
    }
  }

  const updateAppointmentStatus = async (id, status) => {
    if (!isSupabaseConfigured()) {
      setAppointments(appointments.map(apt =>
        apt.id === id ? { ...apt, status } : apt
      ))
      toast.success(`Appointment ${status}`)
      return
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)

      if (error) throw error

      setAppointments(appointments.map(apt =>
        apt.id === id ? { ...apt, status } : apt
      ))
      toast.success(`Appointment ${status}`)
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment')
    }
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      date: '',
      time: '',
      duration: '30',
      type: 'video',
      notes: ''
    })
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getAppointmentsForDate = (date) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === dateStr)
  }

  const selectedDateAppointments = getAppointmentsForDate(selectedDate)

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'phone':
        return <Phone className="h-4 w-4" />
      case 'in-person':
        return <MapPin className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
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
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Manage your appointments</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth().map((date, index) => {
                const dateAppointments = getAppointmentsForDate(date)
                const isToday = date && date.toDateString() === new Date().toDateString()
                const isSelected = date && date.toDateString() === selectedDate.toDateString()

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[80px] p-2 rounded-lg cursor-pointer transition-colors
                      ${date ? 'hover:bg-muted/50' : ''}
                      ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''}
                      ${isToday && !isSelected ? 'bg-muted' : ''}
                    `}
                    onClick={() => date && setSelectedDate(date)}
                  >
                    {date && (
                      <>
                        <span className={`text-sm ${isToday ? 'font-bold text-primary' : ''}`}>
                          {date.getDate()}
                        </span>
                        {dateAppointments.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {dateAppointments.slice(0, 2).map(apt => (
                              <div
                                key={apt.id}
                                className="text-xs bg-primary/20 text-primary rounded px-1 py-0.5 truncate"
                              >
                                {apt.time} - {apt.client_name?.split(' ')[0]}
                              </div>
                            ))}
                            {dateAppointments.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dateAppointments.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate.toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
            </CardTitle>
            <CardDescription>
              {selectedDateAppointments.length} appointment(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedDateAppointments.map((apt) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {apt.client_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{apt.client_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>{apt.time}</span>
                          <span>•</span>
                          <span>{apt.duration} min</span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Confirm
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateAppointmentStatus(apt.id, 'completed')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Complete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                          className="text-destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {getTypeIcon(apt.type)}
                    <span className="text-sm capitalize">{apt.type}</span>
                    {getStatusBadge(apt.status)}
                  </div>
                </motion.div>
              ))}
              {selectedDateAppointments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No appointments scheduled</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setFormData({ ...formData, date: selectedDate.toISOString().split('T')[0] })
                      setCreateDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Appointment
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Appointment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription>
              Schedule an appointment with a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => setFormData({ ...formData, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sarah Johnson</SelectItem>
                  <SelectItem value="2">Mike Chen</SelectItem>
                  <SelectItem value="3">Emma Wilson</SelectItem>
                  <SelectItem value="4">John Doe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={formData.duration}
                  onValueChange={(v) => setFormData({ ...formData, duration: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
