import type { NextRequest } from 'next/server'
import { badRequest, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/clinic-update/[id]   (PUBLIC — no auth)
 *
 * Behind a per-client "progress update" link the coach shares with an
 * EXISTING walk-in client. `[id]` is the clinic_clients id. The client
 * reports how they're doing; we append a 'progress' entry to that
 * client's Plan & Progress log and notify the owning coach so she can
 * adjust/rebuild the plan. Service role; no visitor session needed.
 */

export const dynamic = 'force-dynamic'

interface Body {
  weight?: string | null
  measurements?: string | null
  trend?: string | null // 'improved' | 'same' | 'worse'
  notes?: string | null
  hp?: string // honeypot
}

const clamp = (s: unknown, n: number): string | null => {
  if (s == null) return null
  const t = String(s).trim()
  return t ? t.slice(0, n) : null
}

const TREND_LABEL: Record<string, string> = {
  improved: 'Improving',
  same: 'About the same',
  worse: 'Struggling / worse',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid form submission.')
  }
  if (body.hp && body.hp.trim()) return json({ ok: true }) // honeypot

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data: client } = await service
    .from('clinic_clients')
    .select('id, coach_id, full_name')
    .eq('id', params.id)
    .maybeSingle()
  const c = client as { id: string; coach_id: string; full_name: string } | null
  if (!c) return notFound('This update link is not valid.')

  // Compose a readable progress entry.
  const weight = clamp(body.weight, 40)
  const measurements = clamp(body.measurements, 400)
  const trend = body.trend && TREND_LABEL[body.trend] ? TREND_LABEL[body.trend] : null
  const notes = clamp(body.notes, 2000)
  const lines = ['Client update:']
  if (trend) lines.push(`• Overall: ${trend}`)
  if (weight) lines.push(`• Weight: ${weight}`)
  if (measurements) lines.push(`• Measurements: ${measurements}`)
  if (notes) lines.push(`• Notes: ${notes}`)
  if (lines.length === 1) return badRequest('Please fill in at least one field.')

  const { error } = await service.from('clinic_client_log').insert({
    clinic_client_id: c.id,
    coach_id: c.coach_id,
    kind: 'progress',
    body: lines.join('\n'),
  } as never)
  if (error) return badRequest(error.message)

  // Notify the coach (bell + push).
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
  const payload = {
    title: 'Client progress update',
    title_ar: 'تحديث تقدّم العميل',
    body: `${c.full_name} sent a progress update${trend ? ` — ${trend}` : ''}.`,
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
