import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { chat, isGeminiConfigured, safeJson } from '@/lib/gemini'

/**
 * /api/nutritionist/clinic-clients/[id]/analysis
 *
 * Per-client progress analysis (what's improved / what needs work).
 *   GET   → the stored analysis.
 *   POST  → (re)generate it with AI from the structured check-in history,
 *           then save + return it.
 *   PATCH → save the coach's manual edits.
 */

interface AssessmentRow {
  source: string
  weight_kg: number | null
  waist_cm: number | null
  hip_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  energy: number | null
  sleep: number | null
  adherence: number | null
  appetite: number | null
  wins: string | null
  challenges: string | null
  notes: string | null
  created_at: string
}

async function loadClient(
  service: NonNullable<ReturnType<typeof getServiceSupabase>>,
  id: string,
) {
  const { data } = await service
    .from('clinic_clients')
    .select('id, coach_id, full_name, start_date')
    .eq('id', id)
    .maybeSingle()
  return data as { id: string; coach_id: string; full_name: string; start_date: string | null } | null
}

export const GET = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    let q = service
      .from('clinic_analysis')
      .select('improvements, needs_improvement, summary, recommendations, shared_with_client, updated_at')
      .eq('clinic_client_id', params.id)
    if (ctx.profile.role !== 'admin') q = q.eq('coach_id', ctx.userId)
    const { data } = await q.maybeSingle()
    return json({ analysis: data ?? null })
  },
)

export const PATCH = withNutritionistOrAdmin<{ id: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    let body: { improvements?: string; needs_improvement?: string; summary?: string; recommendations?: string; shared_with_client?: boolean }
    try {
      body = (await req.json()) as typeof body
    } catch {
      return badRequest('Invalid JSON body.')
    }
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const c = await loadClient(service, params.id)
    if (!c) return badRequest('Client not found.')
    if (ctx.profile.role !== 'admin' && c.coach_id !== ctx.userId) return forbidden()

    const { error } = await service.from('clinic_analysis').upsert(
      {
        clinic_client_id: c.id,
        coach_id: c.coach_id,
        improvements: body.improvements?.slice(0, 4000) ?? null,
        needs_improvement: body.needs_improvement?.slice(0, 4000) ?? null,
        summary: body.summary?.slice(0, 4000) ?? null,
        recommendations: body.recommendations?.slice(0, 4000) ?? null,
        ...(typeof body.shared_with_client === 'boolean' ? { shared_with_client: body.shared_with_client } : {}),
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'clinic_client_id' },
    )
    if (error) return badRequest(error.message)
    return json({ ok: true })
  },
)

