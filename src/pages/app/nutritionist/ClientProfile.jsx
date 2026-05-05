import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowLeft, User, Weight, Ruler, Target, Calendar, TrendingUp,
  TrendingDown, MessageSquare, FileText, Activity, Heart, Droplets,
  Moon, Apple, Dumbbell, Clock, ChevronDown, Plus, Save, Edit2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

// Simple line chart component for weight/measurements over time
function SimpleLineChart({ data, dataKey, color = '#22c55e', label }) {
  if (!data || data.length === 0) return null

  const values = data.map(d => d[dataKey])
  const min = Math.min(...values) - 2
  const max = Math.max(...values) + 2
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100
    const y = 100 - ((d[dataKey] - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>{values[values.length - 1]} {dataKey === 'weight' ? 'kg' : 'cm'}</span>
      </div>
      <div className="relative h-32 bg-muted/30 rounded-lg p-2">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1 || 1)) * 100
            const y = 100 - ((d[dataKey] - min) / range) * 100
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={color}
              />
            )
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
          {data.length > 0 && (
            <>
              <span>{new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClientProfile() {
  const { t } = useTranslation()
  const { clientId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30days')
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [addMeasurementOpen, setAddMeasurementOpen] = useState(false)
  const [newMeasurement, setNewMeasurement] = useState({
    weight: '',
    waist: '',
    chest: '',
    hips: '',
    arms: '',
    notes: ''
  })

  // Mock data for client profile
  const mockClient = {
    id: clientId,
    full_name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '+1 234 567 8900',
    profile_picture_url: null,
    tier: 'Premium',
    status: 'active',
    goal: 'Weight Loss',
    goal_description: 'Lose 8kg in 3 months while maintaining muscle mass',
    start_date: '2024-01-01',
    age: 32,
    height: 165,
    gender: 'Female',
    activity_level: 'Moderate',
    dietary_restrictions: ['Vegetarian', 'Gluten-Free'],
    health_conditions: ['None'],
    current_weight: 68,
    target_weight: 60,
    start_weight: 72,

    // Progress metrics
    overall_progress: 50,
    weight_lost: 4,
    meals_followed: 85,
    workouts_completed: 72,
    water_intake_avg: 2.1,
    sleep_avg: 7.2,

    // Nutritionist notes
    notes: 'Client is making excellent progress. Focus on increasing protein intake and maintaining cardio routine. Consider adjusting meal plan for week 5.',

    // Weight history
    weight_history: [
      { date: '2024-01-01', weight: 72 },
      { date: '2024-01-08', weight: 71.2 },
      { date: '2024-01-15', weight: 70.5 },
      { date: '2024-01-22', weight: 69.8 },
      { date: '2024-01-29', weight: 69.1 },
      { date: '2024-02-05', weight: 68.5 },
      { date: '2024-02-12', weight: 68 },
    ],

    // Body measurements history
    measurements_history: [
      { date: '2024-01-01', waist: 82, chest: 94, hips: 100, arms: 30 },
      { date: '2024-01-15', waist: 80, chest: 93, hips: 98, arms: 29.5 },
      { date: '2024-02-01', waist: 78, chest: 92, hips: 96, arms: 29 },
      { date: '2024-02-12', waist: 77, chest: 91, hips: 95, arms: 28.5 },
    ],

    // Daily logs
    recent_logs: [
      { date: '2024-02-12', calories: 1650, protein: 95, water: 2.5, sleep: 7.5, mood: 'good', exercise: true },
      { date: '2024-02-11', calories: 1580, protein: 88, water: 2.2, sleep: 8, mood: 'great', exercise: false },
      { date: '2024-02-10', calories: 1720, protein: 102, water: 2.0, sleep: 6.5, mood: 'okay', exercise: true },
      { date: '2024-02-09', calories: 1600, protein: 90, water: 2.3, sleep: 7, mood: 'good', exercise: true },
      { date: '2024-02-08', calories: 1550, protein: 85, water: 1.8, sleep: 7.5, mood: 'good', exercise: false },
    ],

    // Appointments
    appointments: [
      { id: 1, date: '2024-02-15', time: '10:00', type: 'Check-in', status: 'upcoming', duration: 30 },
      { id: 2, date: '2024-02-01', time: '14:00', type: 'Progress Review', status: 'completed', duration: 45, notes: 'Reviewed meal plan, client happy with progress' },
      { id: 3, date: '2024-01-15', time: '11:00', type: 'Initial Consultation', status: 'completed', duration: 60, notes: 'Set up initial meal plan and goals' },
    ],

    // Active meal plan
    active_meal_plan: {
      name: 'Weight Loss Phase 2',
      calories_target: 1600,
      protein_target: 100,
      carbs_target: 150,
      fat_target: 55,
      start_date: '2024-02-01',
      end_date: '2024-02-28'
    }
  }

  useEffect(() => {
    fetchClientData()
  }, [clientId])

  const fetchClientData = async () => {
    if (!isSupabaseConfigured()) {
      setClient(mockClient)
      setNotes(mockClient.notes)
      setLoading(false)
      return
    }

    try {
      // Fetch client data from Supabase
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) throw error

      // Format and set client data
      setClient(data || mockClient)
      setNotes(data?.notes || '')
    } catch (error) {
      console.error('Error fetching client:', error)
      setClient(mockClient)
      setNotes(mockClient.notes)
    } finally {
      setLoading(false)
    }
  }

  const saveNotes = async () => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('client_nutritionist')
          .update({ notes })
          .eq('client_id', clientId)
          .eq('nutritionist_id', user?.id)

        if (error) throw error
      }

      setClient(prev => ({ ...prev, notes }))
      setEditingNotes(false)
      toast.success('Notes saved successfully')
    } catch (error) {
      console.error('Error saving notes:', error)
      toast.error('Failed to save notes')
    }
  }

  const handleAddMeasurement = async () => {
    try {
      const measurement = {
        date: new Date().toISOString().split('T')[0],
        weight: parseFloat(newMeasurement.weight) || client.current_weight,
        waist: parseFloat(newMeasurement.waist) || null,
        chest: parseFloat(newMeasurement.chest) || null,
        hips: parseFloat(newMeasurement.hips) || null,
        arms: parseFloat(newMeasurement.arms) || null,
      }

      // In real app, save to Supabase
      setClient(prev => ({
        ...prev,
        current_weight: measurement.weight,
        weight_history: [...prev.weight_history, { date: measurement.date, weight: measurement.weight }],
        measurements_history: [...prev.measurements_history, measurement]
      }))

      setAddMeasurementOpen(false)
      setNewMeasurement({ weight: '', waist: '', chest: '', hips: '', arms: '', notes: '' })
      toast.success('Measurement added successfully')
    } catch (error) {
      console.error('Error adding measurement:', error)
      toast.error('Failed to add measurement')
    }
  }

  const getFilteredData = (data) => {
    if (!data) return []
    const now = new Date()
    let cutoff = new Date()

    switch (dateRange) {
      case '7days':
        cutoff.setDate(now.getDate() - 7)
        break
      case '30days':
        cutoff.setDate(now.getDate() - 30)
        break
      case '90days':
        cutoff.setDate(now.getDate() - 90)
        break
      case 'all':
      default:
        cutoff = new Date('1970-01-01')
    }

    return data.filter(d => new Date(d.date) >= cutoff)
  }

  const getComparison = (current, previous) => {
    if (!previous) return null
    const diff = current - previous
    const percent = ((diff / previous) * 100).toFixed(1)
    return { diff, percent, isPositive: diff > 0 }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => navigate('/app/nutritionist/clients')} className="mt-4">
          Back to Clients
        </Button>
      </div>
    )
  }

  const weightComparison = client.weight_history.length >= 2
    ? getComparison(
        client.weight_history[client.weight_history.length - 1].weight,
        client.weight_history[0].weight
      )
    : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/nutritionist/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Client Profile</h1>
          <p className="text-muted-foreground">View and manage client data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/app/nutritionist/messages?client=${clientId}`)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Message
          </Button>
          <Button onClick={() => navigate(`/app/nutritionist/schedule?client=${clientId}`)}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={client.profile_picture_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {client.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{client.full_name}</h2>
                <p className="text-muted-foreground">{client.email}</p>
                <p className="text-sm text-muted-foreground">{client.phone}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={client.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                    {client.status}
                  </Badge>
                  <Badge className="bg-yellow-500 text-black">{client.tier}</Badge>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-semibold">{client.age} years</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Ruler className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Height</p>
                <p className="font-semibold">{client.height} cm</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Weight className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Current</p>
                <p className="font-semibold">{client.current_weight} kg</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Target className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Target</p>
                <p className="font-semibold">{client.target_weight} kg</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Goal: {client.goal}</span>
              <span className="text-sm text-muted-foreground">
                {client.current_weight - client.target_weight > 0
                  ? `${(client.current_weight - client.target_weight).toFixed(1)} kg to go`
                  : 'Goal reached!'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{client.goal_description}</p>
            <Progress value={client.overall_progress} className="h-2" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Start: {client.start_weight} kg</span>
              <span>{client.overall_progress}% complete</span>
              <span>Target: {client.target_weight} kg</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="measurements">Measurements</TabsTrigger>
          <TabsTrigger value="logs">Daily Logs</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Progress Overview</h3>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{client.weight_lost} kg</p>
                    <p className="text-xs text-muted-foreground">Weight Lost</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Apple className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{client.meals_followed}%</p>
                    <p className="text-xs text-muted-foreground">Meals Followed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Dumbbell className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{client.workouts_completed}%</p>
                    <p className="text-xs text-muted-foreground">Workouts Done</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Droplets className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{client.water_intake_avg}L</p>
                    <p className="text-xs text-muted-foreground">Avg Water</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weight Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Weight Progress</CardTitle>
                {weightComparison && (
                  <Badge variant={weightComparison.diff < 0 ? 'default' : 'secondary'} className={weightComparison.diff < 0 ? 'bg-green-500' : ''}>
                    {weightComparison.diff < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                    {Math.abs(weightComparison.diff).toFixed(1)} kg ({Math.abs(weightComparison.percent)}%)
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <SimpleLineChart
                data={getFilteredData(client.weight_history)}
                dataKey="weight"
                color="#22c55e"
                label="Weight"
              />
            </CardContent>
          </Card>

          {/* Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">This Week vs Last Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {client.weight_history.length >= 2 && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Weight</p>
                        <p className="font-semibold">
                          {client.weight_history[client.weight_history.length - 2]?.weight} kg → {client.current_weight} kg
                        </p>
                      </div>
                      <Badge className={
                        client.current_weight < client.weight_history[client.weight_history.length - 2]?.weight
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }>
                        {(client.current_weight - client.weight_history[client.weight_history.length - 2]?.weight).toFixed(1)} kg
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Calories</p>
                      <p className="font-semibold">1,580 → 1,620 kcal</p>
                    </div>
                    <Badge variant="secondary">+40 kcal</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Workouts</p>
                      <p className="font-semibold">3 → 4 sessions</p>
                    </div>
                    <Badge className="bg-green-500">+1</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Meal Plan</CardTitle>
              </CardHeader>
              <CardContent>
                {client.active_meal_plan ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{client.active_meal_plan.name}</p>
                      <Badge variant="outline">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Calories</p>
                        <p className="font-semibold">{client.active_meal_plan.calories_target} kcal</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Protein</p>
                        <p className="font-semibold">{client.active_meal_plan.protein_target}g</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Carbs</p>
                        <p className="font-semibold">{client.active_meal_plan.carbs_target}g</p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Fat</p>
                        <p className="font-semibold">{client.active_meal_plan.fat_target}g</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(client.active_meal_plan.start_date).toLocaleDateString()} - {new Date(client.active_meal_plan.end_date).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">No active meal plan</p>
                    <Button variant="outline" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Assign Meal Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Body Measurements</h3>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setAddMeasurementOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Measurement
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weight History</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleLineChart
                  data={getFilteredData(client.weight_history)}
                  dataKey="weight"
                  color="#22c55e"
                  label="Weight"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Waist Measurement</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleLineChart
                  data={getFilteredData(client.measurements_history)}
                  dataKey="waist"
                  color="#3b82f6"
                  label="Waist"
                />
              </CardContent>
            </Card>
          </div>

          {/* Measurement History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Measurement History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Weight (kg)</th>
                      <th className="text-right py-2">Waist (cm)</th>
                      <th className="text-right py-2">Chest (cm)</th>
                      <th className="text-right py-2">Hips (cm)</th>
                      <th className="text-right py-2">Arms (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {client.measurements_history.slice().reverse().map((m, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{new Date(m.date).toLocaleDateString()}</td>
                        <td className="text-right">{client.weight_history.find(w => w.date === m.date)?.weight || '-'}</td>
                        <td className="text-right">{m.waist || '-'}</td>
                        <td className="text-right">{m.chest || '-'}</td>
                        <td className="text-right">{m.hips || '-'}</td>
                        <td className="text-right">{m.arms || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Logs Tab */}
        <TabsContent value="logs" className="space-y-4 mt-4">
          <h3 className="font-semibold">Recent Daily Logs</h3>

          <div className="space-y-3">
            {client.recent_logs.map((log, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    <Badge variant={log.mood === 'great' ? 'default' : log.mood === 'good' ? 'secondary' : 'outline'}>
                      {log.mood}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Apple className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-muted-foreground">Calories</p>
                        <p className="font-medium">{log.calories} kcal</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="text-muted-foreground">Protein</p>
                        <p className="font-medium">{log.protein}g</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-muted-foreground">Water</p>
                        <p className="font-medium">{log.water}L</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-muted-foreground">Sleep</p>
                        <p className="font-medium">{log.sleep}h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-muted-foreground">Exercise</p>
                        <p className="font-medium">{log.exercise ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Appointments</h3>
            <Button onClick={() => navigate(`/app/nutritionist/schedule?client=${clientId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Session
            </Button>
          </div>

          <div className="space-y-3">
            {client.appointments.map((apt) => (
              <Card key={apt.id} className={apt.status === 'upcoming' ? 'border-primary' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${apt.status === 'upcoming' ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Calendar className={`h-5 w-5 ${apt.status === 'upcoming' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{apt.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {apt.time}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{apt.duration} min</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={apt.status === 'upcoming' ? 'default' : 'secondary'}>
                      {apt.status}
                    </Badge>
                  </div>
                  {apt.notes && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">{apt.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Nutritionist Notes</h3>
            {!editingNotes && (
              <Button variant="outline" onClick={() => setEditingNotes(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Notes
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-4">
              {editingNotes ? (
                <div className="space-y-4">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    placeholder="Add notes about this client..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setNotes(client.notes); setEditingNotes(false) }}>
                      Cancel
                    </Button>
                    <Button onClick={saveNotes}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {notes ? (
                    <p className="whitespace-pre-wrap">{notes}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No notes yet. Click "Edit Notes" to add some.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dietary Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dietary Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Dietary Restrictions</p>
                  <div className="flex flex-wrap gap-2">
                    {client.dietary_restrictions?.map((r, i) => (
                      <Badge key={i} variant="outline">{r}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Health Conditions</p>
                  <div className="flex flex-wrap gap-2">
                    {client.health_conditions?.map((c, i) => (
                      <Badge key={i} variant="outline">{c}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Activity Level</p>
                  <Badge>{client.activity_level}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Start Date</p>
                  <p className="font-medium">{new Date(client.start_date).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Measurement Dialog */}
      <Dialog open={addMeasurementOpen} onOpenChange={setAddMeasurementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Measurement</DialogTitle>
            <DialogDescription>Record new body measurements for this client</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={newMeasurement.weight}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, weight: e.target.value })}
                placeholder={client.current_weight.toString()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">Waist (cm)</Label>
              <Input
                id="waist"
                type="number"
                step="0.1"
                value={newMeasurement.waist}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, waist: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chest">Chest (cm)</Label>
              <Input
                id="chest"
                type="number"
                step="0.1"
                value={newMeasurement.chest}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, chest: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hips">Hips (cm)</Label>
              <Input
                id="hips"
                type="number"
                step="0.1"
                value={newMeasurement.hips}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, hips: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="arms">Arms (cm)</Label>
              <Input
                id="arms"
                type="number"
                step="0.1"
                value={newMeasurement.arms}
                onChange={(e) => setNewMeasurement({ ...newMeasurement, arms: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMeasurementOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeasurement}>
              Add Measurement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
