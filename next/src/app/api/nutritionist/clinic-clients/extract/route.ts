import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getGemini, GEMINI_VISION_MODEL, isGeminiConfigured, safeJson } from '@/lib/gemini'
import { sanitizeParsed, type ParsedClient } from '@/lib/clinic-import'

/**
 * POST /api/nutritionist/clinic-clients/extract
 *
 * Multi-input AI extractor for the bulk importer. Accepts one or more
 * "parts" in a single call and fuses them:
 *   - { type: 'text',  text, label }          ← a spreadsheet/CSV flattened to text
 *   - { type: 'image', data, mimeType }       ← a photo (base64)
 *   - { type: 'pdf',   data, mimeType }        ← a PDF (base64)
 *
 * Gemini reads everything together — so the coach can drop in an Excel
 * sheet AND a photo of the same client list, and the model reconciles
 * them into one accurate, deduplicated set, reproducing the values
 * exactly as written. Returns normalized ParsedClient rows for review.
 * Read-only — nothing is saved until the coach confirms via /import.
 */

export const maxDuration = 60

interface Part {
  type?: 'text' | 'image' | 'pdf'
  text?: string
  data?: string
  mimeType?: string
  label?: string
}
interface Body {
  parts?: Part[]
}

const MAX_TOTAL_BYTES = 18 * 1024 * 1024

const PROMPT = `You are extracting nutrition-clinic CLIENT records from the material above. It may include a spreadsheet/CSV (as text), a PDF, and/or a photo (a printed or handwritten list, an intake form, business cards). When more than one source is given, they may describe the SAME clients — reconcile them into ONE row per real person, merging fields and preferring whichever source has the value.

Return ONLY a JSON array — no prose, no markdown fences. Each element:
{
  "full_name": string,            // required; skip a row with no name
  "phone": string | null,         // EXACTLY as written (keep +, spaces, dashes, leading zeros)
  "email": string | null,
  "date_of_birth": string | null, // normalize to "YYYY-MM-DD"; null if absent
  "start_date": string | null,    // when they STARTED at the clinic / joined / first visit; "YYYY-MM-DD"; null if absent
  "end_date": string | null,      // when their program ENDS / expires; "YYYY-MM-DD"; null if absent
  "insured": boolean,             // true if the source marks them insured/covered, else false
  "insurance_provider": string | null, // insurer/company name if present
  "gender": "female" | "male" | "other" | null,
  "notes": string | null          // anything extra (goals, allergies, plan, balance owed…)
}

Rules:
- Reproduce values EXACTLY as in the source — do not reformat names/phones or invent data. Use null when something isn't present.
- Extract EVERY distinct client. A table/list normally has one client per row.
- Preserve original language/script (e.g. Arabic names) verbatim.
- Return [] if there is genuinely no client data.`

export const POST = withNutritionistOrAdmin(async (req: NextRequest) => {
  if (!isGeminiConfigured()) return serviceUnavailable('AI (GEMINI_API_KEY)')

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const parts = Array.isArray(body.parts) ? body.parts : []
  if (parts.length === 0) return badRequest('No parts provided.')

  const geminiParts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []
  let totalBytes = 0
  let hasContent = false

  for (const p of parts) {
    if (p.type === 'text' && p.text && p.text.trim()) {
      const label = (p.label || 'spreadsheet').slice(0, 80)
      geminiParts.push({ text: `--- SOURCE (${label}) ---\n${p.text.slice(0, 200000)}` })
      hasContent = true
    } else if ((p.type === 'image' || p.type === 'pdf') && p.data && p.mimeType) {
      const data = p.data.replace(/^data:[^;]+;base64,/, '')
      totalBytes += (data.length * 3) / 4
      if (totalBytes > MAX_TOTAL_BYTES) {
        return badRequest('Attachments are too large (max ~18MB total). Try smaller scans.')
      }
      geminiParts.push({ inlineData: { data, mimeType: p.mimeType } })
      hasContent = true
    }
  }

  if (!hasContent) return badRequest('No readable content in the provided parts.')

  geminiParts.push({ text: PROMPT })

  const ai = getGemini()
  if (!ai) return serviceUnavailable('AI (GEMINI_API_KEY)')

  let raw: string
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_VISION_MODEL,
      contents: [{ role: 'user', parts: geminiParts }],
    })
    raw = result.text ?? ''
  } catch (e) {
    return badRequest(
      e instanceof Error ? `AI extraction failed: ${e.message}` : 'AI extraction failed.',
    )
  }

  const clients: ParsedClient[] = sanitizeParsed(safeJson<unknown>(raw))
  return json({ clients })
})
