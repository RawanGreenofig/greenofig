import { motion } from 'framer-motion'
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
  Plus
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const quickStats = [
  { label: 'Calories', value: 1850, target: 2200, icon: Flame, color: 'text-orange-500' },
  { label: 'Protein', value: 95, target: 120, unit: 'g', icon: Target, color: 'text-blue-500' },
  { label: 'Water', value: 6, target: 8, unit: 'cups', icon: Droplets, color: 'text-cyan-500' },
  { label: 'Sleep', value: 7.5, target: 8, unit: 'hrs', icon: Moon, color: 'text-purple-500' },
]

const recentActivities = [
  { type: 'meal', title: 'Logged breakfast', time: '2 hours ago', icon: Utensils },
  { type: 'workout', title: 'Completed workout', time: '5 hours ago', icon: Dumbbell },
  { type: 'achievement', title: 'Earned "7-Day Streak"', time: 'Yesterday', icon: Trophy },
  { type: 'goal', title: 'Updated weight goal', time: '2 days ago', icon: Target },
]

const upcomingEvents = [
  { title: 'Nutritionist Call', date: 'Tomorrow, 10:00 AM', type: 'appointment' },
  { title: 'Weekly Check-in', date: 'Friday, 9:00 AM', type: 'reminder' },
]

export default function Dashboard() {
  const { userProfile } = useAuth()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userProfile?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-muted-foreground">Here's your health summary for today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/ai-coach">
              Ask AI Coach
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app/nutrition">
              <Plus className="mr-2 h-4 w-4" />
              Log Meal
            </Link>
          </Button>
        </div>
      </div>

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

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Progress */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Today's Progress
            </CardTitle>
            <CardDescription>Your daily goals completion</CardDescription>
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
                    <p className="text-sm text-muted-foreground">2 of 4 meals logged</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">50%</p>
                  <Progress value={50} className="w-24 h-2" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Fitness</p>
                    <p className="text-sm text-muted-foreground">Workout completed</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">100%</p>
                  <Progress value={100} className="w-24 h-2" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Hydration</p>
                    <p className="text-sm text-muted-foreground">6 of 8 glasses</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">75%</p>
                  <Progress value={75} className="w-24 h-2" />
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
              <h3 className="text-3xl font-bold">7</h3>
              <p className="text-muted-foreground">Day Streak</p>
              <p className="text-xs text-muted-foreground mt-2">Keep it up! You're on fire!</p>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{event.type}</Badge>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link to="/app/appointments">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest health activities</CardDescription>
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
    </div>
  )
}
