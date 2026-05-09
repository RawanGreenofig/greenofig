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
 * POST /api/admin/users/suspend
 *
 * Admin-only. Toggles a user's profiles.is_active. Suspending blocks
 * sign-in (the auth gate reads is_active) and visually flags the row
 * in /admin/users. Restoring sets is_active back to true.
 *
 * Body: { userId: string, suspend: boolean }
 *
 * Errors:
 *   401 — caller not authed
 *   403 — caller not admin, or attempting to suspend their own account
 *   404 — user not found
 *   503 — supabase env missing
 *   500 — db error
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: { userId?: string; suspend?: boolean }
  try {
    body = (await req.json()) as { userId?: string; suspend?: boolean }
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const userId = body.userId
  const suspend = body.suspend
  if (!userId || !/^[0-9a-f-]{32,}$/i.test(userId)) {
    return badRequest('userId is required.')
  }
  if (typeof suspend !== 'boolean') {
    return badRequest('suspend (boolean) is required.')
  }
  if (userId === ctx.userId) {
    return forbidden('Cannot suspend your own admin account.')
  }

  type ProfileRow = { id: string; full_name: string | null; role: string }
  const { data: profileRow } = await service
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle()
  const profile = profileRow as ProfileRow | null
  if (!profile) return notFound('User not found.')

  const { error } = await service
    .from('profiles')
    .update({ is_active: !suspend } as never)
    .eq('id', userId)
  if (error) {
    console.error('[admin/users/suspend] update failed:', error)
    return internalError()
  }

  await service.from('audit_log').insert({
    actor_id: ctx.userId,
    actor_role: 'admin',
    action: suspend ? 'user_suspended' : 'user_unsuspended',
    resource_type: 'user',
    resource_id: userId,
    new_value: { is_active: !suspend },
  } as never)

  // Notify the affected user (only when suspending — silently restore).
  if (suspend) {
    await service.from('notifications').insert({
      user_id: userId,
      type: 'system',
      title: 'Account suspended',
      body: 'Your account has been suspended. Contact support if you believe this is a mistake.',
      data: {},
      is_read: false,
    } as never)
  }

  return json({ ok: true, isActive: !suspend })
})
