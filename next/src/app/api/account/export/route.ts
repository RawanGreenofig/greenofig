import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import { serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/account/export
 *
 * Returns a JSON dump of the user's owned rows for download. Replaces
 * the previously-stub "Export your data" button in Settings → Account
 * which had no handler.
 *
 * Scope is deliberately wide so the user can take their data out:
 *   - profile (one row)
 *   - nutrition_logs
 *   - progress_entries
 *   - bookings
 *   - orders
 *   - posts (their own)
 *   - notifications
 *
 * NOT included: payment data (use Stripe portal), other users'
 * messages, AI assistant transcripts (separate retention rules apply).
 * If you need those, request them via help@greenofig.com.
 *
 * Response is a single JSON document — content-type
 * application/json with a Content-Disposition that triggers a
 * "greenofig-export-<userId>.json" download in the browser.
 */
export const GET = withAuth(async (_req: NextRequest, ctx: AuthedContext) => {
  const supabase = getServiceSupabase()
  if (!supabase) return serviceUnavailable('Supabase service role')

  const [
    profileRow,
    logs,
    progress,
    bookings,
    orders,
    posts,
    notifs,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', ctx.userId).maybeSingle(),
    supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('logged_at', { ascending: false })
      .limit(10000),
    supabase
      .from('progress_entries')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('recorded_at', { ascending: false })
      .limit(10000),
    supabase
      .from('bookings')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('starts_at', { ascending: false })
      .limit(1000),
    supabase
      .from('orders')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('posts')
      .select('*')
      .eq('author_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const body = {
    exported_at: new Date().toISOString(),
    user_id: ctx.userId,
    email: ctx.email,
    profile: profileRow.data ?? null,
    nutrition_logs: logs.data ?? [],
    progress_entries: progress.data ?? [],
    bookings: bookings.data ?? [],
    orders: orders.data ?? [],
    posts: posts.data ?? [],
    notifications: notifs.data ?? [],
  }

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="greenofig-export-${ctx.userId.slice(0, 8)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
})
