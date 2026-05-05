import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bot,
  Utensils,
  Dumbbell,
  TrendingUp,
  MessageSquare,
  Calendar,
  Watch,
  Shield,
  Zap,
  Globe,
  Camera,
  Trophy,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HeroImage } from '@/components/ui/hero-slider'

const mainFeatureIcons = [Bot, Utensils, Dumbbell, TrendingUp, MessageSquare, Calendar]
const mainFeatureKeys = ['aiCoach', 'mealPlanning', 'workouts', 'analytics', 'nutritionist', 'consultations']

const additionalFeatureIcons = [Watch, Camera, Trophy, Globe, Shield, Zap]
const additionalFeatureKeys = ['wearable', 'photoRecognition', 'gamification', 'multiLanguage', 'privacy', 'offline']

export default function Features() {
  const { t } = useTranslation()

  const mainFeatures = mainFeatureKeys.map((key, index) => ({
    icon: mainFeatureIcons[index],
    title: t(`features.main.${key}.title`),
    description: t(`features.main.${key}.description`),
    tier: t(`features.main.${key}.tier`),
  }))

  const additionalFeatures = additionalFeatureKeys.map((key, index) => ({
    icon: additionalFeatureIcons[index],
    title: t(`features.additional.${key}.title`),
    description: t(`features.additional.${key}.description`),
  }))

  return (
    <div>
      {/* Hero with Background Image */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <HeroImage
          src="https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1920&q=80"
          alt="Fitness features"
          overlayOpacity={0.75}
          className="absolute inset-0"
        >
          <div className="flex items-center justify-center min-h-[60vh] pt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge className="mb-4" variant="secondary">{t('features.badge')}</Badge>
                <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                  {t('features.heroTitle')}
                  <span className="block gradient-text">{t('features.heroTitleHighlight')}</span>
                </h1>
                <p className="text-lg text-white/70 max-w-2xl mx-auto">
                  {t('features.heroSubtitle')}
                </p>
              </motion.div>
            </div>
          </div>
        </HeroImage>
      </section>

      {/* Main Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full card-hover">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline">{feature.tier}</Badge>
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t('features.additional.title')}</h2>
            <p className="text-muted-foreground">{t('features.additional.subtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('features.cta.title')}</h2>
          <p className="text-muted-foreground mb-8">
            {t('features.cta.subtitle')}
          </p>
          <Button size="lg" asChild>
            <Link to="/signup">
              {t('features.cta.button')}
              <ArrowRight className="ms-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
