import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Ruler,
  Target,
  Calendar,
  Plus,
  Camera,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const weightData = [
  { date: 'Jan 1', weight: 180 },
  { date: 'Jan 8', weight: 178.5 },
  { date: 'Jan 15', weight: 177 },
  { date: 'Jan 22', weight: 176.5 },
  { date: 'Jan 29', weight: 175 },
  { date: 'Feb 5', weight: 174 },
  { date: 'Feb 12', weight: 173.5 },
]

const statsData = [
  {
    key: 'currentWeight',
    value: '173.5',
    unit: 'lbs',
    change: -6.5,
    changeLabel: 'fromStart',
    icon: Scale,
  },
  {
    key: 'goalWeight',
    value: '165',
    unit: 'lbs',
    remaining: 8.5,
    icon: Target,
  },
  {
    key: 'bmi',
    value: '24.2',
    unit: '',
    status: 'normal',
    icon: Ruler,
  },
]

const measurementsData = [
  { key: 'chest', current: 42, previous: 43 },
  { key: 'waist', current: 34, previous: 36 },
  { key: 'hips', current: 40, previous: 41 },
  { key: 'thighs', current: 24, previous: 25 },
  { key: 'arms', current: 14.5, previous: 14 },
]

const achievements = [
  { name: 'First Weigh-in', date: 'Jan 1, 2024', icon: '📊' },
  { name: '5 lbs Lost', date: 'Jan 22, 2024', icon: '🎯' },
  { name: '7-Day Streak', date: 'Jan 28, 2024', icon: '🔥' },
  { name: 'Photo Progress', date: 'Feb 1, 2024', icon: '📸' },
]

export default function Progress() {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState('1m')

  const stats = statsData.map(stat => ({
    ...stat,
    label: t(`progress.stats.${stat.key}`),
  }))

  const measurements = measurementsData.map(m => ({
    ...m,
    label: t(`progress.measurements.${m.key}`),
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('progress.title')}</h1>
          <p className="text-muted-foreground">{t('progress.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Camera className="me-2 h-4 w-4" />
            {t('progress.addPhoto')}
          </Button>
          <Button>
            <Plus className="me-2 h-4 w-4" />
            {t('progress.logWeight')}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
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
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.unit}</span>
                </div>
                {stat.change !== undefined && (
                  <div className="flex items-center gap-1 mt-2">
                    {stat.change < 0 ? (
                      <TrendingDown className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    )}
                    <span className={stat.change < 0 ? 'text-green-500' : 'text-red-500'}>
                      {Math.abs(stat.change)} {t('common.lbs')}
                    </span>
                    <span className="text-muted-foreground text-sm">{t(`progress.stats.${stat.changeLabel}`)}</span>
                  </div>
                )}
                {stat.remaining !== undefined && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {stat.remaining} {t('common.lbs')} {t('progress.stats.toGo')}
                  </p>
                )}
                {stat.status && (
                  <Badge variant="secondary" className="mt-2">{t(`progress.stats.${stat.status}`)}</Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="weight" className="space-y-6">
        <TabsList>
          <TabsTrigger value="weight">{t('progress.tabs.weight')}</TabsTrigger>
          <TabsTrigger value="measurements">{t('progress.tabs.measurements')}</TabsTrigger>
          <TabsTrigger value="photos">{t('progress.tabs.photos')}</TabsTrigger>
          <TabsTrigger value="achievements">{t('progress.tabs.achievements')}</TabsTrigger>
        </TabsList>

        <TabsContent value="weight">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('progress.weight.title')}</CardTitle>
                  <CardDescription>{t('progress.weight.subtitle')}</CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1w">{t('progress.timeRange.1w')}</SelectItem>
                    <SelectItem value="1m">{t('progress.timeRange.1m')}</SelectItem>
                    <SelectItem value="3m">{t('progress.timeRange.3m')}</SelectItem>
                    <SelectItem value="6m">{t('progress.timeRange.6m')}</SelectItem>
                    <SelectItem value="1y">{t('progress.timeRange.1y')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements">
          <Card>
            <CardHeader>
              <CardTitle>{t('progress.measurements.title')}</CardTitle>
              <CardDescription>{t('progress.measurements.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {measurements.map((measurement, index) => {
                  const change = measurement.current - measurement.previous
                  return (
                    <motion.div
                      key={measurement.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{measurement.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('progress.measurements.previous')}: {measurement.previous} {t('common.in')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {measurement.current} {t('common.in')}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          {change < 0 ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          ) : change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : null}
                          <span className={change < 0 ? 'text-green-500' : change > 0 ? 'text-red-500' : 'text-muted-foreground'}>
                            {change > 0 ? '+' : ''}{change} {t('common.in')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              <Button variant="outline" className="w-full mt-4">
                <Plus className="me-2 h-4 w-4" />
                {t('progress.measurements.update')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>{t('progress.photos.title')}</CardTitle>
              <CardDescription>{t('progress.photos.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">{t('progress.photos.noPhotos')}</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('progress.photos.noPhotosSubtitle')}
                </p>
                <Button>
                  <Camera className="me-2 h-4 w-4" />
                  {t('progress.photos.addFirst')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>{t('progress.achievements.title')}</CardTitle>
              <CardDescription>{t('progress.achievements.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                  >
                    <div className="text-3xl">{achievement.icon}</div>
                    <div>
                      <p className="font-medium">{achievement.name}</p>
                      <p className="text-sm text-muted-foreground">{achievement.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
