import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { rateLimit } from '@/lib/server/rateLimit'
import { ipFromRequest } from '@/lib/api/audit'

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
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Throttle claim attempts per account + per IP (token guessing / abuse).
    const ip = ipFromRequest(req) ?? 'unknown'
    if (!(await rateLimit(`clinic-link:${ctx.userId}`, { limit: 20, windowSec: 600 })) ||
        !(await rateLimit(`clinic-link-ip:${ip}`, { limit: 40, windowSec: 600 }))) {
      return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429)
    }

    // This invite is for CLIENTS. A coach/admin account must not be turned
    // into a walk-in client — it would corrupt their profile and the
    // role-based routing would bounce them off /dashboard. Tell them to use
    // the client's own account (or a separate browser).
    if (ctx.profile.role !== 'user') {
      return forbidden(
        "This invite is for clients. You're signed in as staff — open it in a private window and sign in with the client's own account.",
      )
    }

    // The invite token (from the URL the coach shared). Read from body or
    // query so it survives the OAuth round-trip.
    let token: string | null = null
    try {
      token = ((await req.json()) as { token?: string })?.token ?? null
    } catch {
      /* no body */
    }
    if (!token) token = req.nextUrl.searchParams.get('t')

    const { data } = await service
      .from('clinic_clients')
      .select('id, coach_id, user_id, full_name, invite_token_hash, invite_token_expires_at')
      .eq('id', params.id)
      .maybeSingle()
    const cc = data as
      | {
          id: string
          coach_id: string
          user_id: string | null
          full_name: string
          invite_token_hash: string | null
          invite_token_expires_at: string | null
        }
      | null
    if (!cc) return notFound('This invite link is not valid.')

    // Already linked to a different account → don't let someone hijack it.
    if (cc.user_id && cc.user_id !== ctx.userId) {
      return forbidden('This client is already connected to another account.')
    }

    const alreadyLinked = cc.user_id === ctx.userId

    // Token gate — required to CLAIM an unlinked client (re-confirming an
    // already-linked one to oneself stays allowed without a token).
    if (!alreadyLinked) {
      const hash = token ? crypto.createHash('sha256').update(token).digest('hex') : null
      const expired = cc.invite_token_expires_at ? new Date(cc.invite_token_expires_at).getTime() < Date.now() : true
      if (!cc.invite_token_hash || !hash || hash !== cc.invite_token_hash || expired) {
        return forbidden('This invite link is invalid or has expired. Ask your coach to send a new one.')
      }
    }

    if (!alreadyLinked) {
      const { error: linkErr } = await service
        .from('clinic_clients')
        // Clear the token — single use.
        .update({ user_id: ctx.userId, invite_token_hash: null, invite_token_expires_at: null } as never)
        .eq('id', cc.id)
      if (linkErr) return badRequest(linkErr.message)
    }

    // Route this account's coach messaging to the owning coach, and mark
    // it a clinic client so it can message despite being free-tier.
    await service
      .from('profiles')
      .update({ assigned_coach_id: cc.coach_id, is_clinic_client: true } as never)
      .eq('id', ctx.userId)

    // Open the chat thread with the coach right away (idempotent) so both
    // sides see it the moment the client connects.
    const { data: convo } = await service
      .from('conversations')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('nutritionist_id', cc.coach_id)
      .maybeSingle()
    let conversationId = (convo as { id?: string } | null)?.id ?? null
    if (!conversationId) {
      const { data: createdConvo } = await service
        .from('conversations')
        .insert({ user_id: ctx.userId, nutritionist_id: cc.coach_id } as never)
        .select('id')
        .maybeSingle()
      conversationId = (createdConvo as { id?: string } | null)?.id ?? null
    }
    if (conversationId) {
      const { count } = await service
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
      if ((count ?? 0) === 0) {
        await service.from('messages').insert({
          conversation_id: conversationId,
          sender_id: cc.coach_id,
          recipient_id: ctx.userId,
          content:
            'Welcome! This is your private line with your coach. Message me here anytime about your plan, progress, or anything else.',
        } as never)
      }
    }

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
