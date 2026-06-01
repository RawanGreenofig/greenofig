import type { NextRequest } from 'next/server'
import { badRequest, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { rateLimit } from '@/lib/server/rateLimit'
import { ipFromRequest } from '@/lib/api/audit'

/**
 * /api/clinic-pay/[id]   (PUBLIC — no auth)
 *
 * Behind the pay link the coach shares for a clinic_payments row.
 *   GET  → amount / currency / status + the coach's Zelle handle + whether
 *          card payment is available, so the public page can render.
 *   POST → create a Stripe Checkout Session for this amount (metadata
 *          ties it back to the ledger row; the Stripe webhook marks it
 *          paid + notifies the coach). Returns { url }.
 */

export const dynamic = 'force-dynamic'

async function loadPayment(id: string) {
  const service = getServiceSupabase()
  if (!service) return { service: null, payment: null, name: null as string | null }
  const { data } = await service
    .from('clinic_payments')
    .select('id, clinic_client_id, amount_cents, currency, status')
    .eq('id', id)
    .maybeSingle()
  const payment = data as
    | { id: string; clinic_client_id: string; amount_cents: number; currency: string; status: string }
    | null
  let name: string | null = null
  if (payment) {
    const { data: c } = await service
      .from('clinic_clients')
      .select('full_name')
      .eq('id', payment.clinic_client_id)
      .maybeSingle()
    name = (c as { full_name?: string } | null)?.full_name ?? null
  }
  return { service, payment, name }
}

async function readZelle(service: NonNullable<ReturnType<typeof getServiceSupabase>>): Promise<string | null> {
  const { data } = await service
    .from('platform_settings')
    .select('value')
    .eq('key', 'clinic_zelle_handle')
    .maybeSingle()
  const v = (data as { value?: unknown } | null)?.value
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { service, payment } = await loadPayment(params.id)
  if (!service) return serviceUnavailable('Supabase service role')
  if (!payment) return notFound('This payment link is not valid.')
  return json({
    amount_cents: payment.amount_cents,
    currency: payment.currency,
    status: payment.status,
    zelle_handle: await readZelle(service),
    card_available: isStripeConfigured(),
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = ipFromRequest(req) ?? 'unknown'
  if (!(await rateLimit(`clinic-pay:${ip}`, { limit: 12, windowSec: 600 }))) {
    return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429)
  }
  let body: { locale?: string } = {}
  try {
    body = (await req.json()) as { locale?: string }
  } catch {
    /* optional body */
  }
  const locale = body.locale === 'ar' ? 'ar' : 'en'

  const { service, payment, name } = await loadPayment(params.id)
  if (!service) return serviceUnavailable('Supabase service role')
  if (!payment) return notFound('This payment link is not valid.')
  if (payment.status === 'paid') return badRequest('This payment is already settled.')
  if (payment.amount_cents <= 0) return badRequest('Nothing to pay.')

  if (!isStripeConfigured()) return serviceUnavailable('Card payments (Stripe)')
  const stripe = getStripe()
  if (!stripe) return serviceUnavailable('Card payments (Stripe)')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://greenofig.com'
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: (payment.currency || 'USD').toLowerCase(),
          unit_amount: payment.amount_cents,
          product_data: { name: name ? `Payment — ${name}` : 'Clinic payment' },
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/${locale}/clinic-pay/${payment.id}?paid=1`,
    cancel_url: `${baseUrl}/${locale}/clinic-pay/${payment.id}`,
    metadata: { kind: 'clinic_payment', clinic_payment_id: payment.id },
  })

  if (!session.url) return badRequest('Could not start checkout.')
  return json({ url: session.url })
}
