import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Zap, Star, Lock, Award, CheckCircle, ArrowRight, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

const UpgradePrompts = ({ trigger = 'feature_limit', feature = 'AI Meal Plan', onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()
  const { shouldShowUpgradePrompts } = useAuth()

  useEffect(() => {
    // Check if user should see upgrade prompts
    if (!shouldShowUpgradePrompts()) return

    // Check if already dismissed recently
    const dismissedTime = localStorage.getItem(`upgrade_prompt_${trigger}_dismissed`)
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60)
      if (hoursSinceDismissed < 24) return // Don't show again for 24 hours
    }

    if (trigger) setIsVisible(true)
  }, [trigger, shouldShowUpgradePrompts])

  const promptContent = {
    feature_limit: {
      title: 'Unlock Premium Features',
      subtitle: `${feature} is available for Premium members`,
      icon: Lock,
      color: 'from-purple-500 to-pink-600',
      benefits: ['Unlimited AI meal plans', 'Advanced progress tracking', 'Priority support', 'Custom workout plans'],
      cta: 'Upgrade to Premium',
      price: '$19.99/month'
    },
    daily_limit: {
      title: "You've Reached Your Daily Limit",
      subtitle: 'Upgrade to get unlimited access',
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      benefits: ['Unlimited daily logs', 'Advanced analytics', 'Custom goals', 'Export your data'],
      cta: 'Remove Limits',
      price: '$9.99/month'
    },
    trial_ending: {
      title: 'Your Trial is Ending Soon',
      subtitle: 'Continue your progress with Premium',
      icon: Gift,
      color: 'from-green-500 to-emerald-600',
      benefits: ["Don't lose your progress", 'Keep all your data', 'Continue with nutritionist', 'Unlock all features'],
      cta: 'Continue with Premium',
      price: '$19.99/month',
      discount: '20% OFF'
    },
    ai_limit: {
      title: 'AI Coach Limit Reached',
      subtitle: 'Upgrade for unlimited AI conversations',
      icon: Star,
      color: 'from-blue-500 to-cyan-600',
      benefits: ['Unlimited AI messages', '24/7 AI assistance', 'Personalized advice', 'Priority responses'],
      cta: 'Get Unlimited AI',
      price: '$9.99/month'
    }
  }

  const content = promptContent[trigger] || promptContent.feature_limit
  const Icon = content.icon

  const handleUpgrade = () => {
    navigate('/pricing')
    setIsVisible(false)
    onClose?.()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(`upgrade_prompt_${trigger}_dismissed`, Date.now().toString())
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg"
        >
          <Card className="overflow-hidden border-0 shadow-2xl">
            <div className={`relative bg-gradient-to-r ${content.color} p-8 text-white`}>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>

              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                className="mb-4"
              >
                <Icon className="w-16 h-16" />
              </motion.div>

              <h2 className="text-3xl font-bold mb-2">{content.title}</h2>
              <p className="text-lg text-white/90 mb-4">{content.subtitle}</p>

              <div className="flex items-center gap-2">
                {content.discount && (
                  <Badge className="bg-white/20 text-white border-white/30">{content.discount}</Badge>
                )}
                <p className="text-2xl font-bold">{content.price}</p>
              </div>
            </div>

            <CardContent className="p-6 bg-card">
              <div className="space-y-3 mb-6">
                {content.benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r ${content.color} flex items-center justify-center`}>
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm">{benefit}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleUpgrade}
                  className={`flex-1 bg-gradient-to-r ${content.color} text-white hover:opacity-90`}
                >
                  {content.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" onClick={handleDismiss}>
                  Maybe Later
                </Button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>14-day money-back</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default UpgradePrompts
