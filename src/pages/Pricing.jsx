import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Base',
    description: 'Get started with basic features',
    priceMonthly: 0,
    priceYearly: 0,
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
    name: 'Premium',
    description: 'Perfect for serious health enthusiasts',
    priceMonthly: 9.99,
    priceYearly: 99,
    popular: true,
    features: [
      { name: 'Unlimited AI coach messages', included: true },
      { name: 'Full meal planning', included: true },
      { name: 'Recipe database access', included: true },
      { name: 'Macro tracking', included: true },
      { name: 'Exercise library', included: true },
      { name: 'Wearable device sync', included: true },
      { name: 'No ads', included: true },
      { name: 'Video consultations', included: false },
    ],
  },
  {
    name: 'Ultimate',
    description: 'For those who want it all',
    priceMonthly: 19.99,
    priceYearly: 199,
    features: [
      { name: 'Everything in Premium', included: true },
      { name: 'Nutritionist messaging', included: true },
      { name: 'Video consultations (2/month)', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Custom meal plans', included: true },
      { name: 'Progress reports', included: true },
      { name: 'Data export', included: true },
      { name: 'Doctor consultations', included: false },
    ],
  },
  {
    name: 'Elite',
    description: 'The complete wellness experience',
    priceMonthly: 39.99,
    priceYearly: 399,
    features: [
      { name: 'Everything in Ultimate', included: true },
      { name: 'Unlimited video consultations', included: true },
      { name: 'Doctor consultations', included: true },
      { name: 'DNA-based nutrition', included: true },
      { name: 'Photo food recognition', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Dedicated support', included: true },
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
    answer: 'We accept all major credit cards, PayPal, and Apple Pay. Enterprise customers can also pay by invoice.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your account settings. No questions asked.',
  },
]

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-4" variant="secondary">Pricing</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Simple, Transparent
              <span className="block gradient-text">Pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your wellness journey. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <Label htmlFor="billing" className={cn(!isYearly && 'text-foreground', isYearly && 'text-muted-foreground')}>
                Monthly
              </Label>
              <Switch
                id="billing"
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
              <Label htmlFor="billing" className={cn(isYearly && 'text-foreground', !isYearly && 'text-muted-foreground')}>
                Yearly
                <Badge className="ml-2" variant="secondary">Save 17%</Badge>
              </Label>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 -mt-12">
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
                  plan.popular && "border-primary shadow-glow"
                )}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Most Popular
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
                          /{isYearly ? 'year' : 'month'}
                        </span>
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
                      className="w-full"
                      variant={plan.popular ? 'default' : 'outline'}
                      asChild
                    >
                      <Link to="/signup">
                        {plan.priceMonthly === 0 ? 'Get Started' : 'Start Free Trial'}
                      </Link>
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
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">
              Have questions? We have answers.
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
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-muted-foreground mb-8">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <Button size="lg" variant="outline" asChild>
            <Link to="/contact">
              Contact Sales
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
