import type { NextRequest } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import { chat, isGeminiConfigured, stripJsonFence } from '@/lib/gemini'

/**
 * POST /api/reviews/cluster
 *
 * Admin/nutritionist tool — pulls all approved reviews and asks Gemini
 * to group them into 4–8 themes ("the autopilot filter"). Returns:
 *
 *   {
 *     themes: [{ name, summary, sentiment, count, review_ids }],
 *     analyzed: <total>,
 *   }
 *
 * Optionally writes the per-review tags back to reviews.auto_themes when
 * ?write=1 is passed, so individual review cards can show their themes.
 *
 * Requires GEMINI_API_KEY. Caller must be authenticated as admin or
 * nutritionist (RLS on reviews handles read access; we still defense-
 * check here).
 */
interface ThemeOut {
  name: string
  summary: string
  sentiment: 'positive' | 'mixed' | 'negative'
  count: number
  review_ids: string[]
}

const SYSTEM = `You are a customer-feedback analyst for Greenofig, a personalized nutrition coaching platform.
Group the supplied reviews into 4–8 distinct themes that reveal what
clients keep talking about. A "theme" is a topic (e.g. "AI food scanner
accuracy", "ease of meal planning", "Dr. Rawan responsiveness", "billing
confusion"). Each review should be tagged with 1–3 themes.

Return JSON only, no prose, no markdown fences. Schema:
{
  "themes": [
    {
      "name": "short title (max 4 words)",
      "summary": "1-sentence description of what clients say in this theme",
      "sentiment": "positive" | "mixed" | "negative",
      "review_ids": ["uuid1", "uuid2", ...]
    }
  ]
}

Rules:
- Use only the review IDs provided.
- Themes must be distinct — no overlapping titles.
- Order themes by review count, descending.
- Sentiment reflects the dominant tone within that theme.
- Don't invent reviews; only group what's provided.`

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return Response.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 503 },
    )
  }

  const supabase = getServiceSupabase()
  if (!supabase) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const url = new URL(req.url)
  const writeBack = url.searchParams.get('write') === '1'

  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, title, body')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  type RevRow = { id: string; rating: number; title: string | null; body: string }
  const reviews = (data as RevRow[] | null) ?? []
  if (reviews.length === 0) {
    return Response.json({ themes: [], analyzed: 0 })
  }

  const payload = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body.slice(0, 600), // keep prompt size sane
  }))

  const prompt = `Reviews:\n${JSON.stringify(payload, null, 2)}\n\nGroup these reviews into themes per the schema.`

  const raw = await chat([{ role: 'user', content: prompt }], SYSTEM)
  const cleaned = stripJsonFence(raw).trim()

  let parsed: { themes?: Array<Omit<ThemeOut, 'count'>> }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    console.error('[reviews/cluster] non-JSON response:', cleaned.slice(0, 400))
    return Response.json(
      { error: 'Could not parse Gemini response' },
      { status: 500 },
    )
  }

  const themesIn = Array.isArray(parsed.themes) ? parsed.themes : []
  const validIds = new Set(reviews.map((r) => r.id))
  const themes: ThemeOut[] = themesIn
    .map((t): ThemeOut => {
      const ids = (Array.isArray(t.review_ids) ? t.review_ids : []).filter(
        (id): id is string => typeof id === 'string' && validIds.has(id),
      )
      const sentiment: ThemeOut['sentiment'] =
        t.sentiment === 'positive' || t.sentiment === 'negative'
          ? t.sentiment
          : 'mixed'
      return {
        name: typeof t.name === 'string' ? t.name : 'Untitled theme',
        summary: typeof t.summary === 'string' ? t.summary : '',
        sentiment,
        review_ids: ids,
        count: ids.length,
      }
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)

  // Optional: write the per-review themes back so review cards can
  // surface tags
  if (writeBack && themes.length > 0) {
    const tagsByReview = new Map<string, Set<string>>()
    for (const t of themes) {
      for (const rid of t.review_ids) {
        if (!tagsByReview.has(rid)) tagsByReview.set(rid, new Set())
        tagsByReview.get(rid)!.add(t.name)
      }
    }
    const entries = Array.from(tagsByReview.entries())
    await Promise.all(
      entries.map(([rid, tagSet]) =>
        supabase
          .from('reviews')
          .update({ auto_themes: Array.from(tagSet) } as never)
          .eq('id', rid),
      ),
    )
  }

  return Response.json({ themes, analyzed: reviews.length })
}
