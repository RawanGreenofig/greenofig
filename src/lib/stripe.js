import { loadStripe } from '@stripe/stripe-js'
import { supabase, isSupabaseConfigured } from './supabase'

// Stripe Publishable Key (Test Mode)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51SHrlbPPAckGFnuTvYujWq9sz4oO2cpWTlSRURA62g3MDIcqSx8wBV65fL5hP7hmaWylbAlY8CjZl5yirP27JzKg00OkbSgYy8'

export const STRIPE_PRODUCTS = {
  free: 'prod_TsBBX6c7LTfkLC',
  basic: 'prod_TsBBjPBxAggwia',
  premium: 'prod_TsBBCwTc5MZng3',
  elite: 'prod_TsBB7DID9t70j2',
}

export const STRIPE_PRICES = {
  basic: {
    monthly: 'price_1SuQpTAjePCkjMLonX5882vO',
    yearly: 'price_1SuQpVAjePCkjMLobIFcvNra',
  },
  premium: {
    monthly: 'price_1SuQpWAjePCkjMLowPlqj0Uu',
    yearly: 'price_1SuQpYAjePCkjMLoWDV1Dt3m',
  },
  elite: {
    monthly: 'price_1SuQpZAjePCkjMLoTyydeoPX',
    yearly: 'price_1SuQpaAjePCkjMLoYASNFkos',
  },
}

// Static plan catalog (no subscription_plans table in schema)
export const PLAN_CATALOG = [
  { id: 'free', name: 'Free', price_monthly: 0, price_yearly: 0 },
  { id: 'basic', name: 'Basic', price_monthly: 9.99, price_yearly: 99 },
  { id: 'premium', name: 'Premium', price_monthly: 19.99, price_yearly: 199 },
  { id: 'elite', name: 'Elite', price_monthly: 39.99, price_yearly: 399 },
]

let stripePromise = null

export const getStripe = async () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

// Returns the user's most recent subscription row, or null
export const getUserSubscription = async (userId) => {
  if (!isSupabaseConfigured() || !userId) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('getUserSubscription:', error)
    return null
  }
  return data
}

export const createCheckoutSession = async ({
  planId,
  billingCycle = 'monthly',
  successUrl,
  cancelUrl,
  discountCode = null,
  discountPercentage = null,
}) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Authentication required')

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      planId,
      billingCycle,
      successUrl: successUrl || `${window.location.origin}/app/dashboard?payment=success`,
      cancelUrl: cancelUrl || `${window.location.origin}/pricing?payment=cancelled`,
      discountCode,
      discountPercentage,
    },
  })

  if (error) throw error
  return data
}

export const redirectToCheckout = async (sessionId) => {
  const stripe = await getStripe()
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) throw error
}

export const getPriceId = (planId, billingCycle = 'monthly') => {
  const plan = (planId || '').toLowerCase()
  if (plan === 'free') return null
  return STRIPE_PRICES[plan]?.[billingCycle] || null
}

// Cancel = mark status='cancelled' and end_date=now
export const cancelSubscription = async (userId) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  // Find latest active subscription
  const sub = await getUserSubscription(userId)
  if (!sub || sub.status !== 'active') {
    throw new Error('No active subscription to cancel')
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      end_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)
    .select()
    .single()

  if (error) throw error

  // Reset profile tier to Free
  await supabase
    .from('user_profiles')
    .update({ tier: 'Free' })
    .eq('id', userId)

  return data
}

// Resume = reactivate the most recent cancelled subscription
export const resumeSubscription = async (userId) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const sub = await getUserSubscription(userId)
  if (!sub) throw new Error('No subscription to resume')

  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      end_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sub.id)
    .select()
    .single()

  if (error) throw error

  await supabase
    .from('user_profiles')
    .update({ tier: sub.plan })
    .eq('id', userId)

  return data
}

// Static catalog — no table for plans in current schema
export const getSubscriptionPlans = async () => PLAN_CATALOG

// Payment history = subscription rows ordered by date (no payment_transactions table)
export const getPaymentHistory = async (userId) => {
  if (!isSupabaseConfigured() || !userId) return []

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, plan, price, billing_cycle, status, start_date, end_date, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getPaymentHistory:', error)
    return []
  }
  return data || []
}

// Refunds: there's no refund_requests table — file a support ticket instead
export const requestRefund = async ({ userId, reason, amount, customerNotes = null }) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
      subject: `Refund request${amount ? ` ($${amount})` : ''}`,
      description: `Reason: ${reason}\n\n${customerNotes || ''}`.trim(),
      category: 'billing',
      priority: 'high',
      status: 'open',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Create a subscription row (used by demo checkout when there's no Stripe webhook)
export const createSubscriptionRow = async ({ userId, planId, billingCycle, price }) => {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured')

  const planName = planId.charAt(0).toUpperCase() + planId.slice(1)
  const periodMs = billingCycle === 'yearly' ? 365 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000

  // Cancel any existing active subscription first
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', end_date: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active')

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan: planName,
      status: 'active',
      price,
      billing_cycle: billingCycle,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + periodMs).toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export default {
  getStripe,
  getUserSubscription,
  createCheckoutSession,
  redirectToCheckout,
  getPriceId,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionPlans,
  getPaymentHistory,
  requestRefund,
  createSubscriptionRow,
  STRIPE_PRODUCTS,
  STRIPE_PRICES,
  PLAN_CATALOG,
}
