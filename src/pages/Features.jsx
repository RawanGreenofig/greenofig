import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
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

const mainFeatures = [
  {
    icon: Bot,
    title: 'AI Health Coach',
    description: 'Our intelligent AI coach provides personalized guidance 24/7. Get instant answers to your health questions, meal suggestions, and workout advice tailored to your goals.',
    tier: 'All Plans',
  },
  {
    icon: Utensils,
    title: 'Smart Meal Planning',
    description: 'AI-generated meal plans based on your dietary preferences, restrictions, and nutritional goals. Includes detailed recipes, shopping lists, and macro tracking.',
    tier: 'Premium+',
  },
  {
    icon: Dumbbell,
    title: 'Personalized Workouts',
    description: 'Custom workout programs that adapt to your fitness level, available equipment, and schedule. Video demonstrations and progress tracking included.',
    tier: 'Premium+',
  },
  {
    icon: TrendingUp,
    title: 'Progress Analytics',
    description: 'Comprehensive tracking with detailed insights. Monitor weight, measurements, strength gains, and health metrics with beautiful visualizations.',
    tier: 'All Plans',
  },
  {
    icon: MessageSquare,
    title: 'Nutritionist Access',
    description: 'Connect with certified nutritionists for personalized advice. Get expert guidance on your diet, supplements, and health concerns.',
    tier: 'Ultimate+',
  },
  {
    icon: Calendar,
    title: 'Video Consultations',
    description: 'Schedule video calls with health professionals. Get face-to-face guidance from nutritionists and fitness coaches.',
    tier: 'Ultimate+',
  },
]

const additionalFeatures = [
  {
    icon: Watch,
    title: 'Wearable Integration',
    description: 'Sync with Fitbit, Apple Watch, Garmin, and more.',
  },
  {
    icon: Camera,
    title: 'Photo Food Recognition',
    description: 'Snap a photo of your meal for instant nutrition info.',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'Earn achievements, streaks, and rewards for consistency.',
  },
  {
    icon: Globe,
    title: 'Multi-language Support',
    description: 'Available in English and Arabic with RTL support.',
  },
  {
    icon: Shield,
    title: 'Privacy Focused',
    description: 'Your health data is encrypted and never shared.',
  },
  {
    icon: Zap,
    title: 'Offline Mode',
    description: 'Access your plans and track meals offline.',
  },
]

export default function Features() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-4" variant="secondary">Features</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Powerful Features for Your
              <span className="block gradient-text">Health Journey</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover all the tools and features designed to help you achieve your wellness goals.
            </p>
          </motion.div>
        </div>
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
            <h2 className="text-3xl font-bold mb-4">And Much More</h2>
            <p className="text-muted-foreground">Additional features to enhance your experience</p>
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
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Start your free trial today and experience all these features firsthand.
          </p>
          <Button size="lg" asChild>
            <Link to="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
