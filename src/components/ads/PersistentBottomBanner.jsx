import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Zap, ArrowRight, Gift, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const PersistentBottomBanner = ({
  variant = 'upgrade',
  dismissable = true,
  persistKey = 'bottom_banner'
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const navigate = useNavigate()
  const { shouldShowAds } = useAuth()

  useEffect(() => {
    // Check if user should see ads
    if (shouldShowAds && !shouldShowAds()) return

    // Check if already dismissed
    const dismissedTime = localStorage.getItem(`${persistKey}_dismissed`)
    if (dismissedTime) {
      const hoursSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60)
      if (hoursSinceDismissed < 24) return // Don't show again for 24 hours
    }

    // Show after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [shouldShowAds, persistKey])

  const bannerVariants = {
    upgrade: {
      title: 'Upgrade to Premium',
      subtitle: 'Unlock unlimited features',
      icon: Crown,
      color: 'from-purple-600 to-pink-600',
      cta: 'Upgrade Now',
      highlight: 'Popular'
    },
    offer: {
      title: 'Limited Time: 50% Off!',
      subtitle: 'First month premium',
      icon: Gift,
      color: 'from-green-500 to-emerald-600',
      cta: 'Claim Offer',
      highlight: 'Ends Soon'
    },
    trial: {
      title: 'Start Free Trial',
      subtitle: '7 days of Premium free',
      icon: Sparkles,
      color: 'from-blue-500 to-cyan-600',
      cta: 'Start Trial',
      highlight: 'No Card Required'
    },
    elite: {
      title: 'Go Elite',
      subtitle: 'Personal nutritionist access',
      icon: Zap,
      color: 'from-amber-500 to-orange-600',
      cta: 'Learn More',
      highlight: 'VIP'
    }
  }

  const content = bannerVariants[variant] || bannerVariants.upgrade
  const Icon = content.icon

  const handleCTA = () => {
    navigate('/pricing')
    handleDismiss()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (dismissable) {
      localStorage.setItem(`${persistKey}_dismissed`, Date.now().toString())
    }
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto pointer-events-auto">
          {isMinimized ? (
            // Minimized state - small floating button
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleMinimize}
              className={`ml-auto flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r ${content.color} text-white shadow-lg hover:shadow-xl transition-shadow`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{content.highlight}</span>
            </motion.button>
          ) : (
            // Full banner
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${content.color} shadow-2xl`}>
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 3, repeat: Infinity }
                  }}
                  className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"
                />
                <motion.div
                  animate={{
                    rotate: -360,
                    scale: [1, 1.3, 1]
                  }}
                  transition={{
                    rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 4, repeat: Infinity }
                  }}
                  className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
                />
              </div>

              <div className="relative flex items-center justify-between gap-4 p-4 sm:p-5">
                {/* Left section - Icon and text */}
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="hidden sm:flex w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl items-center justify-center flex-shrink-0"
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </motion.div>

                  <div className="text-white">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-lg">{content.title}</h3>
                      <span className="hidden sm:inline-flex px-2 py-0.5 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full">
                        {content.highlight}
                      </span>
                    </div>
                    <p className="text-sm text-white/80">{content.subtitle}</p>
                  </div>
                </div>

                {/* Right section - Actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    onClick={handleCTA}
                    variant="secondary"
                    className="bg-white text-gray-900 hover:bg-white/90 font-semibold whitespace-nowrap"
                  >
                    {content.cta}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>

                  {dismissable && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMinimize}
                        className="hidden sm:flex text-white/70 hover:text-white hover:bg-white/10"
                        title="Minimize"
                      >
                        <motion.div
                          animate={{ rotate: isMinimized ? 180 : 0 }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 9l-7 7-7-7" />
                          </svg>
                        </motion.div>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDismiss}
                        className="text-white/70 hover:text-white hover:bg-white/10"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress indicator */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 30, ease: 'linear' }}
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 origin-left"
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default PersistentBottomBanner
