// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

// Plan tier mapping
const PLAN_TIERS: Record<string, string> = {
  'price_1SuQpTAjePCkjMLonX5882vO': 'Basic',
  'price_1SuQpVAjePCkjMLobIFcvNra': 'Basic',
  'price_1SuQpWAjePCkjMLowPlqj0Uu': 'Premium',
  'price_1SuQpYAjePCkjMLoWDV1Dt3m': 'Premium',
  'price_1SuQpZAjePCkjMLoTyydeoPX': 'Elite',
  'price_1SuQpaAjePCkjMLoYASNFkos': 'Elite',
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Received Stripe event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planId = session.metadata?.plan_id
        const billingCycle = session.metadata?.billing_cycle

        if (userId && planId) {
          // Get subscription details
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0]?.price.id
          const tier = PLAN_TIERS[priceId] || planId

          // Update user's subscription in database
          const { error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: session.customer as string,
              plan_id: planId,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

          if (subscriptionError) {
            console.error('Error updating subscription:', subscriptionError)
          }

          // Update user's profile tier
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              tier: tier,
              subscription_tier: tier,
              stripe_customer_id: session.customer as string,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          if (profileError) {
            console.error('Error updating profile:', profileError)
          }

          // Record the payment transaction
          await supabase
            .from('payment_transactions')
            .insert({
              user_id: userId,
              stripe_payment_intent_id: session.payment_intent as string,
              amount: session.amount_total ? session.amount_total / 100 : 0,
              currency: session.currency,
              status: 'succeeded',
              description: `${tier} subscription - ${billingCycle}`,
            })

          console.log(`Subscription activated for user ${userId}: ${tier} (${billingCycle})`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          const priceId = subscription.items.data[0]?.price.id
          const tier = PLAN_TIERS[priceId] || 'Basic'

          await supabase
            .from('user_subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          // Update tier if subscription is active
          if (subscription.status === 'active') {
            await supabase
              .from('profiles')
              .update({ tier: tier, subscription_tier: tier })
              .eq('id', userId)
          }

          console.log(`Subscription updated for user ${userId}: ${subscription.status}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id

        if (userId) {
          // Update subscription status
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          // Downgrade user to free tier
          await supabase
            .from('profiles')
            .update({
              tier: 'Free',
              subscription_tier: 'Free',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`Subscription canceled for user ${userId}`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          // Record failed payment
          await supabase
            .from('payment_transactions')
            .insert({
              user_id: profile.id,
              stripe_payment_intent_id: invoice.payment_intent as string,
              amount: invoice.amount_due / 100,
              currency: invoice.currency,
              status: 'failed',
              description: 'Subscription renewal failed',
            })

          console.log(`Payment failed for user ${profile.id}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
