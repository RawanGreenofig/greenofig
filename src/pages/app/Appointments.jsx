import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, Video, Phone, MapPin, User, Plus,
  CheckCircle, XCircle, AlertCircle, Lock, Crown, Star,
  ChevronLeft, ChevronRight, MessageSquare
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function Appointments() {
  const { t } = useTranslation()
  const { user, userProfile } = useAuth()
  const tier = userProfile?.tier || 'Free'
  const canBook = tier === 'Premium' || tier === 'Elite'
  const consultationsPerMonth = tier === 'Elite' ? 'Unlimited' : tier === 'Premium' ? '2' : '0'

  const [appointments, setAppointments] = useState([])
  const [nutritionists, setNutritionists] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookDialogOpen, setBookDialogOpen] = useState(false)
  const [selectedNutritionist, setSelectedNutritionist] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [appointmentType, setAppointmentType] = useState('video')
  const [notes, setNotes] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      setAppointments([
        {
          id: '1',
          nutritionist: { name: 'Dr. Sarah Johnson', avatar: null, specialty: 'Weight Management' },
          date: '2024-01-30',
          time: '10:00 AM',
          type: 'video',
          status: 'confirmed',
          duration: 30,
          notes: 'Weekly check-in'
        },
        {
          id: '2',
          nutritionist: { name: 'Dr. Sarah Johnson', avatar: null, specialty: 'Weight Management' },
          date: '2024-02-06',
          time: '10:00 AM',
          type: 'video',
          status: 'pending',
          duration: 30,
          notes: 'Meal plan review'
        },
        {
          id: '3',
          nutritionist: { name: 'Dr. Sarah Johnson', avatar: null, specialty: 'Weight Management' },
          date: '2024-01-23',
          time: '2:00 PM',
          type: 'video',
          status: 'completed',
          duration: 30,
          notes: 'Initial consultation'
        },
      ])
      setNutritionists([
        { id: '1', name: 'Dr. Sarah Johnson', avatar: null, specialty: 'Weight Management', rating: 4.9, reviews: 127 },
        { id: '2', name: 'Dr. Michael Chen', avatar: null, specialty: 'Sports Nutrition', rating: 4.8, reviews: 98 },
        { id: '3', name: 'Dr. Emily Wilson', avatar: null, specialty: 'Clinical Nutrition', rating: 4.9, reviews: 156 },
      ])
      setLoading(false)
      return
    }

    try {
      const { data: apps } = await supabase
        .from('appointments')
        .select(`
          *,
          nutritionist:nutritionist_id (full_name, profile_picture_url)
        `)
        .eq('client_id', user?.id)
        .order('scheduled_at', { ascending: false })

      const { data: nuts } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'nutritionist')
        .eq('is_verified', true)

      setAppointments(apps || [])
      setNutritionists(nuts || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour}:00`)
      if (hour < 17) slots.push(`${hour}:30`)
    }
    return slots
  }

  const openBookDialog = (nutritionist = null) => {
    setSelectedNutritionist(nutritionist)
    setSelectedDate('')
    setSelectedTime('')
    setAppointmentType('video')
    setNotes('')
    setAvailableSlots(generateTimeSlots())
    setBookDialogOpen(true)
  }

  const bookAppointment = async () => {
    if (!selectedNutritionist || !selectedDate || !selectedTime) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!isSupabaseConfigured()) {
      const newAppointment = {
        id: Date.now().toString(),
        nutritionist: selectedNutritionist,
        date: selectedDate,
        time: selectedTime,
        type: appointmentType,
        status: 'pending',
        duration: 30,
        notes: notes
      }
      setAppointments([newAppointment, ...appointments])
      toast.success('Appointment request sent!')
      setBookDialogOpen(false)
      return
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: user?.id,
          nutritionist_id: selectedNutritionist.id,
          scheduled_at: `${selectedDate}T${selectedTime}:00`,
          type: appointmentType,
          status: 'pending',
          duration: 30,
          notes: notes
        })

      if (error) throw error

      toast.success('Appointment request sent!')
      setBookDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error booking appointment:', error)
      toast.error('Failed to book appointment')
    }
  }

  const cancelAppointment = async (appointmentId) => {
    if (!isSupabaseConfigured()) {
      setAppointments(appointments.filter(a => a.id !== appointmentId))
      toast.success('Appointment cancelled')
      return
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Appointment cancelled')
      fetchData()
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Failed to cancel appointment')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'in_person': return <MapPin className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const upcomingAppointments = appointments.filter(a =>
    ['confirmed', 'pending'].includes(a.status) && new Date(a.date) >= new Date()
  )
  const pastAppointments = appointments.filter(a =>
    a.status === 'completed' || new Date(a.date) < new Date()
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show upgrade prompt for free/basic users
  if (!canBook) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Unlock Nutritionist Consultations</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade to Premium or Elite to book video consultations with our certified nutritionists
              for personalized guidance on your health journey.
            </p>
            <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>1-on-1 video consultations</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Personalized nutrition advice</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Progress reviews and plan adjustments</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Direct messaging with your nutritionist</span>
              </div>
            </div>
            <Button size="lg" asChild>
              <Link to="/pricing">
                <Crown className="mr-2 h-5 w-5" />
                Upgrade to Premium
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Schedule and manage your nutritionist consultations</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1">
            {consultationsPerMonth} consultations/month
          </Badge>
          <Button onClick={() => openBookDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Book Appointment
          </Button>
        </div>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your scheduled consultations</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length > 0 ? (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={appointment.nutritionist?.avatar} />
                      <AvatarFallback className="bg-purple-500 text-white">
                        {appointment.nutritionist?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{appointment.nutritionist?.name}</h4>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(appointment.date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {appointment.time}
                        </span>
                        <span className="flex items-center gap-1">
                          {getTypeIcon(appointment.type)}
                          {appointment.type === 'video' ? 'Video Call' : appointment.type}
                        </span>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === 'confirmed' && (
                      <Button size="sm" className="bg-green-500 hover:bg-green-600">
                        <Video className="mr-2 h-4 w-4" />
                        Join Call
                      </Button>
                    )}
                    {['pending', 'confirmed'].includes(appointment.status) && (
                      <Button size="sm" variant="outline" onClick={() => cancelAppointment(appointment.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No upcoming appointments</p>
              <Button onClick={() => openBookDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Book Your First Appointment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Nutritionists */}
      <Card>
        <CardHeader>
          <CardTitle>Our Nutritionists</CardTitle>
          <CardDescription>Book a consultation with one of our experts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {nutritionists.map((nutritionist) => (
              <Card key={nutritionist.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={nutritionist.avatar} />
                      <AvatarFallback className="bg-purple-500 text-white">
                        {nutritionist.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{nutritionist.name}</h4>
                      <p className="text-sm text-muted-foreground">{nutritionist.specialty}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{nutritionist.rating}</span>
                    <span className="text-sm text-muted-foreground">({nutritionist.reviews} reviews)</span>
                  </div>
                  <Button className="w-full" onClick={() => openBookDialog(nutritionist)}>
                    Book Appointment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
            <CardDescription>Your consultation history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gray-300">
                        {appointment.nutritionist?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{appointment.nutritionist?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Book Appointment Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book Appointment</DialogTitle>
            <DialogDescription>
              Schedule a consultation with {selectedNutritionist?.name || 'a nutritionist'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedNutritionist && (
              <div className="space-y-2">
                <Label>Select Nutritionist</Label>
                <Select onValueChange={(v) => setSelectedNutritionist(nutritionists.find(n => n.id === v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a nutritionist" />
                  </SelectTrigger>
                  <SelectContent>
                    {nutritionists.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name} - {n.specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Date</Label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Consultation Type</Label>
              <Select value={appointmentType} onValueChange={setAppointmentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Call
                    </div>
                  </SelectItem>
                  <SelectItem value="phone">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Call
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What would you like to discuss?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookDialogOpen(false)}>Cancel</Button>
            <Button onClick={bookAppointment}>Book Appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
