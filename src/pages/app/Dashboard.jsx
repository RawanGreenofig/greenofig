import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Utensils,
  Dumbbell,
  Droplets,
  Flame,
  TrendingUp,
  Target,
  Calendar,
  Bot,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const quickActions = [
  { icon: Utensils, label: 'dashboard.logMeal', href: '/app/nutrition', color: 'bg-green-500' },
  { icon: Dumbbell, label: 'dashboard.logWorkout', href: '/app/fitness', color: 'bg-blue-500' },
  { icon: Droplets, label: 'dashboard.logWater', href: '/app/progress', color: 'bg-cyan-500' },
  { icon: Bot, label: 'dashboard.aiCoach', href: '/app/ai-coach', color: 'bg-purple-500' },
]

const todayStats = [
  { key: 'calories', value: 1450, target: 2000, icon: Flame, color: 'text-orange-500' },
  { key: 'protein', value: 85, target: 120, icon: Target, color: 'text-red-500', unit: 'g' },
  { key: 'water', value: 5, target: 8, icon: Droplets, color: 'text-blue-500', unit: ' glasses' },
  { key: 'steps', value: 6543, target: 10000, icon: TrendingUp, color: 'text-green-500' },
]

export default function Dashboard() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const { profile } = useAuth()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.goodMorning')
    if (hour < 18) return t('dashboard.goodAfternoon')
    return t('dashboard.goodEvening')
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground">{t('dashboard.todayProgress')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            7 {t('dashboard.days')} {t('dashboard.streak')}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(({ icon: Icon, label, href, color }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white', color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-center">{t(label)}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {todayStats.map(({ key, value, target, icon: Icon, color, unit }, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{t(`dashboard.${key}`)}</span>
                  <Icon className={cn('h-5 w-5', color)} />
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold">{value.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">
                    {unit} / {target.toLocaleString()}{unit}
                  </span>
                </div>
                <Progress value={(value / target) * 100} className="h-2" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Today's Meals & Workout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Meals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('dashboard.todaysMeals')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/nutrition">
                {t('dashboard.viewAll')}
                <ArrowRight className={cn('h-4 w-4', isRTL ? 'mr-1 rtl-flip' : 'ml-1')} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['breakfast', 'lunch', 'dinner', 'snacks'].map((meal) => (
                <div
                  key={meal}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Utensils className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{t(`nutrition.${meal}`)}</p>
                      <p className="text-sm text-muted-foreground">--</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Today's Workout */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('dashboard.todaysWorkout')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/fitness">
                {t('dashboard.viewAll')}
                <ArrowRight className={cn('h-4 w-4', isRTL ? 'mr-1 rtl-flip' : 'ml-1')} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">{t('dashboard.noWorkoutScheduled')}</p>
              <Button asChild>
                <Link to="/app/fitness">
                  {t('dashboard.startWorkout')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('dashboard.upcomingTasks')}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/appointments">
              {t('dashboard.viewAll')}
              <ArrowRight className={cn('h-4 w-4', isRTL ? 'mr-1 rtl-flip' : 'ml-1')} />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t('appointments.noAppointments')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
