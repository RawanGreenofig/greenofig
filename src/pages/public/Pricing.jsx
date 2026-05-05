import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Check, Crown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { fetchPricingPlans } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

export default function Pricing() {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const [isYearly, setIsYearly] = useState(false)
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const result = await fetchPricingPlans()
      if (result.data) {
        setPlans(result.data)
      }
    } catch (error) {
      console.error('Error loading pricing plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (plan) => {
    if (plan.price_monthly === 0) return language === 'ar' ? 'مجاني' : 'Free'
    return isYearly
      ? `$${plan.price_yearly}`
      : `$${plan.price_monthly}`
  }

  const getSavings = (plan) => {
    if (plan.price_monthly === 0) return null
    const yearlySavings = (plan.price_monthly * 12) - plan.price_yearly
    return yearlySavings.toFixed(0)
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
              <Crown className="h-4 w-4" />
              <span className="text-sm font-medium">
                {language === 'ar' ? 'تجربة مجانية 14 يوم' : '14-Day Free Trial'}
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          >
            {language === 'ar' ? 'اختر خطتك المثالية' : 'Choose Your Perfect Plan'}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            {language === 'ar'
              ? 'خطط مرنة تناسب احتياجاتك. ابدأ مجاناً وقم بالترقية في أي وقت.'
              : 'Flexible plans that fit your needs. Start free and upgrade anytime.'}
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className={cn('text-sm', !isYearly && 'text-primary font-medium')}>
              {language === 'ar' ? 'شهري' : 'Monthly'}
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <span className={cn('text-sm', isYearly && 'text-primary font-medium')}>
              {language === 'ar' ? 'سنوي' : 'Yearly'}
            </span>
            {isYearly && (
              <Badge className="ml-2 bg-green-500 text-white">
                {language === 'ar' ? 'وفر 20%' : 'Save 20%'}
              </Badge>
            )}
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="section-container">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-full">
                  <CardHeader className="text-center">
                    <Skeleton className="h-6 w-24 mx-auto mb-2" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </CardHeader>
                  <CardContent className="text-center">
                    <Skeleton className="h-10 w-20 mx-auto mb-4" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} className="h-4 w-full" />
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <Card
                    className={cn(
                      'relative h-full flex flex-col',
                      plan.is_popular && 'border-primary shadow-lg ring-2 ring-primary'
                    )}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {language === 'ar' ? 'الأكثر شعبية' : 'Most Popular'}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="min-h-[40px]">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="text-center flex-1">
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{getPrice(plan)}</span>
                        {plan.price_monthly > 0 && (
                          <span className="text-muted-foreground text-sm">
                            /{isYearly ? (language === 'ar' ? 'سنة' : 'year') : (language === 'ar' ? 'شهر' : 'month')}
                          </span>
                        )}
                        {isYearly && getSavings(plan) && parseInt(getSavings(plan)) > 0 && (
                          <p className="text-sm text-green-500 mt-1">
                            {language === 'ar' ? `وفر $${getSavings(plan)} سنوياً` : `Save $${getSavings(plan)}/year`}
                          </p>
                        )}
                      </div>

                      <ul className="space-y-3 text-left">
                        {plan.features?.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={plan.is_popular ? 'default' : 'outline'}
                        asChild
                      >
                        <Link to="/auth/signup">
                          {plan.price_monthly === 0
                            ? (language === 'ar' ? 'ابدأ مجاناً' : 'Get Started Free')
                            : (language === 'ar' ? 'ابدأ التجربة المجانية' : 'Start Free Trial')}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-16 bg-muted/50">
        <div className="section-container text-center">
          <h2 className="text-2xl font-bold mb-4">
            {language === 'ar' ? 'أسئلة شائعة' : 'Frequently Asked Questions'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left mt-8">
            <div>
              <h3 className="font-semibold mb-2">
                {language === 'ar' ? 'هل يمكنني الإلغاء في أي وقت؟' : 'Can I cancel anytime?'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'نعم، يمكنك إلغاء اشتراكك في أي وقت. لا توجد عقود أو رسوم إلغاء.'
                  : 'Yes, you can cancel your subscription at any time. No contracts or cancellation fees.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                {language === 'ar' ? 'ما هي التجربة المجانية؟' : 'What\'s included in the free trial?'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'تتضمن التجربة المجانية 14 يوماً من الوصول الكامل لجميع ميزات الخطة المختارة.'
                  : 'The free trial includes 14 days of full access to all features of your chosen plan.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                {language === 'ar' ? 'هل بياناتي آمنة؟' : 'Is my data secure?'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'ar'
                  ? 'نعم، نستخدم تشفيراً على مستوى البنوك لحماية جميع بياناتك الشخصية والصحية.'
                  : 'Yes, we use bank-level encryption to protect all your personal and health data.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-12">
        <div className="section-container text-center">
          <p className="text-muted-foreground">
            {language === 'ar'
              ? '✓ ضمان استرداد الأموال خلال 30 يوماً • ✓ لا حاجة لبطاقة ائتمان للتجربة المجانية • ✓ إلغاء في أي وقت'
              : '✓ 30-day money-back guarantee • ✓ No credit card required for free trial • ✓ Cancel anytime'}
          </p>
        </div>
      </section>
    </div>
  )
}
