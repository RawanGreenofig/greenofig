import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Zap, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const InterstitialAd = ({
  isOpen,
  onClose,
  variant = 'premium',
  countdown = 5,
  onComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(countdown)
  const [canSkip, setCanSkip] = useState(false)
  const navigate = useNavigate()
  const { shouldShowAds } = useAuth()

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdown)
      setCanSkip(false)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanSkip(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, countdown])

  // Don't show if user shouldn't see ads
  if (!shouldShowAds || !shouldShowAds()) return null

  const variants = {
    premium: {
      title: 'Unlock Your Full Potential',
      subtitle: 'Upgrade to Premium for unlimited access',
      color: 'from-purple-600 via-pink-600 to-rose-600',
      icon: Crown,
      features: [
        'Unlimited AI meal planning',
        'Advanced progress analytics',
        'Priority nutritionist access',
        'Custom workout routines'
      ],
      cta: 'Get Premium',
      price: '$19.99/month'
    },
    elite: {
      title: 'Experience Elite Wellness',
      subtitle: 'The ultimate health transformation package',
      color: 'from-amber-500 via-orange-500 to-red-500',
      icon: Sparkles,
      features: [
        'Everything in Premium',
        'Unlimited video consultations',
        'Personal nutritionist assigned',
        'VIP support & early features'
      ],
      cta: 'Go Elite',
      price: '$39.99/month'
    },
    special: {
      title: 'Limited Time Offer!',
      subtitle: 'Get 50% off your first month',
      color: 'from-emerald-500 via-teal-500 to-cyan-500',
      icon: Zap,
      features: [
        'All Premium features',
        'First month half price',
        'Cancel anytime',
        'Start seeing results today'
      ],
      cta: 'Claim Offer',
      price: '$9.99 first month'
    }
  }

  const content = variants[variant] || variants.premium
  const Icon = content.icon

  const handleUpgrade = () => {
    navigate('/pricing')
    onClose()
    onComplete?.()
  }

  const handleSkip = () => {
    if (canSkip) {
      onClose()
      onComplete?.()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl mx-4"
          >
            {/* Main Card */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${content.color} p-1`}>
              <div className="relative bg-background/95 backdrop-blur-xl rounded-[22px] overflow-hidden">
                {/* Skip button */}
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    disabled={!canSkip}
                    className={`text-muted-foreground ${canSkip ? 'hover:text-foreground' : 'opacity-50 cursor-not-allowed'}`}
                  >
                    {canSkip ? (
                      <>Skip <X className="w-4 h-4 ml-1" /></>
                    ) : (
                      <>Skip in {timeLeft}s</>
                    )}
                  </Button>
                </div>

                {/* Header */}
                <div className={`relative bg-gradient-to-r ${content.color} p-8 pb-16 text-white`}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    className="flex justify-center mb-6"
                  >
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <Icon className="w-10 h-10" />
                    </div>
                  </motion.div>

                  <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl md:text-4xl font-bold text-center mb-2"
                  >
                    {content.title}
                  </motion.h2>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-white/90 text-center"
                  >
                    {content.subtitle}
                  </motion.p>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 -mt-8">
                  {/* Price Card */}
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border rounded-2xl p-6 shadow-xl mb-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-sm text-muted-foreground">Starting at</p>
                        <p className="text-3xl font-bold">{content.price}</p>
                      </div>
                      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 self-start sm:self-auto">
                        <Zap className="w-3 h-3" /> Best Value
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {content.features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="flex items-center gap-2"
                        >
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${content.color} flex items-center justify-center flex-shrink-0`}>
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* CTA Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <Button
                      onClick={handleUpgrade}
                      size="lg"
                      className={`flex-1 bg-gradient-to-r ${content.color} text-white hover:opacity-90 h-14 text-lg`}
                    >
                      {content.cta}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => navigate('/pricing')}
                      className="flex-1 h-14"
                    >
                      View All Plans
                    </Button>
                  </motion.div>

                  {/* Trust badges */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground"
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Cancel anytime</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>14-day money-back</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Secure payment</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default InterstitialAd
