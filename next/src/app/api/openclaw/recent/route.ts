import { withAdmin } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/openclaw/recent
 *
 * Returns the last 10 audit_log rows whose action begins with `openclaw.`.
 * Powers the admin OpenClaw page's "Recent actions" card.
 */
export const GET = withAdmin(async () => {
  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { data } = await service
    .from('audit_log')
    .select('id, action, new_value, created_at')
    .like('action', 'openclaw.%')
    .order('created_at', { ascending: false })
    .limit(10)

  return json({ rows: data ?? [] })
})