export const POST = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')
    const c = await loadClient(service, params.id)
    if (!c) return badRequest('Client not found.')
    if (ctx.profile.role !== 'admin' && c.coach_id !== ctx.userId) return forbidden()
    if (!isGeminiConfigured()) return serviceUnavailable('AI (GEMINI_API_KEY)')

    const { data } = await service
      .from('clinic_assessments')
      .select(
        'source, weight_kg, waist_cm, hip_cm, arm_cm, thigh_cm, energy, sleep, adherence, appetite, wins, challenges, notes, created_at',
      )
      .eq('clinic_client_id', c.id)
      .order('created_at', { ascending: true })
      .limit(40)
    const rows = (data as AssessmentRow[] | null) ?? []

    // Adherence: how many assigned meal plans / recipes the client actually did.
    const { data: asgData } = await service
      .from('clinic_assignments')
      .select('kind, title, status, due_date, completed_at')
      .eq('clinic_client_id', c.id)
      .order('created_at', { ascending: true })
      .limit(100)
    const asg = (asgData as { kind: string; title: string; status: string; due_date: string | null; completed_at: string | null }[] | null) ?? []
    const doneCount = asg.filter((a) => a.status === 'done').length

    if (rows.length === 0 && asg.length === 0) {
      return badRequest('No check-ins or assignments yet — add at least one to analyze.')
    }

    const lines = rows.map((r) => {
      const parts: string[] = [r.created_at.slice(0, 10)]
      if (r.weight_kg != null) parts.push(`weight ${r.weight_kg}kg`)
      const m = [
        r.waist_cm && `waist ${r.waist_cm}`,
        r.hip_cm && `hip ${r.hip_cm}`,
        r.arm_cm && `arm ${r.arm_cm}`,
        r.thigh_cm && `thigh ${r.thigh_cm}`,
      ].filter(Boolean)
      if (m.length) parts.push(`measurements(cm): ${m.join(', ')}`)
      const rate = [
        r.energy && `energy ${r.energy}/5`,
        r.sleep && `sleep ${r.sleep}/5`,
        r.adherence && `adherence ${r.adherence}/5`,
        r.appetite && `appetite ${r.appetite}/5`,
      ].filter(Boolean)
      if (rate.length) parts.push(rate.join(', '))
      if (r.wins) parts.push(`wins: ${r.wins}`)
      if (r.challenges) parts.push(`challenges: ${r.challenges}`)
      if (r.notes) parts.push(`notes: ${r.notes}`)
      return `- (${r.source}) ${parts.join(' · ')}`
    })

    const asgLines = asg.map(
      (a) =>
        `- [${a.status === 'done' ? 'DONE' : 'not done'}] ${a.kind === 'recipe' ? 'recipe' : 'meal plan'}: ${a.title}${a.completed_at ? ` (done ${a.completed_at.slice(0, 10)})` : a.due_date ? ` (due ${a.due_date})` : ''}`,
    )
    const adherencePct = asg.length ? Math.round((doneCount / asg.length) * 100) : null

    const prompt = `You are a nutrition coach reviewing a client's progress (oldest first).${c.start_date ? ` They started on ${c.start_date}.` : ''}

${rows.length ? `CHECK-INS:\n${lines.join('\n')}` : 'CHECK-INS: none recorded yet.'}

ASSIGNED PLANS & RECIPES (adherence — did they follow what the coach gave them?):
${asg.length ? `${asgLines.join('\n')}\n\nOverall adherence: ${doneCount}/${asg.length} completed (${adherencePct}%).` : 'Nothing assigned yet.'}

Analyze the trend AND the adherence, then reply with ONLY this JSON (no prose, no fences):
{
  "summary": string,            // 1-2 sentences on overall trajectory + whether they're following the plan
  "improvements": string,       // bullet lines ("- ...") of what's clearly improving (weight/measurements down, ratings up, wins, plans completed)
  "needs_improvement": string,  // bullet lines ("- ...") of what's stalling/worsening or being skipped (low adherence, missed plans)
  "recommendations": string     // bullet lines ("- ...") of concrete next steps: what to assign next, what to adjust, what to reinforce given their adherence and trend
}
Be specific and reference the numbers and adherence. If data is thin, say so honestly.`

    let raw: string
    try {
      raw = await chat([{ role: 'user', content: prompt }])
    } catch (e) {
      return badRequest(e instanceof Error ? `AI failed: ${e.message}` : 'AI failed.')
    }
    const parsed = safeJson<{ summary?: string; improvements?: string; needs_improvement?: string; recommendations?: string }>(raw)
    if (!parsed) return badRequest('Could not parse the AI analysis. Try again.')

    const analysis = {
      clinic_client_id: c.id,
      coach_id: c.coach_id,
      summary: (parsed.summary ?? '').slice(0, 4000) || null,
      improvements: (parsed.improvements ?? '').slice(0, 4000) || null,
      needs_improvement: (parsed.needs_improvement ?? '').slice(0, 4000) || null,
      recommendations: (parsed.recommendations ?? '').slice(0, 4000) || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await service
      .from('clinic_analysis')
      .upsert(analysis as never, { onConflict: 'clinic_client_id' })
    if (error) return badRequest(error.message)
    return json({
      analysis: {
        summary: analysis.summary,
        improvements: analysis.improvements,
        needs_improvement: analysis.needs_improvement,
        recommendations: analysis.recommendations,
        updated_at: analysis.updated_at,
      },
    })
  },
)
