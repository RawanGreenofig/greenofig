import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/coupons/redeem
 *
 * Validates a coupon code for the calling user and returns the
 * discount it grants, or 404 when the code doesn't exist or isn't
 * redeemable for this user. We do NOT increment `times_used` here
 * — that happens at Stripe checkout time so abandoned carts don't
 * burn redemptions.
 *
 * Body: { code: string }
 * Response: { code, type: 'percent'|'fixed', value, minOrderCents }
 *
 * Replaces the hardcoded WELCOME10/GREEN15 lookup in the store
 * dashboard so coupon codes are administered from /nutritionist (or
 * admin) instead of code.
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: { code?: string }
  try {
    body = (await req.json()) as { code?: string }
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const code = (body.code ?? '').trim().toUpperCase()
  if (!code) return badRequest('code is required.')

  const supabase = getServiceSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  const { data } = await supabase
    .from('coupons')
    .select(
      'code, type, value, min_order_cents, max_uses, times_used, valid_from, valid_until, applicable_tiers, sent_to_user_id, is_active',
    )
    .eq('code', code)
    .maybeSingle()

  type Row = {
    code: string
    type: 'percent' | 'fixed'
    value: number
    min_order_cents: number | null
    max_uses: number | null
    times_used: number | null
    valid_from: string | null
    valid_until: string | null
    applicable_tiers: string[] | null
    sent_to_user_id: string | null
    is_active: boolean | null
  }
  const row = (data as Row | null) ?? null
  if (!row || row.is_active === false) {
    return notFound('Invalid code.')
  }

  const now = Date.now()
  if (row.valid_from && new Date(row.valid_from).getTime() > now) {
    return notFound('This code is not active yet.')
  }
  if (row.valid_until && new Date(row.valid_until).getTime() < now) {
    return notFound('This code has expired.')
  }
  if (
    typeof row.max_uses === 'number' &&
    typeof row.times_used === 'number' &&
    row.times_used >= row.max_uses
  ) {
    return notFound('This code has been fully redeemed.')
  }
  if (row.sent_to_user_id && row.sent_to_user_id !== ctx.userId) {
    return notFound('Invalid code.')
  }
  const userTier = ctx.profile.tier ?? 'free'
  if (
    Array.isArray(row.applicable_tiers) &&
    row.applicable_tiers.length > 0 &&
    !row.applicable_tiers.includes(userTier)
  ) {
    return notFound('This code is not available on your plan.')
  }

  return json({
    code: row.code,
    type: row.type,
    value: row.value,
    minOrderCents: row.min_order_cents ?? 0,
  })
})
