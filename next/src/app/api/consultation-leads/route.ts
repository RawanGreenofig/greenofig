import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { sendThankYouEbook } from '@/lib/email/thank-you-ebook'

/**
 * Get the most-privileged Supabase client we have. Prefers the service
 * role (so we can update thank_you_sent later), falls back to the
 * anon client for the insert — public.consultation_leads has an anon-
 * insert RLS policy. Returns null only if Supabase isn't configured
 * at all (no URL / anon key).
 */
function getSupabaseForLeads() {
  const service = getServiceSupabase()
  if (service) return { client: service, hasServiceRole: true as const }
  const env = getSupabaseEnv()
  if (!env) return null
  return {
    client: createClient(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    hasServiceRole: false as const,
  }
}

/**
 * POST /api/consultation-leads
 *
 * Receives the 15-question health assessment from the homepage Book
 * Consultation flow plus the user's contact info. Saves the lead to
 * public.consultation_leads, then triggers a thank-you email with the
 * free ebook link from health@greenofig.com.
 *
 * Body:
 *   fullName, email, phone?, country?, quizAnswers (object), website (honeypot)
 *
 * Response: { ok: true, id, ebookUrl }
 *
 * Email sending is fire-and-forget (we don't fail the request if email
 * fails — the lead is captured and admins can resend manually). To enable
 * real email delivery set RESEND_API_KEY in Vercel; without it the route
 * still saves the lead and logs the would-be email payload.
 */
export async function POST(req: NextRequest) {
  let body: {
    fullName?: unknown
    email?: unknown
    phone?: unknown
    country?: unknown
    quizAnswers?: unknown
    website?: unknown
    utmSource?: unknown
    utmCampaign?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Honeypot — bots fill every field
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    return Response.json({ ok: true, id: null })
  }

  const fullName =
    typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phone =
    typeof body.phone === 'string' && body.phone.trim().length
      ? body.phone.trim()
      : null
  const country =
    typeof body.country === 'string' && body.country.trim().length
      ? body.country.trim()
      : null
  const quizAnswers =
    body.quizAnswers && typeof body.quizAnswers === 'object'
      ? (body.quizAnswers as Record<string, unknown>)
      : {}

  if (!fullName || fullName.length > 120) {
    return Response.json(
      { error: 'fullName is required (max 120 chars)' },
      { status: 400 },
    )
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json(
      { error: 'a valid email is required' },
      { status: 400 },
    )
  }

  const sb = getSupabaseForLeads()
  if (!sb) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const supabase = sb.client

  // Pull primary_goal out of the quiz so admins can filter by goal
  // without parsing the JSONB blob. Fall back to null if missing.
  const primaryGoal =
    typeof quizAnswers.primaryGoal === 'string'
      ? (quizAnswers.primaryGoal as string)
      : null

  const userAgent = req.headers.get('user-agent')?.slice(0, 240) ?? null
  const ipCountry = req.headers.get('x-vercel-ip-country') ?? null

  const utmSource =
    typeof body.utmSource === 'string' ? body.utmSource.slice(0, 80) : null
  const utmCampaign =
    typeof body.utmCampaign === 'string'
      ? body.utmCampaign.slice(0, 80)
      : null

  const { data, error } = await supabase
    .from('consultation_leads')
    .insert({
      full_name: fullName,
      email,
      phone,
      country,
      quiz_answers: quizAnswers,
      primary_goal: primaryGoal,
      user_agent: userAgent,
      ip_country: ipCountry,
      utm_source: utmSource,
      utm_campaign: utmCampaign,
    } as never)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[consultation-leads] insert failed:', error)
    return Response.json({ error: 'Could not save lead' }, { status: 500 })
  }

  const leadId = data.id as string
  const ebookUrl = '/ebooks/greenofig-healthy-habits.pdf'

  // Fire-and-forget the thank-you email; if it fails the lead still
  // exists and admin can resend. Only flag thank_you_sent / ebook_sent
  // when we actually have service-role access (anon client cannot UPDATE
  // because the RLS policy only grants INSERT to anon).
  void sendThankYouEbook({
    to: email,
    name: fullName,
    ebookUrl,
  })
    .then(async (sent) => {
      if (sent && sb.hasServiceRole) {
        await supabase
          .from('consultation_leads')
          .update({ thank_you_sent: true, ebook_sent: true } as never)
          .eq('id', leadId)
      }
    })
    .catch((err) => {
      console.error('[consultation-leads] email failed:', err)
    })

  return Response.json({ ok: true, id: leadId, ebookUrl })
}
