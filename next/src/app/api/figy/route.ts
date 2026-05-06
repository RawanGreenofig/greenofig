import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * /api/figy
 *
 * Read-only window into Greenofig data for the OpenClaw "Figy" skill.
 * Authenticated by a static header secret (`x-openclaw-secret`) that
 * matches OPENCLAW_WEBHOOK_SECRET. Uses the Supabase service-role key
 * server-side, so RLS is bypassed — only ever return aggregates / safe
 * fields here, never raw PII like phone numbers, addresses, or notes.
 *
 * Actions:
 *   - GET ?action=summary     → user totals + tier breakdown + next 10 bookings
 *   - GET ?action=messages    → 20 most recent messages
 *   - GET ?action=bookings    → next 20 upcoming bookings with client tier
 *   - GET ?action=new-users   → profiles created in the last 7 days
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function serviceUnavailable() {
  return NextResponse.json(
    { error: 'Service not configured' },
    { status: 503 },
  )
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-openclaw-secret')
  if (!secret || secret !== process.env.OPENCLAW_WEBHOOK_SECRET) {
    return unauthorized()
  }

  if (!SUPABASE_URL || !SERVICE_KEY) return serviceUnavailable()

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const action = req.nextUrl.searchParams.get('action')

  /* ── summary ─────────────────────────────────────────────────── */
  if (action === 'summary') {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, tier, role, created_at')
      .order('created_at', { ascending: false })
    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message },
        { status: 500 },
      )
    }

    type ProfileRow = {
      id: string
      full_name: string | null
      tier: 'free' | 'basic' | 'premium' | 'vip'
      role: 'user' | 'nutritionist' | 'admin'
      created_at: string
    }
    const rows = (profiles as ProfileRow[] | null) ?? []

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTodayMs = startOfToday.getTime()

    const total = rows.length
    const newToday = rows.filter(
      (p) => new Date(p.created_at).getTime() >= startOfTodayMs,
    ).length

    const byTier = {
      free: rows.filter((p) => p.tier === 'free').length,
      basic: rows.filter((p) => p.tier === 'basic').length,
      premium: rows.filter((p) => p.tier === 'premium').length,
      vip: rows.filter((p) => p.tier === 'vip').length,
    }

    const { data: bookings } = await supabase
      .from('bookings')
      .select(
        'id, user_id, status, scheduled_at, type, duration_minutes, client:profiles!user_id(full_name, tier)',
      )
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10)

    return NextResponse.json({
      action: 'summary',
      users: { total, newToday, byTier },
      upcomingBookings: bookings ?? [],
    })
  }

  /* ── messages ────────────────────────────────────────────────── */
  if (action === 'messages') {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(
        'id, body, read, created_at, conversation_id, sender:profiles!sender_id(full_name, tier)',
      )
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ action: 'messages', messages: messages ?? [] })
  }

  /* ── bookings ────────────────────────────────────────────────── */
  if (action === 'bookings') {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(
        'id, user_id, status, scheduled_at, type, duration_minutes, amount_cents, client:profiles!user_id(full_name, tier)',
      )
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ action: 'bookings', bookings: bookings ?? [] })
  }

  /* ── new-users ───────────────────────────────────────────────── */
  if (action === 'new-users') {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: users, error } = await supabase
      .from('profiles')
      .select('full_name, tier, role, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ action: 'new-users', users: users ?? [] })
  }

  return NextResponse.json(
    { error: 'Unknown action', allowed: ['summary', 'messages', 'bookings', 'new-users'] },
    { status: 400 },
  )
}
