import type { NextRequest } from 'next/server'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'
import type {
  Booking,
  Order,
  Profile,
  UserTier,
} from '@/lib/supabase/types'

/**
 * POST /api/openclaw/webhook
 *
 * Secret-gated entry point for OpenClaw — Nutritionist Coach Rawan's WhatsApp/Telegram
 * AI assistant. Validates `x-openclaw-secret` against the
 * OPENCLAW_WEBHOOK_SECRET env var. Body is JSON; the response is plain
 * text so OpenClaw can read it back to her in chat without parsing.
 *
 * Body: { action: string, params?: object, requestedBy?: string }
 *
 * Supported actions (see docs/OPENCLAW_SETUP.md):
 *   - get_at_risk_clients
 *   - get_platform_stats
 *   - get_todays_bookings
 *   - get_revenue_summary       (params: { period: 'week'|'month'|'year' })
 *   - send_reminder              (params: { targetTiers?, message, messageAr? })
 *   - send_broadcast             (params: { message, messageAr? })
 *   - toggle_store               (params: { enabled: boolean })
 *   - export_client_data         (params: { format: 'csv'|'xlsx' })
 *
 * Every action that mutates data is audited with actor_id NULL and
 * `actor_role = null`; the action label and payload identify it as
 * an OpenClaw event in the admin audit-log filter.
 */

const OPENCLAW_ACTOR_LABEL = 'openclaw'

interface OpenClawBody {
  action: string
  params?: Record<string, unknown>
  requestedBy?: string
}

export async function POST(req: NextRequest) {
  // ── 1. Auth (header secret) ──
  const expected = process.env.OPENCLAW_WEBHOOK_SECRET
  if (!expected) {
    return text('OpenClaw is not configured on this environment.', 503)
  }
  const provided = req.headers.get('x-openclaw-secret')
  if (!provided || provided !== expected) {
    return text('Unauthorized.', 401)
  }

  // ── 2. Body parse ──
  let body: OpenClawBody
  try {
    body = (await req.json()) as OpenClawBody
  } catch {
    return text('Invalid JSON body.', 400)
  }
  const action = body.action?.trim()
  if (!action) return text('action is required.', 400)
  const params = body.params ?? {}
  const requestedBy = body.requestedBy ?? 'Nutritionist Coach Rawan'

  const service = getServiceSupabase()
  if (!service) return text('Supabase is not configured.', 503)

  const ip = ipFromRequest(req)
  const auditBase = {
    actorId: null,
    actorRole: null,
    resourceType: OPENCLAW_ACTOR_LABEL,
    ip,
  } as const

  try {
    switch (action) {
      case 'get_at_risk_clients': {
        const reply = await getAtRiskClients(service)
        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy },
        })
        return text(reply)
      }

      case 'get_platform_stats': {
        const reply = await getPlatformStats(service)
        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy },
        })
        return text(reply)
      }

      case 'get_todays_bookings': {
        const reply = await getTodaysBookings(service)
        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy },
        })
        return text(reply)
      }

      case 'get_revenue_summary': {
        const period =
          (params.period as 'week' | 'month' | 'year') ?? 'month'
        const reply = await getRevenueSummary(service, period)
        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy, period },
        })
        return text(reply)
      }

      case 'send_reminder': {
        const message = String(params.message ?? '').trim()
        const messageAr = String(params.messageAr ?? '').trim()
        const targetTiers = (params.targetTiers as UserTier[]) ?? [
          'basic',
          'premium',
          'vip',
        ]
        if (!message) return text('message is required for send_reminder.', 400)

        const sent = await broadcast(service, {
          tiers: targetTiers,
          title: 'A note from Nutritionist Coach Rawan',
          body: message,
          bodyAr: messageAr,
          category: 'reminder',
        })

        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy, sent, tiers: targetTiers },
        })
        return text(`Sent reminder to ${sent} client${sent === 1 ? '' : 's'}.`)
      }

      case 'send_broadcast': {
        const message = String(params.message ?? '').trim()
        const messageAr = String(params.messageAr ?? '').trim()
        if (!message) return text('message is required for send_broadcast.', 400)

        const sent = await broadcast(service, {
          tiers: null,
          title: 'A note from Nutritionist Coach Rawan',
          body: message,
          bodyAr: messageAr,
          category: 'broadcast',
        })

        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy, sent },
        })
        return text(`Broadcast sent to ${sent} user${sent === 1 ? '' : 's'}.`)
      }

      case 'toggle_store': {
        const enabled = !!params.enabled
        await service
          .from('platform_settings')
          .upsert(
            { key: 'store_enabled', value: enabled } as never,
            { onConflict: 'key' },
          )
        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          resourceId: 'store_enabled',
          oldValue: { value: !enabled },
          newValue: { value: enabled, requestedBy },
        })
        return text(`Store is now ${enabled ? 'LIVE' : 'OFFLINE'}.`)
      }

      case 'export_client_data': {
        const format =
          (params.format as 'csv' | 'xlsx') === 'csv' ? 'csv' : 'xlsx'

        // We don't generate the file here — instead we return a hint
        // pointing at the admin export route so the file gets the proper
        // download stream (with auth + audit). OpenClaw can call /api/export/profiles
        // directly when it has admin credentials.
        await logAudit({
          action: `openclaw.${action}`,
          ...auditBase,
          newValue: { requestedBy, format },
        })
        return text(
          `Client export ready. Run: POST /api/export/profiles ` +
            `with body { "format": "${format}" } as an admin to download the file.`,
        )
      }

      default:
        return text(`Unknown action "${action}".`, 400)
    }
  } catch {
    return text('Something went wrong handling that action.', 500)
  }
}

