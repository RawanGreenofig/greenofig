import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Play,
  Star,
  Users,
  Utensils,
  Dumbbell,
  Brain,
  Heart,
  Shield,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const heroImages = [
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1920&q=80',
]

const features = [
  { icon: Brain, key: 'aiCoach', color: 'text-purple-500' },
  { icon: Utensils, key: 'mealPlanning', color: 'text-green-500' },
  { icon: Dumbbell, key: 'workouts', color: 'text-blue-500' },
  { icon: Heart, key: 'tracking', color: 'text-red-500' },
  { icon: Users, key: 'nutritionists', color: 'text-orange-500' },
  { icon: Shield, key: 'community', color: 'text-teal-500' },
]

const stats = [
  { value: '10K+', key: 'users' },
  { value: '500K+', key: 'mealPlans' },
  { value: '1M+', key: 'workouts' },
  { value: '4.9', key: 'rating', icon: Star },
]

export default function Home() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background Images */}
        <div className="absolute inset-0 overflow-hidden">
          {heroImages.map((img, index) => (
            <motion.div
              key={img}
              initial={{ opacity: 0 }}
              animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
          <div className="absolute inset-0 hero-overlay" />
        </div>

        {/* Content */}
        <div className="relative section-container py-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="secondary" className="mb-4">
                <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                {t('home.stats.rating')} {t('home.stats.rating')}
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            >
              <span className="gradient-text">{t('home.hero.title')}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl"
            >
              {t('home.hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Button size="xl" variant="glow" asChild>
                <Link to="/auth/signup">
                  {t('home.hero.getStarted')}
                  <ArrowRight className={cn('h-5 w-5', isRTL ? 'mr-2 rtl-flip' : 'ml-2')} />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/features">
                  <Play className={cn('h-5 w-5', isRTL ? 'ml-2' : 'mr-2')} />
                  {t('home.hero.watchDemo')}
                </Link>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-sm text-muted-foreground"
            >
              {t('home.hero.trustedBy')}
            </motion.p>
          </div>

          {/* Image Navigation */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentImageIndex
                    ? 'bg-primary w-6'
                    : 'bg-muted-foreground/50 hover:bg-muted-foreground'
                )}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-y">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(({ value, key, icon: Icon }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-1 text-3xl md:text-4xl font-bold text-primary mb-2">
                  {Icon && <Icon className="h-6 w-6 fill-yellow-500 text-yellow-500" />}
                  {value}
                </div>
                <p className="text-muted-foreground">{t(`home.stats.${key}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              {t('home.features.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              {t('home.features.subtitle')}
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, key, color }, index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover glass className="h-full">
                  <CardContent className="p-6">
                    <div className={cn('w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4', color)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {t(`home.features.${key}.title`)}
                    </h3>
                    <p className="text-muted-foreground">
                      {t(`home.features.${key}.description`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-32 bg-muted/50">
        <div className="section-container">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              {t('home.howItWorks.title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground"
            >
              {t('home.howItWorks.subtitle')}
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                    {step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {t(`home.howItWorks.step${step}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`home.howItWorks.step${step}.description`)}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl gradient-bg p-8 md:p-16 text-center"
          >
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                {t('home.cta.title')}
              </h2>
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                {t('home.cta.subtitle')}
              </p>
              <Button size="xl" variant="secondary" asChild>
                <Link to="/auth/signup">
                  {t('home.cta.button')}
                  <ArrowRight className={cn('h-5 w-5', isRTL ? 'mr-2 rtl-flip' : 'ml-2')} />
                </Link>
              </Button>
              <p className="mt-4 text-sm text-white/60">
                {t('home.cta.noCard')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
