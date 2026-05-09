import type { NextRequest } from 'next/server'
import { withAuth, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  json,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'
import { localDateTimeInTzToUtc } from '@/lib/timezone'

/**
 * POST /api/bookings/create
 *
 * Body: { nutritionist_id, type, date: 'YYYY-MM-DD', time: 'HH:MM', notes?: string }
 *
 * Inserts a booking, interpreting `date + time` in the *nutritionist's*
 * timezone (read from profiles.timezone). The customer-side picker
 * displays slots in nutritionist-local time so a booking at "09:00" is
 * always the same absolute instant regardless of where the customer is
 * sitting.
 *
 * Returns:
 *   201 { booking: { id } }
 *   409 { error: 'slot_taken' }       // EXCLUDE constraint violation
 *   400 { error: 'invalid_*' }        // bad payload / no schedule
 *   503                                // supabase unavailable
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthedContext) => {
  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  let body: {
    nutritionist_id?: string
    type?: 'introCall' | 'followUp' | 'deepDive'
    date?: string
    time?: string
    notes?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const { nutritionist_id, type, date, time } = body
  if (!nutritionist_id || !/^[0-9a-f-]{32,}$/i.test(nutritionist_id)) {
    return badRequest('nutritionist_id is required.')
  }
  if (!type || !['introCall', 'followUp', 'deepDive'].includes(type)) {
    return badRequest('type must be introCall, followUp, or deepDive.')
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return badRequest('date (YYYY-MM-DD) is required.')
  }
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return badRequest('time (HH:MM) is required.')
  }

  const durationMin = type === 'introCall' ? 20 : type === 'followUp' ? 30 : 60

  // Find the nutritionist's working timezone. Default to Asia/Amman if
  // the column is missing (migration 009 not yet applied).
  type ProfileRow = { timezone: string | null }
  const { data: nutProfile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', nutritionist_id)
    .maybeSingle()
  const tz = (nutProfile as ProfileRow | null)?.timezone || 'Asia/Amman'

  let scheduledAtIso: string
  try {
    scheduledAtIso = localDateTimeInTzToUtc(date, time, tz).toISOString()
  } catch {
    return badRequest('Could not interpret date/time in nutritionist timezone.')
  }

  const notes =
    typeof body.notes === 'string' && body.notes.trim().length
      ? body.notes.trim().slice(0, 1000)
      : null

  const { data: row, error } = await supabase
    .from('bookings')
    .insert({
      client_id: ctx.userId,
      nutritionist_id,
      type,
      scheduled_at: scheduledAtIso,
      duration_min: durationMin,
      status: 'scheduled',
      notes,
    } as never)
    .select('id')
    .maybeSingle()

  if (error) {
    const code = (error as { code?: string }).code
    if (code === '23P01') {
      return json({ error: 'slot_taken' }, 409)
    }
    console.error('[bookings/create] insert failed:', error)
    return internalError()
  }

  const id = (row as { id?: string } | null)?.id
  if (!id) return internalError()

  return json({ booking: { id } }, 201)
})
