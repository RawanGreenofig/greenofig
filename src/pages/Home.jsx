import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Utensils,
  Dumbbell,
  TrendingUp,
  Star,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HeroSlider } from '@/components/ui/hero-slider'
import { LeaderboardAd } from '@/components/ads'

const heroImages = [
  {
    url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1920&q=80',
    alt: 'Healthy food preparation'
  },
  {
    url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80',
    alt: 'Fitness workout'
  },
  {
    url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80',
    alt: 'Yoga and wellness'
  },
  {
    url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1920&q=80',
    alt: 'Fresh vegetables and fruits'
  },
  {
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80',
    alt: 'Meditation and mindfulness'
  },
]

const featureIcons = [Bot, Utensils, Dumbbell, TrendingUp]
const featureKeys = ['aiCoach', 'mealPlanning', 'workouts', 'progress']

const testimonials = [
  {
    name: 'Sarah M.',
    role: 'Lost 30 lbs',
    content: 'GreenoFig transformed my relationship with food. The AI coach is like having a personal nutritionist in my pocket!',
    avatar: 'S',
  },
  {
    name: 'Michael R.',
    role: 'Fitness Enthusiast',
    content: 'The workout recommendations are spot-on. I\'ve seen more progress in 3 months than in the past year.',
    avatar: 'M',
  },
  {
    name: 'Emily L.',
    role: 'Busy Professional',
    content: 'Finally, a health app that understands my busy schedule. The meal planning feature saves me hours every week.',
    avatar: 'E',
  },
]

export default function Home() {
  const { t } = useTranslation()

  const stats = [
    { value: '50K+', labelKey: 'activeUsers' },
    { value: '1M+', labelKey: 'mealsTracked' },
    { value: '500K+', labelKey: 'workoutsCompleted' },
    { value: '4.9', labelKey: 'appRating' },
  ]

  const features = featureKeys.map((key, index) => ({
    icon: featureIcons[index],
    title: t(`home.features.${key}.title`),
    description: t(`home.features.${key}.description`),
  }))

  return (
    <div className="flex flex-col">
      {/* Hero Section with Slider */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroSlider
          images={heroImages}
          autoPlay={true}
          interval={5000}
          showControls={true}
          showIndicators={true}
          overlayOpacity={0.7}
          className="absolute inset-0"
        >
          <div className="flex items-center justify-center min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="mb-6 px-4 py-1.5" variant="secondary">
                  {t('home.badge')}
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
              >
                {t('home.heroTitle')}
                <span className="block gradient-text">{t('home.heroTitleHighlight')}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-8"
              >
                {t('home.heroSubtitle')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 justify-center"
              >
                <Button size="lg" asChild className="text-lg">
                  <Link to="/signup">
                    {t('home.startFreeTrial')}
                    <ArrowRight className="ms-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
                  <Link to="/features">
                    <Play className="me-2 h-5 w-5" />
                    {t('home.watchDemo')}
                  </Link>
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
              >
                {stats.map((stat, index) => (
                  <div key={index} className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</div>
                    <div className="text-sm text-white/70 mt-1">{t(`home.stats.${stat.labelKey}`)}</div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </HeroSlider>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4" variant="secondary">{t('home.features.badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('home.features.title')} <span className="gradient-text">{t('home.features.titleHighlight')}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full card-hover border-border/50 bg-card/50 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Banner - only shown to free/basic users and visitors */}
      <LeaderboardAd className="my-8 max-w-5xl mx-auto px-4" />

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4" variant="secondary">{t('home.testimonials.badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('home.testimonials.title')} <span className="gradient-text">{t('home.testimonials.titleHighlight')}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('home.testimonials.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50 bg-card/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4">{testimonial.content}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-medium">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              {t('home.cta.title')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t('home.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">
                  {t('home.cta.button')}
                  <ArrowRight className="ms-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">{t('home.cta.viewPricing')}</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {t('home.cta.noCreditCard')}
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