/* ── Action implementations ─────────────────────────────────────── */

type ServiceClient = NonNullable<ReturnType<typeof getServiceSupabase>>

async function getAtRiskClients(service: ServiceClient): Promise<string> {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - 4)

  const { data } = await service
    .from('profiles')
    .select('id, full_name, last_seen_at, tier')
    .eq('role', 'user')
    .or(`last_seen_at.lte.${cutoff.toISOString()},last_seen_at.is.null`)
    .order('last_seen_at', { ascending: true, nullsFirst: true })
    .limit(20)

  const rows = (data as Pick<Profile, 'id' | 'full_name' | 'last_seen_at' | 'tier'>[] | null) ?? []
  if (rows.length === 0) {
    return 'No at-risk clients right now — everyone has logged in within the last 4 days.'
  }

  const lines = rows.map((r) => {
    const name = r.full_name?.trim() || 'Unnamed client'
    const days = r.last_seen_at
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(r.last_seen_at).getTime()) / (1000 * 60 * 60 * 24),
          ),
        )
      : null
    const inactive =
      days == null
        ? 'never logged in'
        : `no login in ${days} day${days === 1 ? '' : 's'}`
    return `• ${name} (${r.tier}) — ${inactive}`
  })

  return [
    `${rows.length} client${rows.length === 1 ? '' : 's'} need${rows.length === 1 ? 's' : ''} a check-in:`,
    ...lines,
  ].join('\n')
}

async function getPlatformStats(service: ServiceClient): Promise<string> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const fourDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4).toISOString()

  const [
    { count: totalUsers },
    { count: newWeek },
    { data: monthlyOrders },
    { count: pendingOrders },
    { count: bookingsToday },
    { count: atRisk },
  ] = await Promise.all([
    service.from('profiles').select('id', { count: 'exact', head: true }),
    service
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfWeek),
    service
      .from('orders')
      .select('total_jod')
      .gte('created_at', startOfMonth)
      .in('status', ['processing', 'shipped', 'delivered']),
    service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    service
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_at', startOfDay)
      .lt('scheduled_at', endOfDay),
    service
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'user')
      .or(`last_seen_at.lte.${fourDaysAgo},last_seen_at.is.null`),
  ])

  const revenue = ((monthlyOrders as { total_jod: number }[] | null) ?? [])
    .reduce((acc, o) => acc + (o.total_jod ?? 0), 0)

  return [
    `Greenofig snapshot:`,
    `• Total users: ${totalUsers ?? 0}`,
    `• Revenue this month: ${revenue.toFixed(2)} USD`,
    `• New signups this week: ${newWeek ?? 0}`,
    `• Pending orders: ${pendingOrders ?? 0}`,
    `• Bookings today: ${bookingsToday ?? 0}`,
    `• At-risk clients: ${atRisk ?? 0}`,
  ].join('\n')
}

