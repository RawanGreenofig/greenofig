import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/admin/users/update
 *
 * Admin-only. Updates editable profile fields from the
 * /admin/users/[id] profile pane. Whitelist enforced server-side; any
 * field not in EDITABLE is silently dropped so a tampered client can't
 * change e.g. is_active or stripe_customer_id through this route.
 *
 * Body: {
 *   userId: string
 *   full_name?: string
 *   phone?: string | null
 *   role?: 'user' | 'nutritionist' | 'admin'
 *   tier?: 'free' | 'basic' | 'premium' | 'vip'
 *   preferred_locale?: 'en' | 'ar'
 * }
 *
 * Side effects:
 *   - Audit log row with old/new diff
 *   - Notification to the user when role or tier changes
 *
 * Errors:
 *   401 — caller not authed
 *   403 — caller not admin
 *   404 — user not found
 *   400 — invalid body / value out of allowed set
 */

const ROLES = ['user', 'nutritionist', 'admin'] as const
const TIERS = ['free', 'basic', 'premium', 'vip'] as const
const LOCALES = ['en', 'ar'] as const

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const userId = typeof body.userId === 'string' ? body.userId : ''
  if (!/^[0-9a-f-]{32,}$/i.test(userId)) {
    return badRequest('userId is required.')
  }

  // Build the whitelisted update payload from body.
  const update: Record<string, unknown> = {}

  if (typeof body.full_name === 'string') {
    update.full_name = body.full_name.trim() || null
  }
  if (body.phone === null || typeof body.phone === 'string') {
    update.phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  }
  if (typeof body.role === 'string') {
    if (!(ROLES as readonly string[]).includes(body.role)) {
      return badRequest('role must be one of user/nutritionist/admin.')
    }
    update.role = body.role
  }
  if (typeof body.tier === 'string') {
    if (!(TIERS as readonly string[]).includes(body.tier)) {
      return badRequest('tier must be one of free/basic/premium/vip.')
    }
    update.tier = body.tier
  }
  if (typeof body.preferred_locale === 'string') {
    if (!(LOCALES as readonly string[]).includes(body.preferred_locale)) {
      return badRequest('preferred_locale must be en or ar.')
    }
    update.preferred_locale = body.preferred_locale
  }

  if (Object.keys(update).length === 0) {
    return badRequest('No editable fields supplied.')
  }

  // Capture previous values for the audit diff.
  const { data: prevRow } = await service
    .from('profiles')
    .select('id, full_name, phone, role, tier, preferred_locale')
    .eq('id', userId)
    .maybeSingle()
  const prev = prevRow as {
    id: string
    full_name: string | null
    phone: string | null
    role: string
    tier: string
    preferred_locale: string
  } | null
  if (!prev) return notFound('User not found.')

  // Self-demotion guard: an admin can't downgrade their own role away
  // from admin (would lock them out of the very page they're on).
  if (
    userId === ctx.userId &&
    typeof update.role === 'string' &&
    update.role !== 'admin'
  ) {
    return forbidden('Cannot change your own role away from admin.')
  }

  const { error } = await service
    .from('profiles')
    .update(update as never)
    .eq('id', userId)
  if (error) {
    console.error('[admin/users/update] update failed:', error)
    return internalError()
  }

  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: 'user_updated',
    resource_type: 'user',
    resource_id: userId,
    old_value: prev,
    new_value: update,
  } as never)

  // Notify the user when their role or tier changed — those are the
  // changes they'd want to know about. Silent on name/phone/locale.
  const roleChanged = 'role' in update && update.role !== prev.role
  const tierChanged = 'tier' in update && update.tier !== prev.tier
  if (roleChanged || tierChanged) {
    await service.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: roleChanged ? 'Account role updated' : 'Subscription tier updated',
      body: roleChanged
        ? `Your account role is now ${String(update.role)}.`
        : `Your subscription tier is now ${String(update.tier)}.`,
      data: {},
      is_read: false,
    } as never)
  }

  return json({ ok: true })
})
