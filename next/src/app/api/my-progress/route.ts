import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/my-progress
 *
 * The signed-in (linked walk-in) client's own progress check-ins, so they
 * can log and review them straight from their dashboard — no coach-shared
 * link needed. Resolves their clinic_clients record(s) via user_id.
 *
 *   GET  → their check-in history (both their own and the coach's entries).
 *   POST → record a new check-in (source='client') + notify the coach.
 */

const SELECT =
  'id, source, weight_kg, waist_cm, hip_cm, arm_cm, thigh_cm, energy, sleep, adherence, appetite, wins, challenges, notes, created_at'

async function myClinic(service: NonNullable<ReturnType<typeof getServiceSupabase>>, userId: string) {
  const { data } = await service
    .from('clinic_clients')
    .select('id, coach_id, full_name')
    .eq('user_id', userId)
  return (data as { id: string; coach_id: string; full_name: string }[] | null) ?? []
}

export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')
  const clinics = await myClinic(service, ctx.userId)
  const ids = clinics.map((c) => c.id)
  if (ids.length === 0) return json({ checkins: [] })

  const { data } = await service
    .from('clinic_assessments')
    .select(SELECT)
    .in('clinic_client_id', ids)
    .order('created_at', { ascending: false })
    .limit(60)
  return json({ checkins: data ?? [] })
})

const num = (v: unknown): number | null => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const rating = (v: unknown): number | null => {
  const n = num(v)
  if (n === null) return null
  return n >= 1 && n <= 5 ? Math.round(n) : null
}
const txt = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, 2000) : null
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')
  const clinics = await myClinic(service, ctx.userId)
  if (clinics.length === 0) return badRequest('No clinic record is linked to your account.')
  const clinic = clinics[0]

  const row = {
    clinic_client_id: clinic.id,
    coach_id: clinic.coach_id,
    source: 'client' as const,
    weight_kg: num(body.weight_kg),
    waist_cm: num(body.waist_cm),
    hip_cm: num(body.hip_cm),
    arm_cm: num(body.arm_cm),
    thigh_cm: num(body.thigh_cm),
    energy: rating(body.energy),
    sleep: rating(body.sleep),
    adherence: rating(body.adherence),
    appetite: rating(body.appetite),
    wins: txt(body.wins),
    challenges: txt(body.challenges),
    notes: txt(body.notes),
  }

  const { error } = await service.from('clinic_assessments').insert(row as never)
  if (error) return badRequest(error.message)

  // Tell the coach a fresh check-in landed.
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
  if (secret && clinic.coach_id) {
    try {
      await fetch(`${appUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-secret': secret },
        body: JSON.stringify({
          userIds: [clinic.coach_id],
          title: 'New check-in 📝',
          titleAr: 'تحديث جديد 📝',
          body: `${clinic.full_name} logged a progress check-in`,
          bodyAr: `${clinic.full_name} سجّل تحديثاً جديداً`,
          type: 'system',
          url: `/nutritionist/clinic-clients/${clinic.id}`,
        }),
      })
    } catch {
      /* best effort */
    }
  }

  return json({ ok: true })
})
