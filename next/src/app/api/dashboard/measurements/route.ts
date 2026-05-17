import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/dashboard/measurements
 *
 * GET  → latest non-null value per measurement column across this
 *        user's progress_entries. Returns one merged snapshot the
 *        Measurements card can hydrate into its inputs.
 * POST → inserts ONE progress_entries row holding the six measurement
 *        columns. Weight stays NULL so it doesn't pollute the weight
 *        trend chart. Numbers must be 0 < n < 300 cm to catch typos
 *        (a user typing "85" for a waist is fine; "8500" isn't).
 *
 * Body: { chest?, waist?, hips?, arms?, thighs?, neck? } — all cm,
 * numeric or null. Sending only the fields you want to save is OK.
 */

const FIELDS = ['chest', 'waist', 'hips', 'arms', 'thighs', 'neck'] as const
type Field = (typeof FIELDS)[number]
const COL: Record<Field, string> = {
  chest: 'chest_cm',
  waist: 'waist_cm',
  hips: 'hips_cm',
  arms: 'arms_cm',
  thighs: 'thighs_cm',
  neck: 'neck_cm',
}

type Body = Partial<Record<Field, number | null>>

export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // Pull recent rows and reduce client-side to a per-column latest.
  // Doing it in code keeps the SQL simple and avoids 6 individual
  // queries — 200 rows is far more than any real user will produce
  // before this becomes a perf concern.
  const { data } = await service
    .from('progress_entries')
    .select(
      'recorded_at, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, neck_cm',
    )
    .eq('user_id', ctx.userId)
    .order('recorded_at', { ascending: false })
    .limit(200)

  type Row = {
    recorded_at: string
    chest_cm: number | null
    waist_cm: number | null
    hips_cm: number | null
    arms_cm: number | null
    thighs_cm: number | null
    neck_cm: number | null
  }
  const rows = (data as Row[] | null) ?? []
  const latest: Record<Field, number | null> = {
    chest: null, waist: null, hips: null, arms: null, thighs: null, neck: null,
  }
  for (const r of rows) {
    for (const f of FIELDS) {
      if (latest[f] == null && r[COL[f] as keyof Row] != null) {
        latest[f] = r[COL[f] as keyof Row] as number
      }
    }
  }
  return json(latest)
})

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const insert: Record<string, number | null | string> = {
    user_id: ctx.userId,
  }
  let touched = false
  for (const f of FIELDS) {
    const v = body[f]
    if (v === undefined) continue
    if (v === null) {
      insert[COL[f]] = null
      touched = true
      continue
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return badRequest(`${f} must be a number or null.`)
    }
    if (v <= 0 || v >= 300) {
      return badRequest(`${f} must be between 0 and 300 cm.`)
    }
    insert[COL[f]] = v
    touched = true
  }
  if (!touched) {
    return badRequest('Provide at least one measurement.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { error } = await service
    .from('progress_entries')
    .insert(insert as never)
  if (error) return badRequest(error.message)
  return json({ ok: true })
})