async function getTodaysBookings(service: ServiceClient): Promise<string> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay)
  endOfDay.setDate(endOfDay.getDate() + 1)

  const { data } = await service
    .from('bookings')
    .select('id, scheduled_at, type, duration_min, client_id, status')
    .gte('scheduled_at', startOfDay.toISOString())
    .lt('scheduled_at', endOfDay.toISOString())
    .order('scheduled_at', { ascending: true })

  const rows = (data as Pick<Booking, 'id' | 'scheduled_at' | 'type' | 'duration_min' | 'client_id' | 'status'>[] | null) ?? []
  if (rows.length === 0) return "No bookings today — clear day."

  // Hydrate client names
  const ids = rows.map((r) => r.client_id)
  const { data: clientData } = await service
    .from('profiles')
    .select('id, full_name')
    .in('id', ids)
  const nameOf = new Map(
    ((clientData as Pick<Profile, 'id' | 'full_name'>[] | null) ?? []).map((p) => [p.id, p.full_name ?? 'Unnamed']),
  )

  const lines = rows.map((b) => {
    const time = new Date(b.scheduled_at).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const name = nameOf.get(b.client_id) ?? 'Unknown client'
    return `• ${time} — ${name} (${b.type}, ${b.duration_min}m, ${b.status})`
  })

  return [`Today's bookings (${rows.length}):`, ...lines].join('\n')
}

async function getRevenueSummary(
  service: ServiceClient,
  period: 'week' | 'month' | 'year',
): Promise<string> {
  const now = new Date()
  const since = new Date(now)
  if (period === 'week')  since.setDate(now.getDate() - 7)
  if (period === 'month') since.setMonth(now.getMonth() - 1)
  if (period === 'year')  since.setFullYear(now.getFullYear() - 1)

  const { data } = await service
    .from('orders')
    .select('total_cents, status')
    .gte('created_at', since.toISOString())

  const orders = (data as Pick<Order, 'total_cents' | 'status'>[] | null) ?? []
  const completed = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
  const total = completed.reduce((acc, o) => acc + (o.total_cents ?? 0), 0) / 100
  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const breakdown = Object.entries(byStatus)
    .map(([s, c]) => `${s}: ${c}`)
    .join(', ')

  return [
    `Revenue · last ${period}:`,
    `• Total: ${total.toFixed(2)} USD`,
    `• Orders: ${orders.length} (${breakdown || 'none'})`,
  ].join('\n')
}

async function broadcast(
  service: ServiceClient,
  args: {
    tiers: UserTier[] | null
    title: string
    body: string
    bodyAr?: string
    category: string
  },
): Promise<number> {
  let q = service.from('profiles').select('id')
  if (args.tiers) q = q.in('tier', args.tiers)
  const { data } = await q
  const ids = ((data as { id: string }[] | null) ?? []).map((r) => r.id)

  let sent = 0
  for (let i = 0; i < ids.length; i += 200) {
    const slice = ids.slice(i, i + 200)
    const rows = slice.map((id) => ({
      user_id: id,
      type: args.category,
      title: args.title,
      body: args.bodyAr ? `${args.body} | ${args.bodyAr}` : args.body,
      data: null,
      is_read: false,
    }))
    const { error } = await service.from('notifications').insert(rows as never)
    if (!error) sent += slice.length
  }
  return sent
}

/* ── Plain-text response helper ─────────────────────────────────── */

function text(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
