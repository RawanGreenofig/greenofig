import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

/**
 * POST /api/admin/pricing
 *
 * Admin-only. Bumps the published price for one tier × one cycle:
 *   1. Creates a new Stripe price on the existing product at the new
 *      USD amount.
 *   2. Archives the previous Stripe price ID (looked up from
 *      platform_settings).
 *   3. Updates the matching `stripe_price_*` and `pricing_*` rows in
 *      platform_settings so checkout + the marketing page both pick up
 *      the new value on the next read.
 *
 * Body: { tier: 'basic'|'premium'|'vip',
 *         cycle: 'monthly'|'yearly',
 *         amountUsd: number }
 *
 * Existing subscribers keep their old price — Stripe never silently
 * re-prices an active subscription. They have to switch plans through
 * the billing portal to land on the new amount.
 */

type Tier = 'basic' | 'premium' | 'vip'

const TIER_PRODUCT: Record<Tier, string> = {
  basic:   'prod_USVFuSTxxELhPL',
  premium: 'prod_USVFd6TELQrQjq',
  vip:     'prod_USVFFnYg9uY8m0',
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')
  if (!isStripeConfigured()) return serviceUnavailable('Stripe')
  const stripe = getStripe()
  if (!stripe) return serviceUnavailable('Stripe')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: { tier?: string; cycle?: string; amountUsd?: number }
  try {
    body = (await req.json()) as { tier?: string; cycle?: string; amountUsd?: number }
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const tier = body.tier
  const cycle = body.cycle
  if (tier !== 'basic' && tier !== 'premium' && tier !== 'vip') {
    return badRequest('tier must be basic, premium, or vip.')
  }
  if (cycle !== 'monthly' && cycle !== 'yearly') {
    return badRequest('cycle must be monthly or yearly.')
  }
  const amountUsd = body.amountUsd
  if (
    typeof amountUsd !== 'number' ||
    !Number.isFinite(amountUsd) ||
    amountUsd <= 0 ||
    amountUsd > 10_000
  ) {
    return badRequest('amountUsd must be 0.01 .. 10000.')
  }
  const unitAmount = Math.round(amountUsd * 100)

  // Fetch the current Stripe price ID so we can archive it after the new
  // one is created. Lookup uses the same setting key the rest of the app
  // reads from.
  const idKey = `stripe_price_${tier}_${cycle === 'monthly' ? 'monthly' : 'yearly'}`
  const stickerKey = `pricing_${tier}_${cycle === 'monthly' ? 'monthly' : 'annual'}`

  const { data: idRow } = await service
    .from('platform_settings')
    .select('value')
    .eq('key', idKey)
    .maybeSingle()
  const idRowValue = (idRow as { value?: unknown } | null)?.value
  const oldPriceId = typeof idRowValue === 'string' ? idRowValue : null

  // 1) Create the new Stripe price
  let newPriceId: string
  try {
    const created = await stripe.prices.create({
      product: TIER_PRODUCT[tier],
      currency: 'usd',
      unit_amount: unitAmount,
      recurring: { interval: cycle === 'monthly' ? 'month' : 'year' },
    })
    newPriceId = created.id
  } catch (err) {
    console.error('[admin/pricing] stripe price create failed:', err)
    return internalError()
  }

  // 2) Archive the old one — best-effort. Failure is non-fatal: we'd
  //    rather have two active prices in Stripe than fail the admin's
  //    update halfway.
  if (oldPriceId && oldPriceId !== newPriceId) {
    try {
      await stripe.prices.update(oldPriceId, { active: false })
    } catch (err) {
      console.warn('[admin/pricing] could not archive old price:', err)
    }
  }

  // 3) Persist both the new ID + new sticker amount
  const { error: idErr } = await service
    .from('platform_settings')
    .upsert(
      {
        key: idKey,
        value: newPriceId,
        description: `Stripe price ID — ${tier} / ${cycle}`,
      } as never,
      { onConflict: 'key' },
    )
  if (idErr) {
    console.error('[admin/pricing] settings write (id) failed:', idErr)
    return internalError()
  }

  const { error: stickerErr } = await service
    .from('platform_settings')
    .upsert(
      {
        key: stickerKey,
        value: amountUsd,
        description: `${tier[0].toUpperCase()}${tier.slice(1)} ${cycle === 'monthly' ? 'monthly' : 'annual-per-month'} USD shown on /pricing`,
      } as never,
      { onConflict: 'key' },
    )
  if (stickerErr) {
    console.error('[admin/pricing] settings write (sticker) failed:', stickerErr)
    return internalError()
  }

  // Audit
  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'pricing_updated',
    resource_type: 'pricing',
    resource_id: idKey,
    new_value: { tier, cycle, amountUsd, newPriceId, archivedPriceId: oldPriceId },
  } as never)

  return json({ ok: true, priceId: newPriceId, amountUsd })
})
