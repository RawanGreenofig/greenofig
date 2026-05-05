import React from 'react'
import { motion } from 'framer-motion'
import { X, AlertCircle, Zap, Lock, Crown, CheckCircle, ArrowRight, MessageCircle, Camera, Dumbbell, Calendar, TrendingUp } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useNavigate } from 'react-router-dom'

const LimitReachedModal = ({
  isOpen,
  onClose,
  limitType = 'ai_messages',
  currentUsage = 0,
  maxUsage = 10
}) => {
  const navigate = useNavigate()

  const limitConfigs = {
    ai_messages: {
      title: 'Daily AI Message Limit Reached',
      icon: MessageCircle,
      color: 'from-blue-500 to-cyan-600',
      description: `You've used ${currentUsage} of ${maxUsage} free AI messages today`,
      resetText: 'Resets tomorrow at midnight',
      upgradeBenefits: ['Unlimited AI recommendations', 'Unlimited nutrition advice', '24/7 AI assistance', 'Priority response time'],
      upgradePrice: '$9.99/month',
      upgradeTier: 'Basic'
    },
    meal_logs: {
      title: 'Daily Meal Log Limit Reached',
      icon: Dumbbell,
      color: 'from-green-500 to-emerald-600',
      description: `You've logged ${currentUsage} of ${maxUsage} meals today`,
      resetText: 'Resets tomorrow at midnight',
      upgradeBenefits: ['Unlimited meal logging', 'Advanced nutrition tracking', 'Macro breakdown', 'Meal history export'],
      upgradePrice: '$9.99/month',
      upgradeTier: 'Basic'
    },
    workout_logs: {
      title: 'Workout Log Limit Reached',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600',
      description: `You've logged ${currentUsage} of ${maxUsage} workouts today`,
      resetText: 'Resets tomorrow at midnight',
      upgradeBenefits: ['Unlimited workout logging', 'Advanced exercise library', 'Progress tracking', 'Custom routines'],
      upgradePrice: '$9.99/month',
      upgradeTier: 'Basic'
    },
    photo_analysis: {
      title: 'Photo Analysis Limit Reached',
      icon: Camera,
      color: 'from-purple-500 to-pink-600',
      description: `You've used ${currentUsage} of ${maxUsage} photo analyses this week`,
      resetText: 'Resets next week',
      upgradeBenefits: ['Unlimited photo food recognition', 'Instant calorie estimation', 'Macro detection', 'Meal suggestions'],
      upgradePrice: '$39.99/month',
      upgradeTier: 'Elite'
    },
    consultations: {
      title: 'Video Consultation Limit Reached',
      icon: Calendar,
      color: 'from-indigo-500 to-purple-600',
      description: `You've used ${currentUsage} of ${maxUsage} consultations this month`,
      resetText: 'Resets next month',
      upgradeBenefits: ['Unlimited video consultations', 'Direct nutritionist messaging', 'Priority scheduling', 'Follow-up support'],
      upgradePrice: '$39.99/month',
      upgradeTier: 'Elite'
    }
  }

  const config = limitConfigs[limitType] || limitConfigs.ai_messages
  const Icon = config.icon
  const usagePercentage = Math.min((currentUsage / maxUsage) * 100, 100)

  const handleUpgrade = () => {
    navigate('/pricing')
    onClose()
  }

  const handleViewPlans = () => {
    navigate('/pricing')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0">
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-r ${config.color} p-6 text-white`}>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative mb-4"
          >
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Icon className="w-8 h-8" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Lock className="w-6 h-6 text-white bg-red-500 rounded-full p-1" />
            </div>
          </motion.div>

          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-bold text-white mb-2">{config.title}</DialogTitle>
            <DialogDescription className="text-white/90 text-base">{config.description}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Usage Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Usage Today</span>
              <Badge variant={usagePercentage >= 100 ? 'destructive' : 'secondary'}>
                {currentUsage}/{maxUsage}
              </Badge>
            </div>
            <Progress value={usagePercentage} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {config.resetText}
            </p>
          </div>

          {/* Upgrade Benefits */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Unlock with {config.upgradeTier}</h3>
            </div>
            <div className="space-y-2">
              {config.upgradeBenefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${config.color} flex items-center justify-center`}>
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Price Card */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Starting at</p>
                <p className="text-2xl font-bold">{config.upgradePrice}</p>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />Popular
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleUpgrade}
              className={`w-full bg-gradient-to-r ${config.color} text-white hover:opacity-90`}
              size="lg"
            >
              Upgrade to {config.upgradeTier} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" onClick={handleViewPlans} className="w-full">
              View All Plans
            </Button>
          </div>

          {/* Skip Link */}
          <div className="text-center">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              I'll wait for the reset
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LimitReachedModal
