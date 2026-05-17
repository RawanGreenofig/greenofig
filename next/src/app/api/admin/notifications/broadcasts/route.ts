import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/admin/notifications/broadcasts
 *
 * Returns the last 50 broadcast notifications sent via
 * /api/notifications/send. Source is `audit_log` (each broadcast
 * writes one `notifications.broadcast` audit row whose new_value
 * holds title/audience/inserted/pushSent/pushFailed). We don't keep
 * a separate `broadcasts` table — one row per broadcast in audit_log
 * is already canonical, and querying it here keeps the source of
 * truth singular.
 *
 * Response: { broadcasts: BroadcastHistory[] }
 */

interface BroadcastHistory {
  id: string
  title: string
  audience: 'all' | 'free' | 'basic' | 'premium' | 'vip' | 'nutritionist' | 'admin'
  channels: ('inApp' | 'email' | 'push')[]
  sentISO: string
  recipients: number
}

interface AuditRow {
  id: string
  created_at: string
  new_value: unknown
}

/** Map the audience-shaped string written by /api/notifications/send
 *  back into the BroadcastHistory.audience enum used by the UI. */
function parseAudience(s: unknown): BroadcastHistory['audience'] {
  if (typeof s !== 'string') return 'all'
  if (s === 'all') return 'all'
  if (s.startsWith('tiers:')) {
    const first = s.slice('tiers:'.length).split(',')[0]
    if (first === 'free' || first === 'basic' || first === 'premium' || first === 'vip') {
      return first
    }
  }
  return 'all'
}

export const GET = withAdmin(async (_req: NextRequest, _ctx: AuthedContext) => {
  void _req
  void _ctx
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data } = await service
    .from('audit_log')
    .select('id, created_at, new_value')
    .eq('action', 'notifications.broadcast')
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data as AuditRow[] | null) ?? []
  const broadcasts: BroadcastHistory[] = rows.map((r) => {
    const v = (r.new_value ?? {}) as {
      title?: string
      audience?: string
      inserted?: number
      pushSent?: number
    }
    return {
      id: r.id,
      title: v.title ?? '(untitled)',
      audience: parseAudience(v.audience),
      // The send route doesn't persist which channels were enabled
      // — every broadcast goes through every available channel
      // (in-app row insert + web-push + FCM) so the safe rendering
      // is "all three were attempted." If you want per-broadcast
      // channel granularity later, capture it in new_value on send.
      channels: ['inApp', 'email', 'push'],
      sentISO: r.created_at,
      recipients: v.inserted ?? 0,
    }
  })

  return json({ broadcasts })
})
