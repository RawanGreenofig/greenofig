import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * /api/nutritionist/clinic-clients
 *
 * GET  → list the calling coach's walk-in (clinic) clients, sorted by
 *        most recent. Each row carries a `last_visit_at` and
 *        `total_visits` rollup so the dashboard can render without a
 *        second query.
 * POST → create a new walk-in. Required: full_name. Optional: phone,
 *        email, date_of_birth, gender, notes.
 *
 * Both require a nutritionist or admin session. The coach can only
 * see/create rows owned by `coach_id = auth.uid()` thanks to RLS;
 * admins see everyone.
 */

interface CreateBody {
  full_name?: string
  phone?: string | null
  email?: string | null
  date_of_birth?: string | null
  start_date?: string | null
  end_date?: string | null
  insured?: boolean
  insurance_provider?: string | null
  gender?: string | null
  notes?: string | null
}

export const GET = withNutritionistOrAdmin(
  async (_req: NextRequest, ctx: AuthedContext) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Admins see all walk-ins; coaches see only their own. We scope
    // server-side rather than trusting RLS alone because the service
    // role bypasses RLS.
    const baseQuery = service
      .from('clinic_clients')
      .select(
        'id, coach_id, full_name, phone, email, date_of_birth, start_date, end_date, insured, insurance_provider, gender, notes, is_active, source, created_at, updated_at',
      )
      .order('updated_at', { ascending: false })
      .limit(500)
    const { data: rows } =
      ctx.profile.role === 'admin'
        ? await baseQuery
        : await baseQuery.eq('coach_id', ctx.userId)

    type Row = {
      id: string
      coach_id: string
      full_name: string
      phone: string | null
      email: string | null
      date_of_birth: string | null
      gender: string | null
      notes: string | null
      is_active: boolean
      created_at: string
      updated_at: string
    }
    const list = (rows as Row[] | null) ?? []
    if (list.length === 0) return json({ clients: [] })

    // Bulk fetch visit counts in one query — cheaper than per-row.
    const ids = list.map((r) => r.id)
    const { data: visits } = await service
      .from('bookings')
      .select('clinic_client_id, scheduled_at')
      .in('clinic_client_id', ids)
    type VRow = { clinic_client_id: string; scheduled_at: string }
    const visitsByClient = new Map<
      string,
      { total: number; last: string | null }
    >()
    for (const v of (visits as VRow[] | null) ?? []) {
      const cur = visitsByClient.get(v.clinic_client_id) ?? {
        total: 0,
        last: null,
      }
      cur.total += 1
      if (!cur.last || v.scheduled_at > cur.last) cur.last = v.scheduled_at
      visitsByClient.set(v.clinic_client_id, cur)
    }

    return json({
      clients: list.map((r) => {
        const v = visitsByClient.get(r.id)
        return {
          ...r,
          total_visits: v?.total ?? 0,
          last_visit_at: v?.last ?? null,
        }
      }),
    })
  },
)

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: CreateBody
    try {
      body = (await req.json()) as CreateBody
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const fullName = (body.full_name ?? '').trim()
    if (!fullName) return badRequest('full_name is required.')
    if (fullName.length > 200) {
      return badRequest('full_name is too long.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data, error } = await service
      .from('clinic_clients')
      .insert({
        coach_id: ctx.userId,
        full_name: fullName,
        phone: body.phone?.trim() || null,
        email: body.email?.trim() || null,
        date_of_birth: body.date_of_birth || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        insured: body.insured === true,
        insurance_provider: body.insurance_provider?.trim() || null,
        gender: body.gender?.trim() || null,
        notes: body.notes?.trim() || null,
        source: 'manual',
      } as never)
      .select('id')
      .maybeSingle()

    if (error) return badRequest(error.message)
    return json({ id: (data as { id?: string } | null)?.id })
  },
)
