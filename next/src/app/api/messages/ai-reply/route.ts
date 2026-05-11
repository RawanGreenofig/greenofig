import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, internalError, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { generateAiReply, isAiCoachConfigured, looksUrgent } from '@/lib/ai-coach'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/messages/ai-reply
 *
 * Body: { conversationId: string }
 *
 * Fires after a customer sends a message to their coach. Generates
 * a short AI reply with Gemini and posts it back into the same
 * conversation flagged is_ai=true. Also writes a notification for
 * the head coach so Nutritionist Coach Rawan can review what the AI said.
 *
 * Safeguards:
 *   - Caller must be the conversation's `user_id` (the customer).
 *   - Only fires if the LAST message in the thread is from the
 *     customer AND is not already followed by an AI reply.
 *   - Silent no-op when GEMINI_API_KEY isn't set, so the messaging
 *     flow degrades gracefully.
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: { conversationId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  const conversationId = body.conversationId?.trim()
  if (!conversationId) return badRequest('conversationId is required.')

  if (!isAiCoachConfigured()) {
    return json({ ok: true, skipped: 'ai_not_configured' })
  }

  const supabase = getServiceSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  // Verify the caller owns this conversation.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, user_id, nutritionist_id')
    .eq('id', conversationId)
    .maybeSingle()
  const convRow = conv as
    | { id: string; user_id: string; nutritionist_id: string }
    | null
  if (!convRow || convRow.user_id !== ctx.userId) {
    return json({ ok: true, skipped: 'not_owner' })
  }

  // Load the last ~10 messages so we can build context AND check
  // that the last one is the customer's (so we don't double-reply).
  const { data: recent } = await supabase
    .from('messages')
    .select('id, sender_id, content, is_ai, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10)
  type MsgRow = {
    id: string
    sender_id: string
    content: string
    is_ai: boolean
    created_at: string
  }
  const history = ((recent as MsgRow[] | null) ?? []).slice().reverse()
  if (history.length === 0) {
    return json({ ok: true, skipped: 'no_messages' })
  }
  const last = history[history.length - 1]
  if (last.sender_id !== ctx.userId) {
    return json({ ok: true, skipped: 'last_not_customer' })
  }
  // Don't pile up multiple AI replies if the customer sent two in
  // a row — the previous AI reply has already addressed the thread.
  const lastNonCustomer = [...history]
    .reverse()
    .find((m) => m.sender_id !== ctx.userId)
  if (lastNonCustomer?.is_ai) {
    const minutesSince =
      (Date.now() - new Date(lastNonCustomer.created_at).getTime()) / 60_000
    if (minutesSince < 0.5) {
      return json({ ok: true, skipped: 'recent_ai_reply' })
    }
  }

  // Load the customer profile bits worth surfacing to the model.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, tier, goal')
    .eq('id', ctx.userId)
    .maybeSingle()
  const profileRow = profile as
    | { full_name: string | null; tier: string | null; goal: string | null }
    | null

  // Build the input and call Gemini.
  let reply: string
  let deferToCoach = false
  try {
    const result = await generateAiReply({
      customerMessage: last.content,
      history: history.slice(0, -1).map((m) => ({
        sender:
          m.sender_id === convRow.user_id
            ? 'customer'
            : m.is_ai
            ? 'ai'
            : 'coach',
        content: m.content,
      })),
      customer: {
        fullName: profileRow?.full_name ?? null,
        tier: profileRow?.tier ?? null,
        goal: profileRow?.goal ?? null,
      },
    })
    reply = result.text
    deferToCoach = result.deferToCoach
  } catch (err) {
    console.error('[ai-reply] Gemini failed:', err)
    return json({ ok: true, skipped: 'ai_failed' })
  }

  // Post the AI reply as a message FROM the coach's account but
  // marked is_ai=true so the UI can distinguish it. Using the
  // coach's sender_id keeps the RLS / recipient logic simple.
  const { error: insertError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: convRow.nutritionist_id,
    recipient_id: convRow.user_id,
    content: reply,
    is_ai: true,
  } as never)
  if (insertError) {
    console.error('[ai-reply] insert failed:', insertError)
    return internalError()
  }

  // Notify the head coach so Nutritionist Coach Rawan can review and follow up.
  // Looks up the head coach explicitly rather than assuming it's the
  // assigned nutritionist — for employee coaches, Rawan still needs
  // to know the AI replied.
  const { data: headCoach } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_head_coach', true)
    .limit(1)
    .maybeSingle()
  const headCoachId = (headCoach as { id?: string } | null)?.id
  if (headCoachId) {
    const urgent = deferToCoach || looksUrgent(last.content)
    await supabase
      .from('notifications')
      .insert({
        user_id: headCoachId,
        type: urgent ? 'ai_reply_urgent' : 'ai_reply',
        title: urgent
          ? 'AI replied — urgent follow-up needed'
          : 'AI replied to a client',
        body: `${profileRow?.full_name ?? 'A client'}: "${last.content.slice(0, 120)}${last.content.length > 120 ? '…' : ''}"`,
        data: { conversation_id: conversationId },
      } as never)
  }

  return json({ ok: true })
})
