import { NextResponse } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { getServiceSupabase } from '@/lib/supabase/service'
import { internalError, json, serviceUnavailable } from '@/lib/api/response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/messages/start
 *
 * Returns the conversation id between the signed-in client and Dr.
 * Rawan, creating it on first call. Server-side because the
 * client RLS policy on `profiles` may block reading other users'
 * roles, and the conversation insert needs to write
 * `nutritionist_id` for someone other than the caller.
 *
 * Response: { conversationId, nutritionistId } | { error }
 *
 * The client uses `nutritionistId` as `recipient_id` on subsequent
 * message inserts — `messages.recipient_id` is NOT NULL.
 */
export const POST = withAuth(async (_req, ctx: AuthedContext) => {
  const supabase = getServiceSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

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
    return json({
      conversationId: existingRow.id,
      nutritionistId: existingRow.nutritionist_id,
    })
  }

  // No conversation yet. Find the nutritionist.
  const { data: nutri } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'nutritionist')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  const nutriId = (nutri as { id?: string } | null)?.id
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
  return json({
    conversationId: (created as { id: string }).id,
    nutritionistId: nutriId,
  })
})
