import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, CheckCircle, Sparkles, Mail, User, Phone, Loader2, Copy, Check, PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Generate a unique discount code
const generateDiscountCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'GREENOFIG'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function PopupAd({
  delay = 10000,
  storageKey = 'greenofig_discount_claimed',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState('form') // 'form' | 'success'
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [discountCode, setDiscountCode] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [errors, setErrors] = useState({})
  const { shouldShowAds, shouldShowUpgradePrompts, user } = useAuth()

  useEffect(() => {
    // Check if user should see ads/upgrades
    if (shouldShowAds && !shouldShowAds()) return
    if (shouldShowUpgradePrompts && !shouldShowUpgradePrompts()) return

    // Check if discount already claimed (permanent - localStorage)
    const alreadyClaimed = localStorage.getItem(storageKey)
    if (alreadyClaimed) return

    // Show popup after delay
    const timer = setTimeout(() => {
      setIsOpen(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [shouldShowAds, shouldShowUpgradePrompts, delay, storageKey])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Phone is optional, but validate format if provided
    if (formData.phone && !/^[\d\s+()-]{8,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const code = generateDiscountCode()

      // Save to Supabase leads table
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('leads')
          .insert({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim() || null,
            discount_code: code,
            discount_percentage: 25,
            source: 'popup_discount',
            status: 'new',
            user_id: user?.id || null,
            metadata: {
              user_agent: navigator.userAgent,
              referrer: document.referrer,
              page: window.location.pathname,
              timestamp: new Date().toISOString(),
            }
          })

        if (error) {
          console.error('Error saving lead:', error)
          // Continue anyway - don't block the user experience
        }
      }

      // Store in localStorage that discount was claimed
      localStorage.setItem(storageKey, JSON.stringify({
        code,
        email: formData.email,
        claimedAt: new Date().toISOString()
      }))

      setDiscountCode(code)
      setStep('success')
      toast.success('Discount code claimed!')

    } catch (error) {
      console.error('Error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(discountCode)
    setCopied(true)
    toast.success('Discount code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setIsOpen(false)
    // If they close without claiming, mark as shown but not claimed
    if (step === 'form') {
      sessionStorage.setItem('popup_dismissed', 'true')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-border/50">
              {step === 'form' ? (
                <>
                  {/* Header */}
                  <div className="relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-6 text-white">
                    <button
                      onClick={handleClose}
                      className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <Badge className="mb-3 bg-white/20 text-white border-0">
                      EXCLUSIVE OFFER
                    </Badge>

                    <div className="flex items-start gap-4">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl"
                      >
                        <Gift className="h-8 w-8" />
                      </motion.div>
                      <div>
                        <h3 className="text-2xl font-bold leading-tight">Get 25% OFF</h3>
                        <p className="text-sm opacity-90 mt-1">Your First Subscription!</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm opacity-90">
                      Enter your details to receive an exclusive one-time discount code
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={errors.phone ? 'border-red-500' : ''}
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white hover:opacity-90 h-12 text-lg font-semibold"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Claim My 25% Discount
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you agree to receive promotional emails. Unsubscribe anytime.
                    </p>
                  </form>
                </>
              ) : (
                /* Success State */
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="mx-auto w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6"
                  >
                    <PartyPopper className="h-10 w-10 text-white" />
                  </motion.div>

                  <h3 className="text-2xl font-bold mb-2">Congratulations!</h3>
                  <p className="text-muted-foreground mb-6">
                    Here's your exclusive 25% discount code:
                  </p>

                  {/* Discount Code Box */}
                  <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-dashed border-green-500 rounded-xl p-4 mb-6">
                    <p className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 tracking-wider">
                      {discountCode}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCode}
                      className="absolute top-2 right-2"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Valid for 30 days</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>One-time use only</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Works on all subscription plans</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      asChild
                      className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white hover:opacity-90 h-12"
                    >
                      <Link to={`/pricing?discount=${discountCode}`} onClick={handleClose}>
                        Use Discount Now
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleClose}
                      className="text-muted-foreground"
                    >
                      I'll use it later
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-4">
                    We've also sent the code to your email for safekeeping.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Keep the InterstitialAd export for backwards compatibility
export function InterstitialAd({
  isOpen,
  onClose,
  countdown = 5,
  variant = 'premium',
}) {
  const [canClose, setCanClose] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(countdown)
  const { shouldShowAds } = useAuth()

  useEffect(() => {
    if (!isOpen) return

    if (shouldShowAds && !shouldShowAds()) {
      onClose?.()
      return
    }

    setSecondsLeft(countdown)
    setCanClose(false)

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setCanClose(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, shouldShowAds, onClose, countdown])

  if (!isOpen) return null
  if (shouldShowAds && !shouldShowAds()) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-4"
        >
          <div className="absolute top-4 right-4">
            {canClose ? (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Skip in {secondsLeft}s
              </span>
            )}
          </div>

          <div className="text-center max-w-2xl">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 mb-4">
              <Sparkles className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-2">Upgrade to Premium</h2>
              <p className="text-muted-foreground mb-6">
                Enjoy an ad-free experience with unlimited features
              </p>
              <Button asChild className="bg-primary hover:bg-primary/90">
                <Link to="/pricing" onClick={onClose}>
                  View Plans
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upgrade to remove all ads and unlock premium features
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
