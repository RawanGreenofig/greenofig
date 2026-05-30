import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { analyzeImage, isGeminiConfigured, safeJson } from '@/lib/gemini'
import { sanitizeParsed, type ParsedClient } from '@/lib/clinic-import'

/**
 * /api/nutritionist/clinic-clients/extract
 *
 * POST { fileBase64, mimeType }  → run Gemini vision over an uploaded
 * photo (handwritten/printed client list, intake form, business card)
 * or a PDF, and return a normalized array of ParsedClient rows for the
 * importer's review table. Spreadsheets/CSV are parsed in the browser
 * and never hit this route.
 *
 * Nutritionist or admin only. The light AI step is read-only — nothing
 * is written until the coach reviews and confirms via /import.
 */

interface Body {
  fileBase64?: string
  mimeType?: string
}

const MAX_BYTES = 12 * 1024 * 1024 // ~12MB of decoded file

const PROMPT = `You are extracting nutrition-clinic CLIENT records from this file (it may be a photo of a handwritten or printed list, an intake/registration form, a business card, or a PDF).

Return ONLY a JSON array — no prose, no markdown fences. Each element is one client:
{
  "full_name": string,            // required; omit the row entirely if there is no name
  "phone": string | null,         // keep digits, +, spaces and dashes as written
  "email": string | null,
  "date_of_birth": string | null, // normalize to "YYYY-MM-DD"; null if absent/unclear
  "gender": "female" | "male" | "other" | null,
  "notes": string | null          // allergies, history, goals, anything extra
}

Rules:
- Extract EVERY distinct client you can read. A table/list usually has one client per row.
- Do NOT invent or guess values. Use null for anything not present or unreadable.
- Preserve names in their original language/script.
- If the file clearly contains no client data, return [].`

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest) => {
    if (!isGeminiConfigured()) {
      return serviceUnavailable('AI (GEMINI_API_KEY)')
    }

    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const base64 = (body.fileBase64 ?? '').replace(/^data:[^;]+;base64,/, '')
    const mimeType = (body.mimeType ?? '').trim()
    if (!base64) return badRequest('fileBase64 is required.')
    if (!mimeType) return badRequest('mimeType is required.')

    // Rough decoded-size guard (base64 is ~4/3 of the byte length).
    if ((base64.length * 3) / 4 > MAX_BYTES) {
      return badRequest('File is too large (max ~12MB). Try a smaller scan.')
    }

    let raw: string
    try {
      raw = await analyzeImage(base64, mimeType, PROMPT)
    } catch (e) {
      return badRequest(
        e instanceof Error ? `AI extraction failed: ${e.message}` : 'AI extraction failed.',
      )
    }

    const parsed = safeJson<unknown>(raw)
    const clients: ParsedClient[] = sanitizeParsed(parsed)
    return json({ clients })
  },
)
