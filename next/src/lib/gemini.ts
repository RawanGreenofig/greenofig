import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Singleton Gemini client. Returns null when GOOGLE_GEMINI_API_KEY is
 * missing so route handlers can return 503 instead of crashing during
 * build or in unconfigured environments.
 *
 * Env vars:
 *   GOOGLE_GEMINI_API_KEY  — required; aistudio.google.com → Get API Key
 *   GEMINI_MODEL           — overrides default text model
 *   GEMINI_RESEARCH_MODEL  — overrides default research model
 */

const apiKey = (): string | undefined => process.env.GOOGLE_GEMINI_API_KEY

let cached: GoogleGenerativeAI | null | undefined

export function getGemini(): GoogleGenerativeAI | null {
  if (cached !== undefined) return cached
  const key = apiKey()
  if (!key) {
    cached = null
    return null
  }
  cached = new GoogleGenerativeAI(key)
  return cached
}

export const GEMINI_VISION_MODEL = 'gemini-1.5-flash'
export const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'
export const GEMINI_RESEARCH_MODEL = process.env.GEMINI_RESEARCH_MODEL ?? 'gemini-1.5-pro'

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

interface GeminiHistoryTurn {
  role: 'user' | 'model'
  parts: { text: string }[]
}

/**
 * One-shot chat against Gemini. Throws if the client isn't configured —
 * route handlers should call `isGeminiConfigured()` first and return 503.
 *
 * `history` accepts the official `{ role, parts: [{ text }] }` shape OR
 * the looser `{ role, parts: string[] }` shape used in some skill specs;
 * we normalize both before sending.
 */
export async function geminiChat(
  systemPrompt: string,
  userMessage: string,
  history: (GeminiHistoryTurn | { role: 'user' | 'model'; parts: string[] })[] = [],
): Promise<string> {
  const client = getGemini()
  if (!client) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const model = client.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    systemInstruction: systemPrompt,
  })

  const normalized: GeminiHistoryTurn[] = history.map((h) => {
    if (Array.isArray(h.parts) && typeof h.parts[0] === 'string') {
      return { role: h.role, parts: (h.parts as string[]).map((text) => ({ text })) }
    }
    return h as GeminiHistoryTurn
  })

  const chat = model.startChat({ history: normalized })
  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}

/**
 * Single-image vision call. `imageBase64` should be the raw base64 data
 * (without the `data:image/...;base64,` prefix). `mimeType` is one of
 * `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
 */
export async function geminiVision(
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<string> {
  const client = getGemini()
  if (!client) throw new Error('GOOGLE_GEMINI_API_KEY not set')

  const model = client.getGenerativeModel({ model: GEMINI_VISION_MODEL })

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    prompt,
  ])
  return result.response.text()
}
