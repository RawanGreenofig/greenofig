import type { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * GET /api/bookings/availability?nutritionist_id=...&date=YYYY-MM-DD&duration_min=30
 *
 * Returns the slots the customer can pick on that date for that
 * nutritionist. A slot is "open" when it sits inside the nutritionist's
 * working hours for that day-of-week, isn't blocked by a time-off entry,
 * and doesn't overlap an existing non-cancelled booking. The full
 * `duration_min` plus the schedule's `buffer_min` must fit before the
 * day's `end_time` for the slot to be returned.
 *
 * Response:
 *   { slots: ["09:00", "09:30", ...] }   // each slot is local "HH:MM"
 *
 * Times are interpreted in the local timezone of the server / caller —
 * MVP assumption that nutritionist + customer share a zone.
 */
export const GET = withAuth(async (req: NextRequest) => {
  const supabase = getServerSupabase()
  if (!supabase) return serviceUnavailable('Supabase')

  const params = req.nextUrl.searchParams
  const nutritionistId = params.get('nutritionist_id')
  const dateStr = params.get('date')
  const durationMin = Number(params.get('duration_min') ?? '30')

  if (!nutritionistId || !/^[0-9a-f-]{32,}$/i.test(nutritionistId)) {
    return badRequest('nutritionist_id is required.')
  }
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return badRequest('date (YYYY-MM-DD) is required.')
  }
  if (!Number.isFinite(durationMin) || durationMin <= 0 || durationMin > 600) {
    return badRequest('duration_min must be 1..600.')
  }

  const dow = new Date(`${dateStr}T00:00:00`).getDay()
  const dayStartIso = new Date(`${dateStr}T00:00:00`).toISOString()
  const dayEndIso = new Date(`${dateStr}T23:59:59.999`).toISOString()

  type ScheduleRow = {
    is_open: boolean
    start_time: string
    end_time: string
    slot_min: number
    buffer_min: number
  }
  const { data: schedRow } = await supabase
    .from('nutritionist_schedules')
    .select('is_open, start_time, end_time, slot_min, buffer_min')
    .eq('nutritionist_id', nutritionistId)
    .eq('day_of_week', dow)
    .maybeSingle()
  const sched = schedRow as ScheduleRow | null
  if (!sched || !sched.is_open) {
    return json({ slots: [] })
  }

  type TimeOffRow = { starts_at: string; ends_at: string }
  const { data: timeOffRows } = await supabase
    .from('nutritionist_time_off')
    .select('starts_at, ends_at')
    .eq('nutritionist_id', nutritionistId)
    .lt('starts_at', dayEndIso)
    .gt('ends_at', dayStartIso)
  const timeOff = (timeOffRows as TimeOffRow[] | null) ?? []

  type BookingRow = { scheduled_at: string; duration_min: number }
  const { data: bookingRows } = await supabase
    .from('bookings')
    .select('scheduled_at, duration_min')
    .eq('nutritionist_id', nutritionistId)
    .neq('status', 'cancelled')
    .gte('scheduled_at', dayStartIso)
    .lt('scheduled_at', dayEndIso)
  const bookings = (bookingRows as BookingRow[] | null) ?? []

  const slots = computeOpenSlots({
    dateStr,
    startTime: sched.start_time,
    endTime: sched.end_time,
    slotMin: sched.slot_min,
    bufferMin: sched.buffer_min,
    durationMin,
    timeOff,
    bookings,
  })

  return json({ slots })
})

function computeOpenSlots(opts: {
  dateStr: string
  startTime: string
  endTime: string
  slotMin: number
  bufferMin: number
  durationMin: number
  timeOff: { starts_at: string; ends_at: string }[]
  bookings: { scheduled_at: string; duration_min: number }[]
}): string[] {
  const { dateStr, startTime, endTime, slotMin, bufferMin, durationMin } = opts

  const startDt = new Date(`${dateStr}T${startTime}`)
  const endDt = new Date(`${dateStr}T${endTime}`)
  const stepMs = slotMin * 60_000
  const durationMs = durationMin * 60_000
  const bufferMs = bufferMin * 60_000

  const blocks: Array<[number, number]> = []
  for (const off of opts.timeOff) {
    blocks.push([new Date(off.starts_at).getTime(), new Date(off.ends_at).getTime()])
  }
  for (const b of opts.bookings) {
    const start = new Date(b.scheduled_at).getTime()
    blocks.push([start - bufferMs, start + b.duration_min * 60_000 + bufferMs])
  }

  const out: string[] = []
  for (let t = startDt.getTime(); t + durationMs <= endDt.getTime(); t += stepMs) {
    const slotStart = t
    const slotEnd = t + durationMs
    const conflicts = blocks.some(
      ([bStart, bEnd]) => slotStart < bEnd && slotEnd > bStart,
    )
    if (!conflicts) {
      out.push(formatHm(new Date(slotStart)))
    }
  }
  return out
}

function formatHm(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}
