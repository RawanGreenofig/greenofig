import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  forbidden,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'
import {
  GEMINI_TEXT_MODEL,
  getGemini,
  isGeminiConfigured,
} from '@/lib/gemini'
import { tierAtLeast } from '@/lib/tier'
import { checkAndIncrementUsage } from '@/lib/ai-usage'

/**
 * POST /api/ai-chat
 *
 * Premium+ AI nutrition chatbot. Streams a text response and persists the
 * full conversation to ai_conversations on completion.
 *
 * Body: { conversationId?: string, message: string }
 * Response: text/plain streamed body. Header `x-conversation-id` returns
 * the (possibly newly-created) conversation row id.
 */

interface AiMessage {
  role: 'user' | 'assistant'
  body: string
  ts: string
}

const SYSTEM_PROMPT = `You are Dr. Rawan Othman's AI nutrition assistant. You help paying clients between sessions.

Voice: Mediterranean-rooted, evidence-led, warm but never sycophantic. No shame, no diet-culture moralizing.

Hard rules:
- Never diagnose. If a question is medical, recommend speaking to a doctor or scheduling a session with Dr. Rawan.
- Cite the principle, not a brand. ("Magnesium glycinate is generally well-tolerated for sleep onset" — not "Buy Brand X").
- Keep replies under 250 words. If the answer needs more, summarize and offer to expand.
- When the client is in distress, acknowledge first, advise second.
- If asked for a meal plan, decline and route them to "Plan" tab where Dr. Rawan builds custom plans.`

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (!isGeminiConfigured()) {
    console.error('[ai-chat] GEMINI_API_KEY not configured')
    return serviceUnavailable('Gemini')
  }

  // Tier gate — premium and vip only
  if (!tierAtLeast(ctx.profile.tier, 'premium')) {
    console.error('[ai-chat] Tier gate denied for', ctx.userId, 'tier:', ctx.profile.tier)
    return forbidden('AI chat requires Premium or higher.')
  }

  // Daily quota — admin-configurable per tier via /admin/ai-limits
  const usage = await checkAndIncrementUsage(
    ctx.userId,
    ctx.profile.tier as 'free' | 'basic' | 'premium' | 'vip',
    'ai_chat',
  )
  if (!usage.allowed) {
    return json(
      {
        error: {
          code: 'quota_exceeded',
          message: 'Daily AI chat limit reached.',
        },
        used: usage.used,
        limit: usage.limit,
        remaining: 0,
      },
      429,
    )
  }

  let body: { conversationId?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!body.message || typeof body.message !== 'string') {
    return badRequest('message is required.')
  }
  const message = body.message.trim().slice(0, 4000)
  if (!message) return badRequest('message is empty.')

  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  // Load or create conversation
  let conversationId = body.conversationId
  let history: AiMessage[] = []
  if (conversationId) {
    const { data } = await supabase
      .from('ai_conversations')
      .select('messages, user_id')
      .eq('id', conversationId)
      .maybeSingle()
    const row = data as { messages?: AiMessage[]; user_id?: string } | null
    if (!row || row.user_id !== ctx.userId) {
      return forbidden('Conversation not found.')
    }
    history = row.messages ?? []
  }

  // Build the chat history for Gemini
  const client = getGemini()
  if (!client) return serviceUnavailable('Gemini')

  const model = client.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    systemInstruction: SYSTEM_PROMPT,
  })

  // Use generateContentStream directly with the full conversation
  // history + the new user message. The chat.sendMessageStream() path
  // on the @google/generative-ai SDK has been flaky since the SDK
  // was archived in Dec 2025; bypassing startChat() and sending the
  // contents array straight to the model is the supported pattern.
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.body }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ]

  let stream: AsyncGenerator<{ text: () => string }> | null = null
  try {
    const result = await model.generateContentStream({ contents })
    stream = result.stream as AsyncGenerator<{ text: () => string }>
  } catch (error) {
    console.error(
      '[ai-chat] generateContentStream failed for model',
      GEMINI_TEXT_MODEL,
      'error:',
      error instanceof Error ? error.message : error,
    )
    return internalError()
  }

  // Stream the assistant's reply back to the caller, then persist on close.
  const encoder = new TextEncoder()
  let assistantBody = ''

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream as AsyncGenerator<{ text: () => string }>) {
          const piece = chunk.text()
          assistantBody += piece
          controller.enqueue(encoder.encode(piece))
        }
      } catch (streamError) {
        console.error('[ai-chat] stream consume failed:', streamError)
      }

      // Persist on completion
      const nextHistory: AiMessage[] = [
        ...history,
        { role: 'user',      body: message,        ts: new Date().toISOString() },
        { role: 'assistant', body: assistantBody,  ts: new Date().toISOString() },
      ]

      try {
        if (conversationId) {
          const { error } = await supabase
            .from('ai_conversations')
            .update({ messages: nextHistory } as never)
            .eq('id', conversationId)
          if (error)
            console.error('[ai-chat] update ai_conversations failed:', error)
        } else {
          const { data: inserted, error } = await supabase
            .from('ai_conversations')
            .insert({
              user_id: ctx.userId,
              kind: 'chat',
              messages: nextHistory,
            } as never)
            .select('id')
            .maybeSingle()
          if (error)
            console.error('[ai-chat] insert ai_conversations failed:', error)
          conversationId = (inserted as { id?: string } | null)?.id
        }
      } catch (persistError) {
        console.error('[ai-chat] persist threw:', persistError)
      }

      controller.close()
    },
  })

  return new Response(responseStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'x-conversation-id': conversationId ?? '',
    },
  })
})

// Avoid type-narrowing the response (json() returns NextResponse, the
// stream above returns plain Response). Keep the union loose.
void json
