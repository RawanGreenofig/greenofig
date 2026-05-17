import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { internalError, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { ipFromRequest, logAudit } from '@/lib/api/audit'

/**
 * POST /api/account/delete
 *
 * Permanently deletes the calling user's account. Steps:
 *   1. Best-effort: cancel any active Stripe subscription tied to this
 *      user so we stop billing.
 *   2. Delete the profile row. Schema cascades wipe most owned rows
 *      (nutrition_logs, progress_entries, posts, conversations, etc).
 *   3. Delete the auth.users row via the service-role admin API so the
 *      account cannot be signed back into.
 *
 * Audited. The audit row is written BEFORE step 2 so we keep the trail
 * even after the actor's profile is gone.
 *
 * Requires a logged-in session — there is no admin-on-behalf-of flow
 * here; admins delete users through their own tooling.
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Audit FIRST — once we delete the profile, ctx.profile is gone.
  await logAudit({
    action: 'account.delete',
    actorId: ctx.userId,
    actorRole: ctx.profile.role,
    resourceType: 'profile',
    resourceId: ctx.userId,
    oldValue: { email: ctx.email, tier: ctx.profile.tier },
    newValue: null,
    ip: ipFromRequest(req),
  })

  // Best-effort Stripe cancellation. Don't block the deletion if
  // Stripe is unreachable or there's no active subscription — the
  // user explicitly chose to leave.
  try {
    const { data: sub } = await service
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', ctx.userId)
      .eq('status', 'active')
      .maybeSingle()
    const stripeSubId = (sub as { stripe_subscription_id?: string } | null)
      ?.stripe_subscription_id
    if (stripeSubId) {
      const { getStripe } = await import('@/lib/stripe')
      const stripe = getStripe()
      if (stripe) {
        await stripe.subscriptions.cancel(stripeSubId).catch(() => undefined)
      }
    }
  } catch {
    /* Stripe is best-effort — proceed with the local deletion */
  }

  // Profile delete cascades to the user's owned rows in tables that
  // ON DELETE CASCADE the profile_id FK. Tables that don't cascade
  // (notifications, audit_log on the actor side) become orphan rows
  // — that's intentional, audit must survive deletion.
  const { error: profileErr } = await service
    .from('profiles')
    .delete()
    .eq('id', ctx.userId)
  if (profileErr) return internalError()

  // Finally drop the auth user. After this the session cookies are
  // useless and the client must redirect to a public route.
  const { error: authErr } = await service.auth.admin.deleteUser(ctx.userId)
  if (authErr) {
    // Profile already gone — flag in audit but return ok so the UI
    // signs out the user instead of bouncing them.
    await logAudit({
      action: 'account.delete.auth_residual',
      actorId: ctx.userId,
      actorRole: 'user',
      resourceType: 'auth.users',
      resourceId: ctx.userId,
      newValue: { error: authErr.message },
      ip: ipFromRequest(req),
    })
  }

  return json({ ok: true })
})
