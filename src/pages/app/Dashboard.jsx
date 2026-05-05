import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp,
  Utensils,
  Dumbbell,
  Flame,
  Droplets,
  Moon,
  Target,
  Trophy,
  Calendar,
  ArrowRight,
  Plus,
  Lock,
  Crown,
  Bot,
  Scale
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { QuickLogCard } from '@/components/dashboard/QuickLogCard'

// Streak = consecutive days (ending today or yesterday) with at least one meal log
function computeStreak(logs) {
  if (!logs || logs.length === 0) return 0
  const dayKeys = new Set(logs.map(l => new Date(l.logged_at).toISOString().split('T')[0]))
  let streak = 0
  const cursor = new Date()
  if (!dayKeys.has(cursor.toISOString().split('T')[0])) {
    cursor.setDate(cursor.getDate() - 1)
    if (!dayKeys.has(cursor.toISOString().split('T')[0])) return 0
  }
  while (dayKeys.has(cursor.toISOString().split('T')[0])) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 172800) return 'Yesterday'
  return `${Math.floor(seconds / 86400)} days ago`
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    calories: { value: 0, target: 2200 },
    protein: { value: 0, target: 120 },
    water: { value: 0, target: 8 },
    sleep: { value: 0, target: 8 },
    streak: 0,
    weight: { current: 0, target: 0, start: 0 }
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])

  const tier = userProfile?.tier || 'Free'
  const isPremium = tier === 'Premium' || tier === 'Elite'
  const isBasicOrHigher = tier === 'Basic' || tier === 'Premium' || tier === 'Elite'
  const isStaff = ['nutritionist', 'admin', 'super_admin'].includes(userProfile?.role)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      // Mock data
      setStats({
        calories: { value: 1850, target: 2200 },
        protein: { value: 95, target: 120 },
        water: { value: 6, target: 8 },
        sleep: { value: 7.5, target: 8 },
        streak: 7,
        weight: { current: 72, target: 68, start: 78 }
      })
      setRecentActivities([
        { type: 'meal', title: 'Logged breakfast', time: '2 hours ago', icon: Utensils },
        { type: 'workout', title: 'Completed workout', time: '5 hours ago', icon: Dumbbell },
        { type: 'achievement', title: 'Earned "7-Day Streak"', time: 'Yesterday', icon: Trophy },
        { type: 'goal', title: 'Updated weight goal', time: '2 days ago', icon: Target },
      ])
      setUpcomingEvents([
        { title: 'Nutritionist Call', date: 'Tomorrow, 10:00 AM', type: 'appointment' },
        { title: 'Weekly Check-in', date: 'Friday, 9:00 AM', type: 'reminder' },
      ])
      setLoading(false)
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // Fetch today's meal logs
      const { data: mealLogs } = await supabase
        .from('meal_logs')
        .select('id, meal_type, food_name, calories, protein, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', today)
        .order('logged_at', { ascending: false })

      const totalCalories = mealLogs?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0
      const totalProtein = mealLogs?.reduce((sum, log) => sum + Number(log.protein || 0), 0) || 0

      // Fetch today's water logs (glasses, not ml)
      const { data: waterLogs } = await supabase
        .from('water_logs')
        .select('glasses')
        .eq('user_id', user.id)
        .gte('logged_at', today)

      const totalGlasses = waterLogs?.reduce((sum, log) => sum + (log.glasses || 0), 0) || 0

      // Fetch latest weight
      const { data: weightLogs } = await supabase
        .from('weight_logs')
        .select('weight, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)

      // Fetch user survey for targets (maybeSingle to allow zero rows)
      const { data: survey } = await supabase
        .from('user_surveys')
        .select('current_weight, target_weight')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Fetch upcoming appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, title, appointment_type, scheduled_at, status')
        .eq('user_id', user.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(3)

      // Fetch recent activity from logs (meals, workouts, weight, achievements)
      const [{ data: recentMeals }, { data: recentWorkouts }, { data: recentWeights }, { data: recentAchievements }] = await Promise.all([
        supabase
          .from('meal_logs')
          .select('id, meal_type, food_name, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(3),
        supabase
          .from('workout_logs')
          .select('id, exercise_name, workout_type, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(3),
        supabase
          .from('weight_logs')
          .select('id, weight, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(2),
        supabase
          .from('user_achievements')
          .select('id, earned_at, achievements(name)')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(2)
      ])

      // Fetch last 30 days of meal logs to compute streak
      const { data: streakMeals } = await supabase
        .from('meal_logs')
        .select('logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', thirtyDaysAgo)
        .order('logged_at', { ascending: false })

      const streak = computeStreak(streakMeals || [])

      const currentWeight = weightLogs?.[0]?.weight || Number(survey?.current_weight) || 0
      const targetWeight = Number(survey?.target_weight) || 0
      const startWeight = Number(survey?.current_weight) || currentWeight

      setStats({
        calories: { value: totalCalories, target: 2200 },
        protein: { value: Math.round(totalProtein), target: 120 },
        water: { value: totalGlasses, target: 8 },
        sleep: { value: 7.5, target: 8 },
        streak,
        weight: {
          current: Number(currentWeight),
          target: Number(targetWeight),
          start: Number(startWeight)
        }
      })

      setUpcomingEvents((appointments || []).map(apt => ({
        title: apt.title || apt.appointment_type || 'Appointment',
        date: new Date(apt.scheduled_at).toLocaleString('en', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        type: 'appointment'
      })))

      // Build recent activity feed from real logs
      const activities = []
      ;(recentMeals || []).forEach(m => activities.push({
        type: 'meal',
        title: `Logged ${m.meal_type}: ${m.food_name}`,
        time: timeAgo(m.logged_at),
        when: m.logged_at,
        icon: Utensils
      }))
      ;(recentWorkouts || []).forEach(w => activities.push({
        type: 'workout',
        title: `Completed ${w.exercise_name}`,
        time: timeAgo(w.logged_at),
        when: w.logged_at,
        icon: Dumbbell
      }))
      ;(recentWeights || []).forEach(w => activities.push({
        type: 'weight',
        title: `Logged weight: ${w.weight}kg`,
        time: timeAgo(w.logged_at),
        when: w.logged_at,
        icon: Scale
      }))
      ;(recentAchievements || []).forEach(a => activities.push({
        type: 'achievement',
        title: `Earned "${a.achievements?.name || 'Achievement'}"`,
        time: timeAgo(a.earned_at),
        when: a.earned_at,
        icon: Trophy
      }))

      activities.sort((a, b) => new Date(b.when) - new Date(a.when))
      setRecentActivities(activities.slice(0, 6))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.greeting.morning')
    if (hour < 18) return t('dashboard.greeting.afternoon')
    return t('dashboard.greeting.evening')
  }

  const quickStats = [
    { label: t('dashboard.stats.calories'), value: stats.calories.value, target: stats.calories.target, icon: Flame, color: 'text-orange-500' },
    { label: t('dashboard.stats.protein'), value: stats.protein.value, target: stats.protein.target, unit: 'g', icon: Target, color: 'text-blue-500' },
    { label: t('dashboard.stats.water'), value: stats.water.value, target: stats.water.target, unit: t('dashboard.stats.cups'), icon: Droplets, color: 'text-cyan-500' },
    { label: t('dashboard.stats.sleep'), value: stats.sleep.value, target: stats.sleep.target, unit: t('dashboard.stats.hrs'), icon: Moon, color: 'text-purple-500' },
  ]

  // Calculate weight progress
  const weightProgress = stats.weight.start && stats.weight.target
    ? Math.min(100, Math.max(0, ((stats.weight.start - stats.weight.current) / (stats.weight.start - stats.weight.target)) * 100))
    : 0

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
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userProfile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground">{t('dashboard.summary')}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isStaff && (
            <Badge variant={isPremium ? 'default' : 'secondary'} className={isPremium ? 'bg-yellow-500 text-black' : ''}>
              {isPremium && <Crown className="h-3 w-3 mr-1" />}
              {tier}
            </Badge>
          )}
          <Button variant="outline" asChild>
            <Link to="/app/ai-coach">
              <Bot className="me-2 h-4 w-4" />
              {t('dashboard.askAiCoach')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app/nutrition">
              <Plus className="me-2 h-4 w-4" />
              {t('dashboard.logMeal')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Upgrade Banner for Free Users (never shown to staff) */}
      {!isStaff && tier === 'Free' && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/20 rounded-full">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Upgrade to Premium</p>
                <p className="text-sm text-muted-foreground">Unlock AI coaching, nutritionist access, and more!</p>
              </div>
            </div>
            <Button asChild>
              <Link to="/pricing">Upgrade Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">
                    / {stat.target}{stat.unit || ''}
                  </span>
                </div>
                <Progress
                  value={(stat.value / stat.target) * 100}
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Log */}
      <QuickLogCard onLogged={fetchDashboardData} />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('dashboard.todaysProgress.title')}
            </CardTitle>
            <CardDescription>{t('dashboard.todaysProgress.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Nutrition</p>
                    <p className="text-sm text-muted-foreground">
                      {stats.calories.value} of {stats.calories.target} calories
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {Math.round((stats.calories.value / stats.calories.target) * 100)}%
                  </p>
                  <Progress value={(stats.calories.value / stats.calories.target) * 100} className="w-24 h-2" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Hydration</p>
                    <p className="text-sm text-muted-foreground">{stats.water.value} of {stats.water.target} glasses</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {Math.round((stats.water.value / stats.water.target) * 100)}%
                  </p>
                  <Progress value={(stats.water.value / stats.water.target) * 100} className="w-24 h-2" />
                </div>
              </div>

              {/* Weight Progress - Premium Feature */}
              <div className={`flex items-center justify-between p-4 rounded-lg ${isPremium ? 'bg-muted/50' : 'bg-muted/30 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Weight Goal</p>
                      {!isPremium && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPremium
                        ? `${stats.weight.current}kg → ${stats.weight.target}kg`
                        : 'Upgrade to track'
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {isPremium ? `${Math.round(weightProgress)}%` : '--'}
                  </p>
                  <Progress value={isPremium ? weightProgress : 0} className="w-24 h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Streak Card */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                <Flame className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-3xl font-bold">{stats.streak}</h3>
              <p className="text-muted-foreground">{t('dashboard.streak.title')}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('dashboard.streak.subtitle')}</p>
            </CardContent>
          </Card>

          {/* Upcoming - Premium Feature */}
          <Card className={!isBasicOrHigher ? 'opacity-75' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('dashboard.upcoming.title')}
                {!isBasicOrHigher && <Lock className="h-3 w-3 text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isBasicOrHigher ? (
                <>
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.date}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">{t(`dashboard.upcoming.${event.type}`)}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>
                  )}
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link to="/app/appointments">
                      {t('dashboard.upcoming.viewAll')}
                      <ArrowRight className="ms-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Upgrade to Basic or Premium to schedule appointments</p>
                  <Button size="sm" asChild>
                    <Link to="/pricing">Upgrade</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity.title')}</CardTitle>
          <CardDescription>{t('dashboard.recentActivity.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <activity.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Coach Quick Access - All Tiers */}
      <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Health Coach</h3>
                <p className="text-sm text-muted-foreground">
                  {isPremium
                    ? 'Unlimited conversations available'
                    : `${tier === 'Free' ? '5' : '25'} messages remaining today`
                  }
                </p>
              </div>
            </div>
            <Button variant="secondary" asChild>
              <Link to="/app/ai-coach">
                Start Chatting
                <ArrowRight className="ms-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
