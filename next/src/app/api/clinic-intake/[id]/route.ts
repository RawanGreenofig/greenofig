import type { NextRequest } from 'next/server'
import { badRequest, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { rateLimit } from '@/lib/server/rateLimit'
import { ipFromRequest } from '@/lib/api/audit'

/**
 * POST /api/clinic-intake/[id]   (PUBLIC — no auth)
 *
 * Self-registration endpoint behind a coach's shareable intake link.
 * `[id]` is the coach's (nutritionist) profile id. A prospective walk-in
 * fills the public form and submits; we create a clinic_clients row
 * (source = 'intake') owned by that coach and notify the coach (bell +
 * push). Uses the service role, so it works without a visitor session;
 * RLS isn't relied on here.
 *
 * Abuse guards: validates the coach exists & is a nutritionist, requires
 * name + phone, clamps field lengths, and honours a hidden honeypot.
 */

export const dynamic = 'force-dynamic'

interface Body {
  full_name?: string
  phone?: string | null
  email?: string | null
  date_of_birth?: string | null
  start_date?: string | null
  gender?: string | null
  notes?: string | null
  hp?: string // honeypot — real users leave it blank
}

const clamp = (s: unknown, n: number): string | null => {
  if (s == null) return null
  const t = String(s).trim()
  return t ? t.slice(0, n) : null
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = ipFromRequest(req) ?? 'unknown'
  if (!(await rateLimit(`clinic-intake:${ip}`, { limit: 6, windowSec: 600 }))) {
    return json({ error: 'Too many submissions. Please wait a few minutes.' }, 429)
  }
  const coachId = params.id
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid form submission.')
  }

  // Honeypot: silently accept (so bots think they succeeded) but do nothing.
  if (body.hp && body.hp.trim()) return json({ ok: true })

  const full_name = clamp(body.full_name, 200)
  const phone = clamp(body.phone, 40)
  if (!full_name) return badRequest('Please enter your full name.')
  if (!phone) return badRequest('Please enter a phone number.')

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  // The link must point at a real nutritionist.
  const { data: coach } = await service
    .from('profiles')
    .select('id, role')
    .eq('id', coachId)
    .maybeSingle()
  const c = coach as { id: string; role: string } | null
  if (!c || (c.role !== 'nutritionist' && c.role !== 'admin')) {
    return notFound('This intake link is not valid.')
  }

  const { data: inserted, error } = await service
    .from('clinic_clients')
    .insert({
      coach_id: coachId,
      source: 'intake',
      is_active: true,
      full_name,
      phone,
      email: clamp(body.email, 200),
      date_of_birth: body.date_of_birth || null,
      start_date: body.start_date || null,
      gender: clamp(body.gender, 20),
      notes: clamp(body.notes, 2000),
    } as never)
    .select('id')
    .maybeSingle()
  if (error) return badRequest(error.message)
  const newId = (inserted as { id?: string } | null)?.id

  // Notify the coach (bell + web/FCM push) via the shared pipeline.
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
  if (secret) {
    try {
      await fetch(`${appUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-secret': secret },
        body: JSON.stringify({
          userIds: [coachId],
          title: 'New clinic client',
          titleAr: 'عميل عيادة جديد',
          body: `${full_name} submitted their details.`,
          bodyAr: `${full_name} أرسل بياناته.`,
          type: 'system',
          url: newId ? `/nutritionist/clinic-clients/${newId}` : '/nutritionist/clinic-clients',
        }),
      })
    } catch {
      /* notification is best-effort; the client row is already saved */
    }
  } else {
    // Fallback: at least drop a bell row directly.
    await service.from('notifications').insert({
      user_id: coachId,
      title: 'New clinic client',
      title_ar: 'عميل عيادة جديد',
      body: `${full_name} submitted their details.`,
      body_ar: `${full_name} أرسل بياناته.`,
      type: 'system',
      data: { url: newId ? `/nutritionist/clinic-clients/${newId}` : '/nutritionist/clinic-clients' },
      is_read: false,
    } as never)
  }

  return json({ ok: true })
}
