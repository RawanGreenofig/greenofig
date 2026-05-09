import { withAuth } from '@/lib/api/auth'
import { json, serviceUnavailable } from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/nutritionists
 *
 * Returns the list of nutritionists customers can book with. Used by
 * the booking flow's nutritionist picker. Anyone authenticated can read
 * it — RLS already gates personal-detail columns on profiles, but the
 * fields below are safe to expose to other users.
 *
 * Response:
 *   { nutritionists: [{ id, full_name, avatar_url, headline }] }
 */
export const GET = withAuth(async () => {
  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  type Row = {
    id: string
    full_name: string | null
    avatar_url: string | null
    primary_goal: string | null
  }
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, primary_goal')
    .eq('role', 'nutritionist')
    .order('full_name', { ascending: true })

  const rows = (data as Row[] | null) ?? []
  return json({
    nutritionists: rows.map((r) => ({
      id: r.id,
      full_name: r.full_name ?? 'Nutritionist',
      avatar_url: r.avatar_url,
      headline: r.primary_goal,
    })),
  })
})
