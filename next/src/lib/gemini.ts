import { GoogleGenAI } from '@google/genai'

/**
 * Singleton Gemini client backed by the new @google/genai SDK
 * (the @google/generative-ai package was deprecated when 2.0
 * models landed). Returns null when GEMINI_API_KEY is missing
 * so route handlers can return 503 instead of crashing during
 * build or in unconfigured environments.
 *
 * Env vars:
 *   GEMINI_API_KEY — required; aistudio.google.com → Get API Key
 */

const apiKey = (): string | undefined => process.env.GEMINI_API_KEY

let cached: GoogleGenAI | null | undefined

export function getGemini(): GoogleGenAI | null {
  if (cached !== undefined) return cached
  const key = apiKey()
  if (!key) {
    cached = null
    return null
  }
  cached = new GoogleGenAI({ apiKey: key })
  return cached
}

// Model names. Switched from gemini-2.0-flash to gemini-2.5-flash
// because Google reduced the 2.0-flash free-tier quota to 0
// (the model is on its deprecation path). 2.5-flash supports the
// same text + vision + streaming API and has an active free tier.
// Override via GEMINI_TEXT_MODEL / _VISION_MODEL / _RESEARCH_MODEL
// env vars without redeploying if Google moves models again.
export const GEMINI_VISION_MODEL =
  process.env.GEMINI_VISION_MODEL ?? 'gemini-2.5-flash'
export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash'
export const GEMINI_RESEARCH_MODEL =
  process.env.GEMINI_RESEARCH_MODEL ?? 'gemini-2.5-flash'

/** True when the Gemini integration is configured for this environment. */
export const isGeminiConfigured = () => !!apiKey()

/** Strip Markdown code fences from a JSON response. */
export function stripJsonFence(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

/** Best-effort JSON parse — returns null instead of throwing. */
export function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(stripJsonFence(s)) as T
  } catch {
    return null
  }
}

/* ── High-level helpers ────────────────────────────────────────────── */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model'
  content: string
}

interface ChatContent {
  role: 'user' | 'model'
  parts: { text: string }[]
}

function toContents(messages: ChatMessage[]): ChatContent[] {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : (m.role as 'user' | 'model'),
    parts: [{ text: m.content }],
  }))
}

/**
 * Stream a chat reply. Throws if the client isn't configured — route
 * handlers should call `isGeminiConfigured()` first and return 503.
 *
 * `messages` is the FULL transcript (history + the new user message
 * as the last item). The route handler is responsible for appending
 * the new user message before calling.
 */
export async function streamChat(
  messages: ChatMessage[],
  systemInstruction?: string,
) {
  const ai = getGemini()
  if (!ai) throw new Error('GEMINI_API_KEY not set')
  return ai.models.generateContentStream({
    model: GEMINI_TEXT_MODEL,
    contents: toContents(messages),
    config: systemInstruction ? { systemInstruction } : undefined,
  })
}

/**
 * Non-streaming chat — used by helpers that need the whole response
 * before returning (e.g. nutritionist research desk).
 */
export async function chat(
  messages: ChatMessage[],
  systemInstruction?: string,
): Promise<string> {
  const ai = getGemini()
  if (!ai) throw new Error('GEMINI_API_KEY not set')
  const result = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: toContents(messages),
    config: systemInstruction ? { systemInstruction } : undefined,
  })
  return result.text ?? ''
}

/**
 * Single-image vision call. `imageBase64` should be the raw base64
 * data (without the `data:image/...;base64,` prefix). `mimeType` is
 * one of `image/jpeg`, `image/png`, `image/webp`, `image/heic`,
 * `image/heif`.
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  systemInstruction?: string,
): Promise<string> {
  const ai = getGemini()
  if (!ai) throw new Error('GEMINI_API_KEY not set')
  const result = await ai.models.generateContent({
    model: GEMINI_VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: imageBase64, mimeType } },
          { text: prompt },
        ],
      },
    ],
    config: systemInstruction ? { systemInstruction } : undefined,
  })
  return result.text ?? ''
}

/**
 * Backwards-compat wrapper for callers that want a one-shot response
 * with a system prompt + user message + optional history. Internally
 * uses the new chat() helper.
 */
export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  history: { role: 'user' | 'model' | 'assistant'; parts?: unknown }[] = [],
): Promise<string> {
  const messages: ChatMessage[] = [
    ...history.map((h) => {
      // Accept both the official { parts: [{text}] } shape and the
      // looser { parts: string[] } shape some callers used.
      const text = Array.isArray(h.parts)
        ? (h.parts as Array<{ text?: string } | string>)
            .map((p) => (typeof p === 'string' ? p : p.text ?? ''))
            .join('')
        : ''
      return { role: h.role, content: text }
    }),
    { role: 'user', content: userMessage },
  ]
  return chat(messages, systemPrompt)
}
