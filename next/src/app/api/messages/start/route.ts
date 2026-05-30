import { NextResponse } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { getServiceSupabase } from '@/lib/supabase/service'
import {
  forbidden,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { tierAtLeast } from '@/lib/tier'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/messages/start
 *
 * Returns the conversation id between the signed-in client and the
 * coach they should talk to, creating it on first call. Selection
 * priority (multi-coach safe):
 *   1. profile.assigned_coach_id when set (head coach has assigned
 *      this client to a specific employee coach)
 *   2. head coach (profiles.is_head_coach=true) as the default for
 *      unassigned clients
 *   3. oldest nutritionist as a last-resort fallback
 *
 * Server-side because the client RLS policy on `profiles` may block
 * reading other users' roles, and the conversation insert needs to
 * write `nutritionist_id` for someone other than the caller.
 *
 * Response: { conversationId, nutritionistId } | { error }
 *
 * The client uses `nutritionistId` as `recipient_id` on subsequent
 * message inserts — `messages.recipient_id` is NOT NULL.
 */
export const POST = withAuth(async (_req, ctx: AuthedContext) => {
  const supabase = getServiceSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  // Client→coach messaging is a Premium+ feature per the pricing page.
  // Page-level FeatureGate already hides the thread for free/basic, but
  // any caller with a session could hit this route directly — refuse
  // here too. Nutritionists and admins always get through so staff can
  // initiate threads on behalf of clients.
  if (
    ctx.profile.role === 'user' &&
    !tierAtLeast(ctx.profile.tier, 'premium') &&
    !ctx.profile.is_clinic_client
  ) {
    return forbidden('Messaging your coach is included with the Premium plan.')
  }

  // Look for an existing conversation owned by this client first.
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, nutritionist_id')
    .eq('user_id', ctx.userId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const existingRow = existing as
    | { id: string; nutritionist_id: string }
    | null
  if (existingRow?.id) {
    // Conversation exists — make sure it has at least one message.
    // Premium users used to see a hardcoded SEED of 3 fake messages
    // until they sent their own; now we seed exactly one real
    // welcome row from the coach the first time we touch a thread
    // with zero messages. Idempotent: subsequent calls see the
    // welcome already there and skip.
    await ensureWelcomeMessage(
      supabase,
      existingRow.id,
      existingRow.nutritionist_id,
      ctx.userId,
    )
    return json({
      conversationId: existingRow.id,
      nutritionistId: existingRow.nutritionist_id,
    })
  }

  // No conversation yet. Pick the right coach (assigned → head → any).
  const { data: clientProfile } = await supabase
    .from('profiles')
    .select('assigned_coach_id')
    .eq('id', ctx.userId)
    .maybeSingle()
  let nutriId =
    (clientProfile as { assigned_coach_id?: string | null } | null)
      ?.assigned_coach_id ?? null

  if (!nutriId) {
    const { data: head } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'nutritionist')
      .eq('is_head_coach', true)
      .limit(1)
      .maybeSingle()
    nutriId = (head as { id?: string } | null)?.id ?? null
  }
  if (!nutriId) {
    const { data: anyNutri } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'nutritionist')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    nutriId = (anyNutri as { id?: string } | null)?.id ?? null
  }
  if (!nutriId) {
    return NextResponse.json(
      { error: 'No nutritionist account configured' },
      { status: 503 },
    )
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({
      user_id: ctx.userId,
      nutritionist_id: nutriId,
    } as never)
    .select('id')
    .maybeSingle()
  if (error || !created) {
    return internalError()
  }
  const conversationId = (created as { id: string }).id
  await ensureWelcomeMessage(supabase, conversationId, nutriId, ctx.userId)
  return json({
    conversationId,
    nutritionistId: nutriId,
  })
})

/**
 * Insert a single welcome message from the coach into a conversation
 * that has zero messages. Idempotent — a check-then-insert race is
 * harmless because the worst case is two identical welcome rows, and
 * with realistic concurrency (one client mounting the messages page)
 * the COUNT check is reliable enough.
 *
 * The welcome copy is intentionally plain and personal. It is NOT
 * pulled from platform_settings yet — keeping it inline avoids a fan-out
 * to settings for first-mount latency and means we don't need a
 * companion admin editor. If/when an admin needs to customize, lift
 * this string into `site_messages_welcome`.
 */
async function ensureWelcomeMessage(
  supabase: ReturnType<typeof getServiceSupabase>,
  conversationId: string,
  nutritionistId: string,
  recipientId: string,
): Promise<void> {
  if (!supabase) return
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
  if ((count ?? 0) > 0) return

  const welcome =
    "Welcome to your private line with the Greenofig coaching team. " +
    "Tell me what you'd like to focus on first — meals, energy, sleep, anything " +
    "that's been on your mind — and I'll reply personally."
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: nutritionistId,
    recipient_id: recipientId,
    content: welcome,
  } as never)
}
