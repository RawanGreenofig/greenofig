import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import {
  analyzeImage,
  isGeminiConfigured,
  safeJson,
} from '@/lib/gemini'
import { tierAtLeast } from '@/lib/tier'
import { checkAndIncrementUsage } from '@/lib/ai-usage'

/**
 * POST /api/scanner
 * Body: { imageBase64: string, mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' }
 *
 * Free tier: 1 scan per UTC day. Basic+: unlimited.
 *
 * Response 200:
 * ```json
 * {
 *   "foods": [{ "name", "confidence", "servingLabel", "calories", "protein", "carbs", "fat" }],
 *   "drNote": string,
 *   "alternatives": string[],
 *   "scanId": string  // points at the inserted nutrition_logs row, when one was created
 * }
 * ```
 */

interface DetectedFood {
  name: string
  confidence: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  isIngredient?: boolean
}

interface ScannerResponse {
  foods: DetectedFood[]
  drNote: string
  alternatives: string[]
  scanId?: string
  detected?: boolean
  reason?: string
  type?: 'recipe' | 'meal' | 'single_item' | 'snack' | 'label'
  totals?: { calories: number; protein: number; carbs: number; fat: number }
}

// Confidence scores below 70 are considered "no food detected" — the scanner
// should refuse to fabricate macros for surfaces, walls, or ambiguous shots.
const FOOD_CONFIDENCE_THRESHOLD = 70

const SYSTEM_PROMPT = `You are Dr. Rawan Othman's clinical food-scanner assistant.

The image may show ANY of:
  - a single food item (apple, sandwich, salad)
  - a full meal or plate
  - a printed or written RECIPE (extract every listed ingredient)
  - a menu item
  - a packaged-food label

If the image clearly contains NO food at all (a wall, floor, person,
animal, blank frame), respond with EXACTLY this JSON:
  { "detected": false, "reason": "No food detected" }

Otherwise return JSON in this shape — no prose, no markdown fences:
{
  "detected": true,
  "type": "recipe" | "meal" | "single_item" | "snack" | "label",
  "foods": [
    {
      "name": string,
      "confidence": number 0..100,
      "servingLabel": string,
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "isIngredient"?: boolean
    }
  ],
  "totals"?: { "calories": number, "protein": number, "carbs": number, "fat": number },
  "drNote": string,
  "alternatives": [string]
}

Guidelines:
- For meals / single items: 1–5 entries ranked by visual prominence;
  each entry's macros are per-serving integers.
- For RECIPES: list EVERY ingredient as its own entry with
  isIngredient=true and macros for the amount used in one serving.
  Also fill "totals" with the sum across all ingredients (one serving).
- "confidence" is 0..100; only return entries with confidence >= 70.
- "servingLabel" is human-readable ("120 g chicken breast", "1 medium banana", "2 tbsp olive oil").
- "drNote" is one to two sentences in Dr. Rawan's clinical-but-warm voice
  (Mediterranean, evidence-led, no shame).
- "alternatives" is 0–3 brief swap suggestions.
- Do NOT guess or assume an item is food. If unsure, set detected=false.`

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  if (!isGeminiConfigured()) {
    console.error('[scanner] GEMINI_API_KEY not configured')
    return serviceUnavailable('Gemini')
  }

  let body: { imageBase64?: string; mealType?: string }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const imageBase64 = body.imageBase64
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return badRequest('imageBase64 is required.')
  }

  // Daily quota — admin-configurable per tier via /admin/ai-limits
  // (replaces the old hardcoded FREE_TIER_DAILY_LIMIT free-tier check).
  const usage = await checkAndIncrementUsage(
    ctx.userId,
    ctx.profile.tier as 'free' | 'basic' | 'premium' | 'vip',
    'scanner',
  )
  if (!usage.allowed) {
    return json(
      {
        error: {
          code: 'quota_exceeded',
          message: 'Daily scan limit reached.',
        },
        used: usage.used,
        limit: usage.limit,
        remaining: 0,
        upgradeRequired: usage.limit === 0 || ctx.profile.tier === 'free',
      },
      429,
    )
  }

  // Premium gates the priority model; everyone else gets flash
  void tierAtLeast(ctx.profile.tier, 'premium')

  let analysis: ScannerResponse | null
  try {
    const text = await analyzeImage(
      imageBase64.replace(/^data:image\/[^;]+;base64,/, ''),
      imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
      'Identify and quantify the foods on this plate.',
      SYSTEM_PROMPT,
    )
    analysis = safeJson<ScannerResponse>(text)
    if (!analysis) {
      console.error(
        '[scanner] safeJson returned null. Raw model output:',
        text.slice(0, 500),
      )
    }
  } catch (error) {
    console.error('[scanner] analyzeImage failed:', error)
    return internalError()
  }

  if (!analysis) {
    return json(
      { error: { code: 'parse_failed', message: 'Could not analyze that photo.' } },
      502,
    )
  }

  // Honor the model's "this isn't food" verdict. Also catch low-confidence
  // / empty-array cases where the model hallucinated nothing useful.
  const usableFoods = (analysis.foods ?? []).filter(
    (f) => typeof f?.confidence === 'number' && f.confidence >= FOOD_CONFIDENCE_THRESHOLD,
  )
  if (analysis.detected === false || usableFoods.length === 0) {
    return json<ScannerResponse>({
      foods: [],
      drNote: '',
      alternatives: [],
      detected: false,
      reason:
        analysis.reason ||
        'No food detected. Please point the camera at food or a meal.',
    })
  }
  analysis.foods = usableFoods

  // Persist a nutrition_logs row for the scan so quota + history work.
  const supabase = (await import('@/lib/supabase/server')).getServerSupabase()
  let scanId: string | undefined
  if (supabase) {
    const totals = analysis.foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein:  acc.protein  + f.protein,
        carbs:    acc.carbs    + f.carbs,
        fat:      acc.fat      + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
    const summary = analysis.foods.map((f) => f.name).join(' + ')
    const { data: row } = await supabase
      .from('nutrition_logs')
      .insert({
        user_id: ctx.userId,
        meal_type: body.mealType ?? null,
        food_name: summary || 'Scanned meal',
        calories: totals.calories,
        protein_g: totals.protein,
        carbs_g: totals.carbs,
        fat_g: totals.fat,
        source: 'scanner',
        notes: analysis.drNote,
      } as never)
      .select('id')
      .maybeSingle()
    scanId = (row as { id?: string } | null)?.id
  }

  // Recipe responses can carry an explicit `totals` (sum across all
  // ingredients for one serving). Compute a fallback if the model
  // didn't fill it in.
  const computedTotals = analysis.foods.reduce(
    (acc, f) => ({
      calories: acc.calories + (f.calories ?? 0),
      protein: acc.protein + (f.protein ?? 0),
      carbs: acc.carbs + (f.carbs ?? 0),
      fat: acc.fat + (f.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return json<ScannerResponse>({
    foods: analysis.foods,
    drNote: analysis.drNote ?? '',
    alternatives: analysis.alternatives ?? [],
    scanId,
    type: analysis.type,
    totals: analysis.totals ?? computedTotals,
  })
})
