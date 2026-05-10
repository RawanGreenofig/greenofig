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
  isGeminiConfigured,
  streamChat,
  type ChatMessage,
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

const SYSTEM_PROMPT = `You are Greenofig's AI nutrition assistant. You help paying clients between coaching sessions.

Voice: Mediterranean-rooted, evidence-led, warm but never sycophantic. No shame, no diet-culture moralizing.

Hard rules:
- Never diagnose. If a question is medical, recommend speaking to a doctor or scheduling a session with the client's coach.
- Cite the principle, not a brand. ("Magnesium glycinate is generally well-tolerated for sleep onset" — not "Buy Brand X").
- Keep replies under 250 words. If the answer needs more, summarize and offer to expand.
- When the client is in distress, acknowledge first, advise second.
- If asked for a meal plan, decline and route them to the "Plan" tab where their coach builds custom plans.
- Never refer to yourself by a coach's name. You are the platform's AI assistant; the human coach is a separate person the client has access to.`

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

  // Build the chat transcript for Gemini (history + new user message)
  const transcript: ChatMessage[] = [
    ...history.map((m) => ({
      role: m.role,
      content: m.body,
    })),
    { role: 'user', content: message },
  ]

  let stream: AsyncIterable<{ text?: string }>
  try {
    stream = (await streamChat(
      transcript,
      SYSTEM_PROMPT,
    )) as AsyncIterable<{ text?: string }>
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(
      '[ai-chat] streamChat failed for model',
      GEMINI_TEXT_MODEL,
      'error:',
      msg,
    )
    // Detect Gemini-side rate limit / quota errors and surface a
    // distinct response so the client can show a useful message
    // (instead of the generic "I can't respond right now"). Gemini
    // returns HTTP 429 with status RESOURCE_EXHAUSTED for these.
    if (
      msg.includes('"code": 429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.toLowerCase().includes('quota')
    ) {
      // Try to parse Gemini's retryDelay if present (e.g. "33s").
      let retryAfterSec: number | null = null
      const retryMatch = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/)
      if (retryMatch?.[1]) {
        retryAfterSec = Math.ceil(Number(retryMatch[1]))
      }
      return json(
        {
          error: {
            code: 'provider_quota_exceeded',
            message:
              "AI is temporarily over its limit. Try again shortly.",
            retryAfterSec,
          },
        },
        429,
      )
    }
    return internalError()
  }

  // Stream the assistant's reply back to the caller, then persist on close.
  const encoder = new TextEncoder()
  let assistantBody = ''

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const piece = chunk.text ?? ''
          if (!piece) continue
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
