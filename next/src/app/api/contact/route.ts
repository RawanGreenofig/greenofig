import type { NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getSupabaseEnv } from '@/lib/supabase/env'
import type { Database } from '@/lib/supabase/types'

function getSupabaseForContact(): SupabaseClient<Database> | null {
  const service = getServiceSupabase()
  if (service) return service
  const env = getSupabaseEnv()
  if (!env) return null
  return createClient<Database>(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * POST /api/contact
 *
 * Public endpoint for the /contact form. Inserts a row into
 * public.contact_messages using the service-role key (bypasses RLS for
 * write only — read policies still apply for admin dashboard reads).
 *
 * Body:
 *   name, email, subject?, message, topic?, marketingOptIn?
 *
 * Response: { ok: true } on success.
 *
 * Light validation + obvious-bot check (honeypot field). For real
 * volume add a rate limiter / Cloudflare Turnstile here.
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: unknown
    email?: unknown
    subject?: unknown
    message?: unknown
    topic?: unknown
    marketingOptIn?: unknown
    /** Honeypot — bots fill every field, humans never see this one. */
    website?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Honeypot — bots fill every input including hidden ones
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    // Lie to the bot, return success without writing anything
    return Response.json({ ok: true })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : null
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const topicRaw = typeof body.topic === 'string' ? body.topic.trim() : 'general'
  const validTopics = ['general', 'support', 'health', 'partnership', 'feedback']
  const topic = validTopics.includes(topicRaw) ? topicRaw : 'general'
  const marketingOptIn = body.marketingOptIn === true

  if (!name || name.length > 120) {
    return Response.json({ error: 'name is required (max 120 chars)' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: 'a valid email is required' }, { status: 400 })
  }
  if (!message || message.length < 5 || message.length > 4000) {
    return Response.json(
      { error: 'message must be 5–4000 characters' },
      { status: 400 },
    )
  }

  const supabase = getSupabaseForContact()
  if (!supabase) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 240) ?? null
  const ipCountry = req.headers.get('x-vercel-ip-country') ?? null

  const { error } = await supabase.from('contact_messages').insert({
    name,
    email,
    subject,
    message,
    topic,
    marketing_opt_in: marketingOptIn,
    user_agent: userAgent,
    ip_country: ipCountry,
  } as never)

  if (error) {
    console.error('[contact] insert failed:', error)
    return Response.json({ error: 'Could not save message' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
