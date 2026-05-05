import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Sparkles, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { HeroImage } from '@/components/ui/hero-slider'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      { name: 'Basic meal/workout logging', included: true },
      { name: 'AI coach (5 messages/day)', included: true },
      { name: 'Basic progress tracking', included: true },
      { name: 'Community access', included: true },
      { name: 'Meal planning', included: false },
      { name: 'Recipe database', included: false },
      { name: 'Nutritionist messaging', included: false },
      { name: 'Video consultations', included: false },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for getting started',
    priceMonthly: 9.99,
    priceYearly: 99,
    stripePriceIdMonthly: 'price_1SuQpTAjePCkjMLonX5882vO',
    stripePriceIdYearly: 'price_1SuQpVAjePCkjMLobIFcvNra',
    features: [
      { name: 'Unlimited AI coach messages', included: true },
      { name: 'Full meal planning', included: true },
      { name: 'Recipe database access', included: true },
      { name: 'Macro tracking', included: true },
      { name: 'Exercise library', included: true },
      { name: 'Wearable device sync', included: false },
      { name: 'Nutritionist messaging', included: false },
      { name: 'Video consultations', included: false },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For serious health enthusiasts',
    priceMonthly: 19.99,
    priceYearly: 199,
    popular: true,
    stripePriceIdMonthly: 'price_1SuQpWAjePCkjMLowPlqj0Uu',
    stripePriceIdYearly: 'price_1SuQpYAjePCkjMLoWDV1Dt3m',
    features: [
      { name: 'Everything in Basic', included: true },
      { name: 'Nutritionist messaging', included: true },
      { name: 'Video consultations (2/month)', included: true },
      { name: 'Wearable device sync', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Custom meal plans', included: true },
      { name: 'Progress reports', included: true },
      { name: 'Priority support', included: false },
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'The complete wellness experience',
    priceMonthly: 39.99,
    priceYearly: 399,
    stripePriceIdMonthly: 'price_1SuQpZAjePCkjMLoTyydeoPX',
    stripePriceIdYearly: 'price_1SuQpaAjePCkjMLoYASNFkos',
    features: [
      { name: 'Everything in Premium', included: true },
      { name: 'Unlimited video consultations', included: true },
      { name: 'Doctor consultations', included: true },
      { name: 'Photo food recognition', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Personal health coach', included: true },
    ],
  },
]

const faqs = [
  {
    question: 'Can I change my plan later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate your billing.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! All paid plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards, PayPal, and Apple Pay through our secure Stripe payment system.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your account settings. No questions asked.',
  },
]

export default function Pricing() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isYearly, setIsYearly] = useState(false)

  const handleSelectPlan = (plan) => {
    if (plan.priceMonthly === 0) {
      // Free plan - go to signup
      navigate('/signup')
    } else {
      // Paid plan - go directly to checkout (will redirect to login if needed)
      navigate(`/checkout?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`)
    }
  }

  return (
    <div>
      {/* Hero with Background Image */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <HeroImage
          src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1920&q=80"
          alt="Pricing plans"
          overlayOpacity={0.75}
          className="absolute inset-0"
        >
          <div className="flex items-center justify-center min-h-[50vh] pt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge className="mb-4" variant="secondary">{t('pricing.badge')}</Badge>
                <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                  {t('pricing.heroTitle')}
                  <span className="block gradient-text">{t('pricing.heroTitleHighlight')}</span>
                </h1>
                <p className="text-lg text-white/70 max-w-2xl mx-auto">
                  {t('pricing.heroSubtitle')}
                </p>
              </motion.div>
            </div>
          </div>
        </HeroImage>
      </section>

      {/* Billing Toggle - Glassmorphism style */}
      <section className="py-8 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <h2 className="text-xl font-semibold text-center">Choose your billing cycle</h2>
            <div className="flex items-center justify-center gap-2 sm:gap-4 bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-full p-1.5 sm:p-2 px-3 sm:px-4 border border-white/20 dark:border-white/10 shadow-lg">
              <button
                onClick={() => setIsYearly(false)}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium transition-all duration-300",
                  !isYearly
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={cn(
                  "px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2",
                  isYearly
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                Yearly
                <Badge variant="secondary" className="bg-lime-500/90 text-white border-0 backdrop-blur-sm text-xs">
                  Save 17%
                </Badge>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "h-full flex flex-col relative",
                  plan.popular && "border-primary border-2 shadow-glow"
                )}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3 me-1" />
                        {t('pricing.mostPopular')}
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        ${isYearly ? plan.priceYearly : plan.priceMonthly}
                      </span>
                      {plan.priceMonthly > 0 && (
                        <span className="text-muted-foreground">
                          {isYearly ? '/year' : '/month'}
                        </span>
                      )}
                      {isYearly && plan.priceMonthly > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ${(plan.priceYearly / 12).toFixed(2)}/month billed annually
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={cn(
                            "text-sm",
                            !feature.included && "text-muted-foreground"
                          )}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full gap-2"
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {plan.priceMonthly === 0 ? (
                        <>Get Started Free</>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Start Free Trial
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-24 bg-card/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t('pricing.faq.title')}</h2>
            <p className="text-muted-foreground">
              {t('pricing.faq.subtitle')}
            </p>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-lg bg-card border border-border"
              >
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('pricing.ctaSection.title')}</h2>
          <p className="text-muted-foreground mb-8">
            {t('pricing.ctaSection.subtitle')}
          </p>
          <Button size="lg" variant="outline" asChild>
            <Link to="/contact">
              {t('pricing.ctaSection.button')}
              <ArrowRight className="ms-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
