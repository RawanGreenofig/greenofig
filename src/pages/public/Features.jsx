import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchFeatures } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const { ArrowRight, Sparkles, Check } = LucideIcons

// Helper to get icon component from string name
const getIcon = (iconName) => {
  const Icon = LucideIcons[iconName]
  return Icon || LucideIcons.Star
}

// Color mapping for categories
const categoryColors = {
  'Nutrition & Diet': 'from-green-500 to-emerald-500',
  'Fitness & Workouts': 'from-blue-500 to-cyan-500',
  'AI Coaching': 'from-purple-500 to-pink-500',
  'Health Monitoring': 'from-red-500 to-orange-500',
  'Professional Support': 'from-indigo-500 to-purple-500',
  'Platform Features': 'from-teal-500 to-green-500',
}

export default function Features() {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    loadFeatures()
  }, [])

  const loadFeatures = async () => {
    setLoading(true)
    try {
      const result = await fetchFeatures()
      if (result.data) {
        setFeatures(result.data)
      }
    } catch (error) {
      console.error('Error loading features:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group features by category
  const categories = [...new Set(features.map(f => f.category).filter(Boolean))]

  const filteredFeatures = selectedCategory === 'all'
    ? features
    : features.filter(f => f.category === selectedCategory)

  const tierBadgeColor = (tier) => {
    switch(tier?.toLowerCase()) {
      case 'basic': return 'bg-zinc-500'
      case 'premium': return 'bg-blue-500'
      case 'pro': return 'bg-purple-500'
      case 'elite': return 'bg-amber-500'
      default: return 'bg-primary'
    }
  }

  return (
    <div className="page-enter pt-20">
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="section-container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'ar' ? 'ميزات قوية' : 'Powerful Features'}
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          >
            {language === 'ar' ? 'كل ما تحتاجه للنجاح' : 'Everything You Need to Succeed'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10"
          >
            {language === 'ar'
              ? 'من التخطيط الغذائي بالذكاء الاصطناعي إلى تتبع التقدم في الوقت الفعلي، منصتنا توفر كل الأدوات التي تحتاجها لتحويل صحتك'
              : 'From AI-powered meal planning to real-time progress tracking, our platform provides all the tools you need to transform your health'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button size="lg" asChild>
              <Link to="/auth/signup">
                {language === 'ar' ? 'ابدأ مجاناً' : 'Get Started Free'}
                <ArrowRight className={cn('h-5 w-5', isRTL ? 'mr-2 rotate-180' : 'ml-2')} />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-y bg-muted/30">
        <div className="section-container">
          <div className="flex gap-2 flex-wrap justify-center">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              {language === 'ar' ? 'جميع الميزات' : 'All Features'}
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {language === 'ar' && features.find(f => f.category === category)?.category_ar
                  ? features.find(f => f.category === category).category_ar
                  : category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="section-container">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-full">
                  <CardHeader>
                    <Skeleton className="w-14 h-14 rounded-2xl mb-4" />
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeatures.map((feature, index) => {
                const Icon = getIcon(feature.feature_icon)
                const colorClass = categoryColors[feature.category] || 'from-primary to-primary/80'

                return (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="h-full card-hover relative overflow-hidden">
                      {feature.coming_soon && (
                        <Badge className="absolute top-3 right-3 bg-amber-500 text-white">
                          {language === 'ar' ? 'قريباً' : 'Coming Soon'}
                        </Badge>
                      )}
                      <CardHeader>
                        <div className={cn(
                          'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4',
                          colorClass
                        )}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-xl">
                            {language === 'ar' && feature.name_ar ? feature.name_ar : feature.name}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className={cn('text-xs w-fit', tierBadgeColor(feature.plan_tier), 'text-white border-0')}>
                          {feature.plan_tier}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          {language === 'ar' && feature.description_ar ? feature.description_ar : feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}

          {!loading && filteredFeatures.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد ميزات في هذه الفئة' : 'No features in this category'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      {!loading && (
        <section className="py-16 bg-muted/50">
          <div className="section-container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">{features.length}+</div>
                <div className="text-muted-foreground">{language === 'ar' ? 'ميزة' : 'Features'}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">{categories.length}</div>
                <div className="text-muted-foreground">{language === 'ar' ? 'فئات' : 'Categories'}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                <div className="text-muted-foreground">{language === 'ar' ? 'دعم مستمر' : 'AI Support'}</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">100%</div>
                <div className="text-muted-foreground">{language === 'ar' ? 'مخصص لك' : 'Personalized'}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="section-container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'ar' ? 'جاهز لبدء رحلتك؟' : 'Ready to Start Your Journey?'}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'انضم إلى آلاف المستخدمين الذين حققوا أهدافهم الصحية مع GreenoFig'
                : 'Join thousands of users who achieved their health goals with GreenoFig'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth/signup">
                  {language === 'ar' ? 'ابدأ تجربتك المجانية' : 'Start Free Trial'}
                  <ArrowRight className={cn('h-5 w-5', isRTL ? 'mr-2 rotate-180' : 'ml-2')} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">
                  {language === 'ar' ? 'عرض الأسعار' : 'View Pricing'}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
