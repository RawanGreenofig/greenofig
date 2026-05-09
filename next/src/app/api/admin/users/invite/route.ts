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

/**
 * POST /api/admin/users/invite
 *
 * Admin-only. Sends a Supabase Auth invite email to the given address.
 * The invitee receives a magic-link to claim the account; on first
 * sign-in they land in /onboarding. The desired role + tier are
 * passed in the invite metadata so the auth callback can stamp the
 * correct profile row.
 *
 * Body: { email: string, role?: 'user'|'nutritionist'|'admin', tier?: 'free'|'basic'|'premium'|'vip' }
 *
 * Errors:
 *   401 — caller not authed
 *   403 — caller not admin
 *   422 — invalid email
 *   503 — supabase env missing
 *   500 — invite API failed
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (ctx.profile.role !== 'admin') return forbidden('Admin only.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase')

  let body: { email?: string; role?: string; tier?: string }
  try {
    body = (await req.json()) as { email?: string; role?: string; tier?: string }
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('Valid email required.')
  }
  const role = body.role && ['user', 'nutritionist', 'admin'].includes(body.role) ? body.role : 'user'
  const tier =
    body.tier && ['free', 'basic', 'premium', 'vip'].includes(body.tier) ? body.tier : 'free'

  try {
    const { data, error } = await service.auth.admin.inviteUserByEmail(email, {
      data: { role, tier, invitedBy: ctx.userId },
    })
    if (error || !data.user) {
      console.error('[admin/users/invite] invite failed:', error)
      return json(
        {
          error: {
            code: 'invite_failed',
            message: error?.message ?? 'Could not send invite.',
          },
        },
        500,
      )
    }

    // Pre-create the profile row at the requested role + tier so when
    // the invitee accepts, they land with the correct chrome.
    await service
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          role,
          tier,
          full_name: null,
          is_active: true,
        } as never,
        { onConflict: 'id' },
      )

    await service.from('audit_log').insert({
      actor_id: ctx.userId,
      actor_role: 'admin',
      action: 'user_invited',
      resource_type: 'user',
      resource_id: data.user.id,
      new_value: { email, role, tier },
    } as never)

    return json({ ok: true, userId: data.user.id })
  } catch (err) {
    console.error('[admin/users/invite] unexpected:', err)
    return internalError()
  }
})
