import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/stripe/portal
 *
 * Returns a Stripe Billing Portal session URL — the "Manage billing"
 * button on Settings → Subscription redirects there. The user can update
 * the card, cancel, switch plan, see invoices.
 *
 * No body. Response: `{ url: string }`.
 */

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (!isStripeConfigured()) return serviceUnavailable('Stripe')
  const stripe = getStripe()
  if (!stripe) return serviceUnavailable('Stripe')

  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  const { data: subRow } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const customerId = (subRow as { stripe_customer_id: string | null } | null)
    ?.stripe_customer_id
  if (!customerId) {
    return badRequest('No billing customer on file. Start a subscription first.')
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/dashboard/settings`,
    })
    return json({ url: session.url })
  } catch {
    return internalError()
  }
})
