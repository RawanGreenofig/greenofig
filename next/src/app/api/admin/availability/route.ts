import type { NextRequest } from 'next/server'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/admin/availability
 *
 * Body: {
 *   nutritionist_id: uuid,
 *   timezone: string,
 *   schedule: [{ day_of_week: 0-6, is_open: boolean, start_time: 'HH:MM', end_time: 'HH:MM' }]
 * }
 *
 * Upserts the weekly schedule rows + updates profiles.timezone for the
 * nutritionist. Previously the page upserted directly from the browser
 * supabase client, which silently failed when RLS denied writes during
 * the brief session-restore window after refresh.
 */

interface Body {
  nutritionist_id?: string
  timezone?: string
  schedule?: {
    day_of_week?: number
    is_open?: boolean
    start_time?: string
    end_time?: string
  }[]
}

const isUuid = (s: unknown): s is string =>
  typeof s === 'string' && /^[0-9a-f-]{32,}$/i.test(s)

const isTime = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(s)

export const POST = withAdmin(async (req: NextRequest, ctx: AuthedContext) => {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return badRequest('Invalid JSON body.')
  }
  if (!isUuid(body.nutritionist_id)) {
    return badRequest('nutritionist_id is required.')
  }
  if (typeof body.timezone !== 'string' || body.timezone.length === 0) {
    return badRequest('timezone is required.')
  }
  if (!Array.isArray(body.schedule)) {
    return badRequest('schedule must be an array.')
  }

  const nutritionistId = body.nutritionist_id
  let normalised: {
    nutritionist_id: string
    day_of_week: number
    is_open: boolean
    start_time: string
    end_time: string
  }[]
  try {
    normalised = body.schedule.map((d) => {
      if (
        typeof d.day_of_week !== 'number' ||
        d.day_of_week < 0 ||
        d.day_of_week > 6 ||
        typeof d.is_open !== 'boolean' ||
        !isTime(d.start_time) ||
        !isTime(d.end_time)
      ) {
        throw new Error('invalid_day')
      }
      return {
        nutritionist_id: nutritionistId,
        day_of_week: d.day_of_week,
        is_open: d.is_open,
        start_time: d.start_time,
        end_time: d.end_time,
      }
    })
  } catch {
    return badRequest('schedule entries must include day_of_week 0-6, is_open boolean, and HH:MM start/end times.')
  }

  const service = getServiceSupabase()
  if (!service) return serviceUnavailable('Supabase service role')

  const { error: schedErr } = await service
    .from('nutritionist_schedules')
    .upsert(normalised as never, { onConflict: 'nutritionist_id,day_of_week' })
  if (schedErr) return badRequest(schedErr.message)

  const { error: tzErr } = await service
    .from('profiles')
    .update({ timezone: body.timezone } as never)
    .eq('id', nutritionistId)
  if (tzErr) return badRequest(tzErr.message)

  await logAudit({
    action: 'availability.update',
    actorId: ctx.userId,
    actorRole: 'admin',
    resourceType: 'nutritionist_schedules',
    resourceId: nutritionistId,
    newValue: { timezone: body.timezone, schedule: normalised },
    ip: ipFromRequest(req),
  })

  return json({ ok: true })
})
