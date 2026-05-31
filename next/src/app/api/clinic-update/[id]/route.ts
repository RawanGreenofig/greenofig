import type { NextRequest } from 'next/server'
import { badRequest, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/clinic-update/[id]   (PUBLIC — no auth)
 *
 * Behind the per-client "send update link". The client fills a
 * structured check-in (weight, measurements, energy/sleep/adherence/
 * appetite ratings, wins, challenges) which is saved as a
 * clinic_assessments row (source 'client') and the coach is notified.
 */

export const dynamic = 'force-dynamic'

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const rating = (v: unknown): number | null => {
  const n = num(v)
  if (n == null) return null
  return n >= 1 && n <= 5 ? Math.round(n) : null
}
const txt = (v: unknown, max = 2000): string | null => {
  if (v == null) return null
  const t = String(v).trim()
  return t ? t.slice(0, max) : null
}

interface Body {
  weight_kg?: unknown
  waist_cm?: unknown
  hip_cm?: unknown
  arm_cm?: unknown
  thigh_cm?: unknown
  energy?: unknown
  sleep?: unknown
  adherence?: unknown
  appetite?: unknown
  wins?: unknown
  challenges?: unknown
  hp?: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid form submission.')
  }
  if (typeof body.hp === 'string' && body.hp.trim()) return json({ ok: true }) // honeypot

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: client } = await service
    .from('clinic_clients')
    .select('id, coach_id, full_name')
    .eq('id', params.id)
    .maybeSingle()
  const c = client as { id: string; coach_id: string; full_name: string } | null
  if (!c) return notFound('This update link is not valid.')

  const row = {
    clinic_client_id: c.id,
    coach_id: c.coach_id,
    source: 'client',
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
  }
  const hasData = Object.entries(row).some(
    ([k, v]) => !['clinic_client_id', 'coach_id', 'source'].includes(k) && v != null,
  )
  if (!hasData) return badRequest('Please fill in at least one field.')

  const { error } = await service.from('clinic_assessments').insert(row as never)
  if (error) return badRequest(error.message)

  // Notify the coach (bell + push).
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
  const payload = {
    title: 'Client progress update',
    title_ar: 'تحديث تقدّم العميل',
    body: `${c.full_name} submitted a check-in.`,
    body_ar: `${c.full_name} أرسل تحديثاً عن تقدّمه.`,
    type: 'system',
    url: `/nutritionist/clinic-clients/${c.id}`,
  }
  if (secret) {
    try {
      await fetch(`${appUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-secret': secret },
        body: JSON.stringify({
          userIds: [c.coach_id],
          title: payload.title,
          titleAr: payload.title_ar,
          body: payload.body,
          bodyAr: payload.body_ar,
          type: payload.type,
          url: payload.url,
        }),
      })
    } catch {
      /* best effort */
    }
  } else {
    await service.from('notifications').insert({
      user_id: c.coach_id,
      ...payload,
      data: { url: payload.url },
      is_read: false,
    } as never)
  }

  return json({ ok: true })
}
