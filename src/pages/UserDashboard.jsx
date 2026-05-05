import React, { memo, useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Scale, HeartPulse, Flame, Moon, Droplets, Utensils, Dumbbell,
  Activity, Trophy, Target, Gift, Zap, Camera, Scan, Watch,
  Search, MessageSquare, TrendingUp, Calendar, Bot, Plus,
  ArrowRight, Clock, ChevronRight, Sparkles, Apple, Salad,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useFeatureAccess } from '@/hooks/useFeatureAccess'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const UserDashboard = memo(({ logoUrl, previewMode = false }) => {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { user, profile } = useAuth()
  const { hasAds, planName, hasAccess, planKey, isPremiumPlus, isUltimatePlus, isElite } = useFeatureAccess()

  // State
  const [todayMetrics, setTodayMetrics] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [streaks, setStreaks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showVideoAd, setShowVideoAd] = useState(false)
  const [showAd, setShowAd] = useState(true)
  const [bonusMessages, setBonusMessages] = useState(0)
  const [waterGlasses, setWaterGlasses] = useState(0)

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  }

  useEffect(() => {
    loadDashboardData()
  }, [user?.id])

  const loadDashboardData = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch today's metrics
      const { data: metricsData } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single()

      if (metricsData) {
        setTodayMetrics(metricsData)
        setWaterGlasses(Math.floor((metricsData.water_ml || 0) / 250))
      }

      // Fetch recent activity
      const { data: activityData } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (activityData) {
        setRecentActivity(activityData)
      }

      // Fetch streaks
      const { data: streaksData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)

      if (streaksData) {
        setStreaks(streaksData)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadDashboardData()
  }

  const calculateBMI = () => {
    if (!todayMetrics?.weight_kg || !profile?.height_cm) return { bmi: 'N/A', category: '' }
    const heightM = profile.height_cm / 100
    const bmi = (todayMetrics.weight_kg / (heightM * heightM)).toFixed(1)
    let category = ''
    if (bmi < 18.5) category = language === 'ar' ? 'نقص الوزن' : 'Underweight'
    else if (bmi < 25) category = language === 'ar' ? 'طبيعي' : 'Normal'
    else if (bmi < 30) category = language === 'ar' ? 'زيادة الوزن' : 'Overweight'
    else category = language === 'ar' ? 'سمنة' : 'Obese'
    return { bmi, category }
  }

  const { bmi, category } = calculateBMI()

  const getGoalIcon = (goal) => {
    switch (goal) {
      case 'weight_loss': return <Target className="h-5 w-5 text-red-500" />
      case 'muscle_gain': return <Dumbbell className="h-5 w-5 text-blue-500" />
      case 'maintain_weight': return <Scale className="h-5 w-5 text-green-500" />
      case 'improve_health': return <HeartPulse className="h-5 w-5 text-pink-500" />
      case 'better_sleep': return <Moon className="h-5 w-5 text-purple-500" />
      default: return <Target className="h-5 w-5 text-primary" />
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'logged_meal': return <Utensils className="w-4 h-4 text-primary" />
      case 'completed_workout': return <Dumbbell className="w-4 h-4 text-blue-500" />
      case 'weight_update': return <Scale className="w-4 h-4 text-green-500" />
      case 'sleep_log': return <Moon className="w-4 h-4 text-purple-500" />
      case 'water_intake': return <Droplets className="w-4 h-4 text-cyan-500" />
      default: return <Activity className="w-4 h-4 text-primary" />
    }
  }

  const quickActions = [
    { icon: Scale, label: language === 'ar' ? 'تسجيل الوزن' : 'Log Weight', color: 'bg-green-500', href: '/app/progress' },
    { icon: Utensils, label: language === 'ar' ? 'تسجيل وجبة' : 'Log Meal', color: 'bg-orange-500', href: '/app/nutrition' },
    { icon: Dumbbell, label: language === 'ar' ? 'تسجيل تمرين' : 'Log Workout', color: 'bg-blue-500', href: '/app/fitness' },
    { icon: Moon, label: language === 'ar' ? 'تسجيل النوم' : 'Log Sleep', color: 'bg-purple-500', href: '/app/progress' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Section 1: Welcome Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
          {language === 'ar' ? 'مرحباً بك،' : 'Welcome back,'}{' '}
          <span className="gradient-text">{profile?.full_name?.split(' ')[0] || 'User'}!</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {language === 'ar' ? 'إليك ملخص صحتك لهذا اليوم.' : "Here's your wellness snapshot for today."}
          {planName && (
            <Badge variant="outline" className="ml-2 text-xs">
              {planName} {language === 'ar' ? 'خطة' : 'Plan'}
            </Badge>
          )}
        </p>
      </motion.div>

      {/* Section 2: Ad Banner (Basic/Free Users Only) */}
      {hasAds && showAd && (
        <motion.div variants={itemVariants}>
          <Card className="glass-effect border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <div>
                    <p className="font-medium">{language === 'ar' ? 'قم بالترقية للحصول على المزيد!' : 'Upgrade for more features!'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'ar' ? 'احصل على وصول غير محدود لجميع الميزات' : 'Get unlimited access to all features'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAd(false)}>
                    {language === 'ar' ? 'إغلاق' : 'Dismiss'}
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/pricing">{language === 'ar' ? 'ترقية' : 'Upgrade'}</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 3: Rewarded Video Ad Card (Basic Users Only) */}
      {hasAds && (
        <motion.div variants={itemVariants}>
          <Card className="glass-effect border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Gift className="w-8 h-8 text-yellow-400" />
                  <div>
                    <h3 className="font-semibold">{language === 'ar' ? 'اكسب ميزات إضافية!' : 'Earn Bonus Features!'}</h3>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'شاهد فيديو قصير للحصول على رسالة AI إضافية' : 'Watch a short video to get +1 extra AI message'}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setShowVideoAd(true)
                    setBonusMessages(prev => prev + 1)
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  {language === 'ar' ? 'شاهد الإعلان' : 'Watch Ad'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 4: Quick Actions Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-effect h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map(({ icon: Icon, label, color, href }, index) => (
                <Link
                  key={index}
                  to={href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center text-white', color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-center">{label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Water Tracker */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-500" />
              {language === 'ar' ? 'تتبع الماء' : 'Water Tracker'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-cyan-500">{waterGlasses}/8</div>
              <p className="text-sm text-muted-foreground mb-4">{language === 'ar' ? 'أكواب اليوم' : 'glasses today'}</p>
              <div className="flex gap-1 flex-wrap justify-center">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-8 h-10 rounded-b-full border-2 transition-colors cursor-pointer',
                      i < waterGlasses
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-muted-foreground/30 hover:border-cyan-500/50'
                    )}
                    onClick={() => setWaterGlasses(Math.min(8, i + 1))}
                  />
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setWaterGlasses(Math.min(8, waterGlasses + 1))}>
                <Plus className="w-4 h-4 mr-1" />
                {language === 'ar' ? 'إضافة كوب' : 'Add Glass'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 5: Stats Cards (4 columns) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weight Card */}
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'الوزن' : 'Weight'}</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayMetrics?.weight_kg || profile?.current_weight_kg || 'N/A'} kg</div>
            <p className="text-xs text-muted-foreground">{language === 'ar' ? 'آخر تسجيل' : 'Last recorded'}</p>
          </CardContent>
        </Card>

        {/* BMI Card */}
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'مؤشر كتلة الجسم' : 'BMI'}</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bmi}</div>
            <p className="text-xs text-muted-foreground">{category}</p>
          </CardContent>
        </Card>

        {/* Calories Card */}
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'السعرات اليوم' : 'Calories Today'}</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayMetrics?.calories_burned || 0}</div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'محروقة' : 'Burned'} - {todayMetrics?.calories_consumed || 0} {language === 'ar' ? 'مستهلكة' : 'consumed'}
            </p>
          </CardContent>
        </Card>

        {/* Sleep Card */}
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{language === 'ar' ? 'النوم' : 'Sleep'}</CardTitle>
            <Moon className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayMetrics?.sleep_hours || '--'}h</div>
            <p className="text-xs text-muted-foreground">
              {todayMetrics?.sleep_quality || (language === 'ar' ? 'لم يتم التسجيل' : 'Not logged')}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 6: Premium Features Card (All Paid Users) */}
      {isPremiumPlus && (
        <motion.div variants={itemVariants}>
          <Card className="glass-effect border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                {language === 'ar' ? 'الميزات المميزة' : 'Premium Features'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Photo Food Recognition - Elite Only */}
              {hasAccess('photoRecognition') && (
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Camera className="h-6 w-6 text-purple-500" />
                  <span>{language === 'ar' ? 'التعرف على الطعام بالصور' : 'Photo Food Recognition'}</span>
                  <span className="text-xs text-muted-foreground">Elite</span>
                </Button>
              )}

              {/* Barcode Scanner - Premium+ */}
              {hasAccess('barcodeScanner') && (
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Scan className="h-6 w-6 text-blue-500" />
                  <span>{language === 'ar' ? 'ماسح الباركود' : 'Barcode Scanner'}</span>
                  <span className="text-xs text-muted-foreground">Premium+</span>
                </Button>
              )}

              {/* Wearable Sync - Premium+ */}
              {hasAccess('wearableIntegration') && (
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Watch className="h-6 w-6 text-green-500" />
                  <span>{language === 'ar' ? 'الأجهزة القابلة للارتداء' : 'Wearable Devices'}</span>
                  <span className="text-xs text-muted-foreground">Premium+</span>
                </Button>
              )}

              {/* Food Database - Premium+ */}
              {hasAccess('foodDatabase') && (
                <Button variant="outline" className="h-24 flex flex-col gap-2">
                  <Search className="h-6 w-6 text-orange-500" />
                  <span>{language === 'ar' ? 'قاعدة بيانات الطعام' : 'Food Database'}</span>
                  <span className="text-xs text-muted-foreground">Premium+</span>
                </Button>
              )}

              {/* Messaging Center - Ultimate+ */}
              {hasAccess('nutritionistAccess') && (
                <Button variant="outline" className="h-24 flex flex-col gap-2" asChild>
                  <Link to="/app/messages">
                    <MessageSquare className="h-6 w-6 text-indigo-500" />
                    <span>{language === 'ar' ? 'راسل أخصائي التغذية' : 'Message Nutritionist'}</span>
                    <span className="text-xs text-muted-foreground">Ultimate+</span>
                  </Link>
                </Button>
              )}

              {/* Doctor Consultations - Elite Only */}
              {hasAccess('doctorConsultations') && (
                <Button variant="outline" className="h-24 flex flex-col gap-2" asChild>
                  <Link to="/app/appointments">
                    <Calendar className="h-6 w-6 text-red-500" />
                    <span>{language === 'ar' ? 'استشارات الطبيب' : 'Doctor Consultations'}</span>
                    <span className="text-xs text-muted-foreground">Elite</span>
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 7: Streaks Display */}
      {streaks.length === 1 && (
        <motion.div variants={itemVariants}>
          <Card className="glass-effect">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold text-primary">{streaks[0].current_streak}</span>
                <span className="text-sm capitalize">{streaks[0].streak_type?.replace(/_/g, ' ')} streak</span>
                <span className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الأفضل:' : 'Best:'} {streaks[0].longest_streak} {language === 'ar' ? 'يوم' : 'days'}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {streaks.length >= 2 && (
        <motion.div variants={itemVariants}>
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {language === 'ar' ? 'سلاسل الإنجازات' : 'Your Streaks'}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {streaks.map(streak => (
                <div key={streak.id} className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">{streak.current_streak}</div>
                  <div className="text-sm text-muted-foreground capitalize">{streak.streak_type?.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {language === 'ar' ? 'الأفضل:' : 'Best:'} {streak.longest_streak}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section 8: Activity Feed & Goals (2 columns + 1) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Activity Feed - 2 columns */}
        <div className="lg:col-span-2">
          <Card className="glass-effect h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="p-2 rounded-full bg-primary/20">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.activity_title}</div>
                      <div className="text-sm text-muted-foreground">{activity.activity_description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {language === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}
                  </p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/app/nutrition">
                      {language === 'ar' ? 'سجل وجبتك الأولى' : 'Log your first meal'}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Goals - 1 column */}
        <Card className="glass-effect h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {language === 'ar' ? 'أهدافك' : 'Your Goals'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.health_goals?.length > 0 ? (
              profile.health_goals.map((goal, index) => (
                <div key={index} className="flex items-center gap-4 bg-muted p-3 rounded-lg">
                  {getGoalIcon(goal)}
                  <span className="font-medium capitalize">{goal.replace(/_/g, ' ')}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'لم يتم تحديد أهداف بعد' : 'No goals set yet'}
                </p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to="/app/settings">
                    {language === 'ar' ? 'تحديد الأهداف' : 'Set Goals'}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 9: AI Tools & Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* AI Insights */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {language === 'ar' ? 'رؤى مخصصة' : 'Personalized Insights'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <p className="text-sm">
                {language === 'ar'
                  ? 'بناءً على نشاطك الأخير، جرب إضافة المزيد من البروتين إلى وجباتك للمساعدة في تحقيق أهدافك.'
                  : 'Based on your recent activity, try adding more protein to your meals to help achieve your goals.'}
              </p>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/app/ai-coach">
                <Bot className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تحدث مع مدرب AI' : 'Talk to AI Coach'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* AI-Powered Tools */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" />
              {language === 'ar' ? 'أدوات AI' : 'AI-Powered Tools'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/app/nutrition">
                <Salad className="w-4 h-4 mr-2 text-green-500" />
                {language === 'ar' ? 'مولد خطة الوجبات' : 'AI Meal Plan Generator'}
                <ChevronRight className={cn('w-4 h-4 ml-auto', isRTL && 'rotate-180')} />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/app/fitness">
                <Dumbbell className="w-4 h-4 mr-2 text-blue-500" />
                {language === 'ar' ? 'مخطط التمارين' : 'AI Workout Planner'}
                <ChevronRight className={cn('w-4 h-4 ml-auto', isRTL && 'rotate-180')} />
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/app/ai-coach">
                <MessageSquare className="w-4 h-4 mr-2 text-purple-500" />
                {language === 'ar' ? 'مدرب AI الشخصي' : 'Personal AI Coach'}
                <ChevronRight className={cn('w-4 h-4 ml-auto', isRTL && 'rotate-180')} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section 10: Subscription Manager */}
      <motion.div variants={itemVariants}>
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {language === 'ar' ? 'اشتراكك' : 'Your Subscription'}
              </span>
              <Badge variant={planKey === 'free' ? 'outline' : 'default'}>
                {planName}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {planKey === 'free'
                    ? (language === 'ar' ? 'قم بالترقية للحصول على ميزات أكثر' : 'Upgrade for more features')
                    : (language === 'ar' ? 'أنت تستمتع بجميع ميزات خطتك' : "You're enjoying all your plan features")}
                </p>
              </div>
              <Button variant={planKey === 'free' ? 'default' : 'outline'} asChild>
                <Link to="/pricing">
                  {planKey === 'free'
                    ? (language === 'ar' ? 'ترقية الآن' : 'Upgrade Now')
                    : (language === 'ar' ? 'إدارة الاشتراك' : 'Manage Subscription')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
})

UserDashboard.displayName = 'UserDashboard'

export default UserDashboard
