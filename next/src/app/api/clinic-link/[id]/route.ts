import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/clinic-link/[id]
 *
 * Connects the SIGNED-IN account to a walk-in clinic record (`[id]` =
 * clinic_clients id), behind the coach's invite link. Sets
 * clinic_clients.user_id and points the account's assigned_coach_id at
 * the owning coach so in-app messaging routes to her. Notifies the coach.
 *
 * Auth: any signed-in user (the invited walk-in). Idempotent — calling
 * again when already linked to this same account just succeeds.
 */
export const POST = withAuth<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data } = await service
      .from('clinic_clients')
      .select('id, coach_id, user_id, full_name')
      .eq('id', params.id)
      .maybeSingle()
    const cc = data as
      | { id: string; coach_id: string; user_id: string | null; full_name: string }
      | null
    if (!cc) return notFound('This invite link is not valid.')

    // Already linked to a different account → don't let someone hijack it.
    if (cc.user_id && cc.user_id !== ctx.userId) {
      return forbidden('This client is already connected to another account.')
    }

    const alreadyLinked = cc.user_id === ctx.userId

    if (!alreadyLinked) {
      const { error: linkErr } = await service
        .from('clinic_clients')
        .update({ user_id: ctx.userId } as never)
        .eq('id', cc.id)
      if (linkErr) return badRequest(linkErr.message)
    }

    // Route this account's coach messaging to the owning coach.
    await service
      .from('profiles')
      .update({ assigned_coach_id: cc.coach_id } as never)
      .eq('id', ctx.userId)

    if (!alreadyLinked) {
      const secret = process.env.OPENCLAW_WEBHOOK_SECRET
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
      const who = ctx.profile.full_name || ctx.email || cc.full_name
      if (secret) {
        try {
          await fetch(`${appUrl}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-secret': secret },
            body: JSON.stringify({
              userIds: [cc.coach_id],
              title: 'Client connected their account',
              titleAr: 'ربط العميل حسابه',
              body: `${cc.full_name} (${who}) connected — you can now message them in the app.`,
              bodyAr: `${cc.full_name} ربط حسابه — يمكنك الآن مراسلته في التطبيق.`,
              type: 'message',
              url: `/nutritionist/clinic-clients/${cc.id}`,
            }),
          })
        } catch {
          /* best effort */
        }
      }
    }

    return json({ ok: true, full_name: cc.full_name, linked: true })
  },
)
