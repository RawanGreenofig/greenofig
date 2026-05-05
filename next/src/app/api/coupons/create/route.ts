import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST /api/coupons/create
 *
 * Nutritionist or admin creates a discount code and sends it to either
 * a single client or to all members of a tier. Notification fan-out is
 * handled in the same call. Audited.
 *
 * Body:
 * ```json
 * {
 *   "code": string,
 *   "type": "percent" | "fixed",
 *   "value": number,
 *   "minOrderCents"?: number,
 *   "maxUses"?: number,
 *   "validUntil": string,            // ISO date
 *   "sentToUserId"?: string,
 *   "sentToTier"?: "free" | "basic" | "premium" | "vip",
 *   "personalNote"?: string
 * }
 * ```
 *
 * Response: `{ success: true, coupon, sent: number }`
 */

interface Body {
  code?: string
  type?: 'percent' | 'fixed'
  value?: number
  minOrderCents?: number
  maxUses?: number
  validUntil?: string
  sentToUserId?: string | null
  sentToTier?: 'free' | 'basic' | 'premium' | 'vip' | null
  personalNote?: string | null
}

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const code = (body.code ?? '').trim().toUpperCase()
    const type = body.type
    const value = Number(body.value ?? 0)
    if (!code) return badRequest('code is required.')
    if (type !== 'percent' && type !== 'fixed') {
      return badRequest('type must be "percent" or "fixed".')
    }
    if (!Number.isFinite(value) || value <= 0) {
      return badRequest('value must be a positive number.')
    }
    if (type === 'percent' && value > 100) {
      return badRequest('Percentage value cannot exceed 100.')
    }
    if (!body.validUntil) return badRequest('validUntil is required.')
    if (body.sentToUserId && body.sentToTier) {
      return badRequest('Choose either a specific client OR a tier, not both.')
    }

    const supabase = getServerSupabase()
    if (!supabase) return serviceUnavailable('Supabase')

    // Insert the coupon row
    const applicableTiers = body.sentToTier
      ? [body.sentToTier]
      : ['free', 'basic', 'premium', 'vip']

    const { data: insertedRows, error } = await supabase
      .from('coupons')
      .insert(
        {
          code,
          type,
          value,
          min_order_cents: body.minOrderCents ?? 0,
          max_uses: body.maxUses ?? null,
          valid_until: body.validUntil,
          is_active: true,
          created_by: ctx.userId,
          sent_to_user_id: body.sentToUserId ?? null,
          sent_to_tier: body.sentToTier ?? null,
          personal_note: body.personalNote ?? null,
          applicable_tiers: applicableTiers,
        } as never,
      )
      .select('id, code')
    if (error) {
      // Most likely cause: duplicate code (unique constraint)
      return badRequest(error.message)
    }
    const coupon = (insertedRows as { id: string; code: string }[] | null)?.[0]
    if (!coupon) return internalError()

    // Build notification copy
    const discountText =
      type === 'percent' ? `${value}% off` : `SAR ${value} off`
    const discountTextAr =
      type === 'percent' ? `خصم ${value}%` : `خصم ${value} ريال`
    const noteSuffix = body.personalNote ? ` ${body.personalNote.trim()}` : ''
    const notifBody = `Use code ${code} for ${discountText} on your next order.${noteSuffix}`
    const notifBodyAr = `استخدم الكود ${code} للحصول على ${discountTextAr} على طلبك القادم.${noteSuffix}`

    let sent = 0
    if (body.sentToUserId) {
      const { error: notifErr } = await supabase.from('notifications').insert(
        {
          user_id: body.sentToUserId,
          type: 'system',
          title: '🎁 A gift from Dr. Rawan',
          title_ar: '🎁 هدية من د. روان',
          body: notifBody,
          body_ar: notifBodyAr,
          data: { couponCode: code, discountType: type, value },
        } as never,
      )
      if (!notifErr) sent = 1
    } else if (body.sentToTier) {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('tier', body.sentToTier)
        .eq('role', 'user')
      const list = (users as { id: string }[] | null) ?? []
      if (list.length > 0) {
        const rows = list.map((u) => ({
          user_id: u.id,
          type: 'system' as const,
          title: '🎁 A gift from Dr. Rawan',
          title_ar: '🎁 هدية من د. روان',
          body: notifBody,
          body_ar: notifBodyAr,
          data: { couponCode: code, discountType: type, value },
        }))
        const { error: bulkErr } = await supabase
          .from('notifications')
          .insert(rows as never)
        if (!bulkErr) sent = list.length
      }
    }

    await logAudit({
      action: 'coupon.create_and_send',
      actorId: ctx.userId,
      actorRole: ctx.profile.role,
      resourceType: 'coupon',
      resourceId: coupon.id,
      newValue: {
        code,
        discount: discountText,
        target: body.sentToUserId
          ? `user:${body.sentToUserId}`
          : body.sentToTier
            ? `tier:${body.sentToTier}`
            : 'unspecified',
        sent,
      },
      ip: ipFromRequest(req),
    })

    return json({
      success: true,
      coupon: { id: coupon.id, code: coupon.code },
      sent,
      message: `Discount code ${code} created${sent ? ` and sent to ${sent}` : ''}`,
    })
  },
)
