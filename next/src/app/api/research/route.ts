import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'
import {
  GEMINI_RESEARCH_MODEL,
  getGemini,
  isGeminiConfigured,
  safeJson,
} from '@/lib/gemini'

/**
 * POST /api/research
 *
 * Nutritionist-only research desk. Pulls relevant excerpts from
 * `research_documents` (currently top-k by recent uploads — vector search
 * is wired in Cluster I) and asks Gemini to answer the question with
 * citations from those documents.
 *
 * Body: { conversationId?: string, question: string }
 *
 * Response 200:
 * ```json
 * {
 *   "answer": string,
 *   "sources": [{ "docId", "name", "passage" }],
 *   "conversationId": string
 * }
 * ```
 */

interface ResearchSource {
  docId: string
  name: string
  passage: string
}

interface ResearchResponse {
  answer: string
  sources: ResearchSource[]
  conversationId: string
}

interface ResearchTurn {
  role: 'user' | 'assistant'
  body: string
  sources?: { docId: string; passage: string }[]
  ts: string
}

const SYSTEM_PROMPT = `You are Dr. Rawan Othman's clinical research assistant.

Style: peer-reviewed precision. Lead with what the evidence shows, then practical clinical takeaway. Cite specific dosages, study designs, and outcomes.

When the supplied context contains relevant passages, ALWAYS cite them inline as bracketed numbers like [1], [2] matching the order they appear in the "context" array. If the context is empty or unrelated, answer from general clinical literature and mark the answer as having no document sources.

Return ONLY valid JSON in this exact shape:
{
  "answer": string,        // the research answer with [n] citations
  "sources": [             // ONLY documents you actually cited; preserve order
    { "docId": string, "passage": string }
  ]
}`

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    if (!isGeminiConfigured()) return serviceUnavailable('Gemini')

    let body: { conversationId?: string; question?: string }
    try {
      body = await req.json()
    } catch {
      return badRequest('Invalid JSON body.')
    }
    if (!body.question || typeof body.question !== 'string') {
      return badRequest('question is required.')
    }
    const question = body.question.trim().slice(0, 4000)
    if (!question) return badRequest('question is empty.')

    const supabase = getServerSupabase()
    if (!supabase) return serviceUnavailable('Supabase')

    // Pull recent docs as the document corpus. Cluster I switches this to
    // pgvector similarity search via an RPC.
    const { data: docs } = await supabase
      .from('research_documents')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(8)

    const corpus: { id: string; name: string }[] =
      (docs as { id: string; name: string }[] | null) ?? []

    // Build context block for Gemini
    const contextBlock = corpus
      .map((d, i) => `[${i + 1}] ${d.name}\nDocument id: ${d.id}`)
      .join('\n\n')

    const userPrompt = corpus.length
      ? `Question:\n${question}\n\nAvailable documents (cite [n] inline):\n${contextBlock}`
      : `Question:\n${question}\n\nNo documents in the library — answer from general clinical literature and return an empty "sources" array.`

    const client = getGemini()
    if (!client) return serviceUnavailable('Gemini')

    const model = client.getGenerativeModel({
      model: GEMINI_RESEARCH_MODEL,
      systemInstruction: SYSTEM_PROMPT,
    })

    let parsed: { answer: string; sources: { docId: string; passage: string }[] } | null
    try {
      const result = await model.generateContent(userPrompt)
      parsed = safeJson(result.response.text())
    } catch {
      return internalError()
    }

    if (!parsed || typeof parsed.answer !== 'string') {
      return json(
        { error: { code: 'parse_failed', message: 'Could not parse the research response.' } },
        502,
      )
    }

    // Hydrate source names from corpus by docId
    const sources: ResearchSource[] = (parsed.sources ?? []).flatMap((s) => {
      const doc = corpus.find((d) => d.id === s.docId)
      if (!doc) return []
      return [{ docId: doc.id, name: doc.name, passage: s.passage ?? '' }]
    })

    // Persist the conversation turn
    let conversationId = body.conversationId
    let history: ResearchTurn[] = []

    if (conversationId) {
      const { data } = await supabase
        .from('ai_conversations')
        .select('messages, user_id')
        .eq('id', conversationId)
        .maybeSingle()
      const row = data as { messages?: ResearchTurn[]; user_id?: string } | null
      if (row && row.user_id === ctx.userId) {
        history = row.messages ?? []
      } else {
        conversationId = undefined
      }
    }

    const nextHistory: ResearchTurn[] = [
      ...history,
      { role: 'user',      body: question,       ts: new Date().toISOString() },
      { role: 'assistant', body: parsed.answer,  sources: parsed.sources ?? [], ts: new Date().toISOString() },
    ]

    if (conversationId) {
      await supabase
        .from('ai_conversations')
        .update({ messages: nextHistory } as never)
        .eq('id', conversationId)
    } else {
      const { data: inserted } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: ctx.userId,
          kind: 'research',
          messages: nextHistory,
        } as never)
        .select('id')
        .maybeSingle()
      conversationId = (inserted as { id?: string } | null)?.id ?? ''
    }

    return json<ResearchResponse>({
      answer: parsed.answer,
      sources,
      conversationId: conversationId ?? '',
    })
  },
)
