import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CreditCard, Lock, ArrowLeft, Check, Shield, Loader2,
  User, Mail, MapPin, Building, Globe, ExternalLink,
  Tag, X, Percent
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getStripe, createCheckoutSession, createSubscriptionRow } from '@/lib/stripe'
import { validateDiscountCode, useDiscountCode } from '@/lib/leads'
import toast from 'react-hot-toast'

// Plan details
const planDetails = {
  basic: {
    name: 'Basic',
    priceMonthly: 9.99,
    priceYearly: 99,
    features: ['Unlimited AI coach messages', 'Full meal planning', 'Recipe database access', 'Macro tracking']
  },
  premium: {
    name: 'Premium',
    priceMonthly: 19.99,
    priceYearly: 199,
    features: ['Everything in Basic', 'Nutritionist messaging', 'Video consultations', 'Advanced analytics']
  },
  elite: {
    name: 'Elite',
    priceMonthly: 39.99,
    priceYearly: 399,
    features: ['Everything in Premium', 'Unlimited consultations', 'Doctor consultations', 'Priority support']
  }
}

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'JO', name: 'Jordan' },
]

export default function Checkout() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()

  const planId = searchParams.get('plan') || 'premium'
  const billing = searchParams.get('billing') || 'monthly'
  const plan = planDetails[planId]

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Billing Info, 2: Payment

  // Discount code state
  const [discountCode, setDiscountCode] = useState('')
  const [discountInput, setDiscountInput] = useState('')
  const [discountValidating, setDiscountValidating] = useState(false)
  const [appliedDiscount, setAppliedDiscount] = useState(null) // { percentage, code }

  const [formData, setFormData] = useState({
    // Billing info
    firstName: '',
    lastName: '',
    email: '',
    // Address
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    // Card info
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardName: ''
  })

  useEffect(() => {
    if (!user) {
      navigate(`/signup?plan=${planId}&billing=${billing}`)
      return
    }

    // Pre-fill with user data
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        firstName: userProfile.full_name?.split(' ')[0] || '',
        lastName: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email || ''
      }))
    }

    // Check for discount code in URL or localStorage
    const urlDiscount = searchParams.get('discount')
    if (urlDiscount) {
      handleApplyDiscount(urlDiscount)
    } else {
      // Check localStorage for claimed discount
      const storedDiscount = localStorage.getItem('greenofig_discount_claimed')
      if (storedDiscount) {
        try {
          const parsed = JSON.parse(storedDiscount)
          if (parsed.code && !parsed.used) {
            setDiscountInput(parsed.code)
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }, [user, userProfile, navigate, planId, billing])

  // Handle discount code application
  const handleApplyDiscount = async (codeToApply = null) => {
    const code = codeToApply || discountInput.trim().toUpperCase()
    if (!code) {
      toast.error('Please enter a discount code')
      return
    }

    setDiscountValidating(true)
    try {
      const result = await validateDiscountCode(code)

      if (result.valid) {
        setAppliedDiscount({
          code,
          percentage: result.percentage
        })
        setDiscountCode(code)
        toast.success(`${result.percentage}% discount applied!`)
      } else {
        toast.error(result.error || 'Invalid discount code')
        setAppliedDiscount(null)
        setDiscountCode('')
      }
    } catch (error) {
      toast.error('Failed to validate discount code')
    } finally {
      setDiscountValidating(false)
    }
  }

  // Remove applied discount
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountInput('')
    toast.success('Discount removed')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : value
  }

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value)
    setFormData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleExpiryChange = (e) => {
    const formatted = formatExpiryDate(e.target.value.replace('/', ''))
    setFormData(prev => ({ ...prev, expiryDate: formatted }))
  }

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all personal information')
      return false
    }
    if (!formData.address || !formData.city || !formData.postalCode || !formData.country) {
      toast.error('Please fill in all address fields')
      return false
    }
    return true
  }

  const handleContinueToPayment = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  // Handle Stripe hosted checkout (recommended)
  const handleStripeCheckout = async () => {
    setLoading(true)

    try {
      // Try to use Stripe hosted checkout via Supabase Edge Function
      const checkoutData = await createCheckoutSession({
        planId,
        billingCycle: billing,
        successUrl: `${window.location.origin}/app/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/pricing?payment=cancelled`,
        discountCode: appliedDiscount?.code || null,
        discountPercentage: appliedDiscount?.percentage || null,
      })

      if (checkoutData?.url) {
        // Mark discount code as used before redirecting
        if (appliedDiscount?.code) {
          await useDiscountCode(appliedDiscount.code)
        }
        window.location.href = checkoutData.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Stripe checkout error:', error)
      // Fall back to demo mode if Stripe not configured
      toast.error('Stripe checkout not configured. Using demo mode.')
      await handleDemoPayment()
    } finally {
      setLoading(false)
    }
  }

  // Demo payment for testing
  const handleDemoPayment = async () => {
    setLoading(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      if (appliedDiscount?.code) {
        await useDiscountCode(appliedDiscount.code)
      }

      if (isSupabaseConfigured() && user) {
        const planName = planId.charAt(0).toUpperCase() + planId.slice(1)
        const finalNumeric = Number(finalPrice)

        // Insert subscription row (cancels any prior active sub)
        await createSubscriptionRow({
          userId: user.id,
          planId,
          billingCycle: billing,
          price: finalNumeric,
        })

        // Update tier on profile (only valid columns)
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .update({ tier: planName })
          .eq('id', user.id)

        if (profileErr) throw profileErr
      }

      const discountMsg = appliedDiscount ? ` with ${appliedDiscount.percentage}% discount` : ''
      toast.success(`Payment successful${discountMsg}! Welcome to ${plan.name}!`)
      navigate('/app/dashboard?welcome=true')

    } catch (error) {
      console.error('Payment error:', error)
      toast.error(error.message || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.cardNumber || !formData.expiryDate || !formData.cvc || !formData.cardName) {
      toast.error('Please fill in all payment details')
      return
    }

    // Use demo payment for now (card details are just for UI)
    await handleDemoPayment()
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold mb-4">Invalid Plan</h2>
          <Button asChild>
            <Link to="/pricing">View Plans</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const basePrice = billing === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const discountAmount = appliedDiscount
    ? (basePrice * appliedDiscount.percentage / 100)
    : 0
  const finalPrice = (basePrice - discountAmount).toFixed(2)
  const monthlyEquivalent = billing === 'yearly'
    ? ((basePrice - discountAmount) / 12).toFixed(2)
    : finalPrice

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/pricing">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pricing
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Complete Your Order</h1>
          <p className="text-muted-foreground">You're just one step away from unlocking your health potential</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {step > 1 ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className="font-medium">Billing Info</span>
              </div>
              <div className="flex-1 h-0.5 bg-muted">
                <div className={`h-full bg-primary transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  2
                </div>
                <span className="font-medium">Payment</span>
              </div>
            </div>

            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {/* Personal Information */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="john@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing Address */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Billing Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main Street"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="New York"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State / Province</Label>
                        <Input
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="NY"
                        />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code</Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          placeholder="10001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select
                          value={formData.country}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleContinueToPayment} className="w-full" size="lg">
                  Continue to Payment
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Details
                    </CardTitle>
                    <CardDescription>
                      Your payment is secured with SSL encryption
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Name on Card</Label>
                        <Input
                          id="cardName"
                          name="cardName"
                          value={formData.cardName}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="cardNumber"
                            name="cardNumber"
                            value={formData.cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4242 4242 4242 4242"
                            className="pl-10"
                            maxLength={19}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Expiry Date</Label>
                          <Input
                            id="expiryDate"
                            name="expiryDate"
                            value={formData.expiryDate}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input
                            id="cvc"
                            name="cvc"
                            value={formData.cvc}
                            onChange={handleInputChange}
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        Your payment information is encrypted and secure
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}>
                          Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={loading}>
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Lock className="mr-2 h-4 w-4" />
                              Pay ${finalPrice}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>

                    {/* Stripe Hosted Checkout Option */}
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm text-muted-foreground text-center mb-4">
                        Or pay securely with Stripe
                      </p>
                      <Button
                        onClick={handleStripeCheckout}
                        variant="outline"
                        className="w-full bg-[#635bff]/10 border-[#635bff]/30 hover:bg-[#635bff]/20 text-[#635bff]"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Redirecting to Stripe...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Pay with Stripe Checkout
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        You'll be redirected to Stripe's secure payment page
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{plan.name} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {billing === 'yearly' ? 'Annual billing' : 'Monthly billing'}
                    </p>
                  </div>
                  <Badge variant="secondary">{billing}</Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium">What's included:</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Discount Code Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Discount Code
                  </Label>
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-green-600" />
                        <span className="font-mono text-sm font-medium text-green-600">
                          {appliedDiscount.code}
                        </span>
                        <Badge className="bg-green-500 text-white">
                          -{appliedDiscount.percentage}%
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={handleRemoveDiscount}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                        className="font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                      />
                      <Button
                        variant="outline"
                        onClick={() => handleApplyDiscount()}
                        disabled={discountValidating || !discountInput.trim()}
                      >
                        {discountValidating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${basePrice}</span>
                  </div>
                  {billing === 'yearly' && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Annual discount</span>
                      <span>-17%</span>
                    </div>
                  )}
                  {appliedDiscount && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>14-day free trial</span>
                    <span className="text-green-600">Included</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${finalPrice}/{billing === 'yearly' ? 'year' : 'month'}</span>
                </div>

                {billing === 'yearly' && (
                  <p className="text-sm text-muted-foreground text-center">
                    That's just ${monthlyEquivalent}/month
                  </p>
                )}

                {appliedDiscount && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    You're saving ${discountAmount.toFixed(2)} with your discount!
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-sm text-green-600">
                  <Shield className="h-4 w-4" />
                  30-day money-back guarantee
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
