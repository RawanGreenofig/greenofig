import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  json,
  notFound,
  serviceUnavailable,
} from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { localDateTimeInTzToUtc } from '@/lib/timezone'
import { notifyUsers } from '@/lib/server/notify'

/**
 * POST /api/nutritionist/bookings
 *
 * Coach books a session on behalf of one of their ONLINE (account-holding)
 * clients. The customer-side /api/bookings/create books the caller as the
 * client and is tier-gated; this route is the coach-initiated counterpart —
 * no tier gate (the coach decides), and the client_id is the customer, not
 * the caller.
 *
 * Walk-in / in-clinic clients go through /api/nutritionist/clinic-bookings
 * instead (they have no auth.users row, so they carry clinic_client_id).
 *
 * Body: { client_id, type, date: 'YYYY-MM-DD', time: 'HH:MM', notes? }
 *
 * Returns:
 *   201 { booking: { id } }
 *   409 { error: 'slot_taken' }   // EXCLUDE constraint violation
 *   400 { error: '...' }          // bad payload
 *   404                            // client not found / not yours
 */

interface Body {
  client_id?: string
  type?: 'introCall' | 'followUp' | 'deepDive'
  date?: string
  time?: string
  notes?: string | null
}

const TYPES = ['introCall', 'followUp', 'deepDive'] as const

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const { client_id, type, date, time } = body
    if (!client_id || !/^[0-9a-f-]{32,}$/i.test(client_id)) {
      return badRequest('client_id is required.')
    }
    if (!type || !TYPES.includes(type)) {
      return badRequest('type must be introCall, followUp, or deepDive.')
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return badRequest('date (YYYY-MM-DD) is required.')
    }
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return badRequest('time (HH:MM) is required.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    // Confirm the target is a customer this coach is allowed to book for.
    // Employee coaches can only book their assigned clients; the head coach
    // and admins can book any customer.
    type ClientRow = { role: string; assigned_coach_id: string | null }
    const { data: clientRow } = await service
      .from('profiles')
      .select('role, assigned_coach_id')
      .eq('id', client_id)
      .maybeSingle()
    const client = clientRow as ClientRow | null
    if (!client || client.role !== 'user') {
      return notFound('Client not found.')
    }

    const isAdmin = ctx.profile.role === 'admin'
    if (!isAdmin) {
      const { data: meRow } = await service
        .from('profiles')
        .select('is_head_coach')
        .eq('id', ctx.userId)
        .maybeSingle()
      const isHeadCoach = !!(meRow as { is_head_coach?: boolean } | null)
        ?.is_head_coach
      if (!isHeadCoach && client.assigned_coach_id !== ctx.userId) {
        return notFound('Client not found.')
      }
    }

    // Interpret date + time in the coach's own timezone, matching how the
    // online picker stores the absolute instant.
    const { data: nutProfile } = await service
      .from('profiles')
      .select('timezone')
      .eq('id', ctx.userId)
      .maybeSingle()
    const tz = (nutProfile as { timezone: string | null } | null)?.timezone || 'Asia/Amman'

    let scheduledAtIso: string
    try {
      scheduledAtIso = localDateTimeInTzToUtc(date, time, tz).toISOString()
    } catch {
      return badRequest('Could not interpret date/time in coach timezone.')
    }

    const durationMin = type === 'introCall' ? 20 : type === 'followUp' ? 30 : 60
    const notes =
      typeof body.notes === 'string' && body.notes.trim().length
        ? body.notes.trim().slice(0, 1000)
        : null

    const { data: row, error } = await service
      .from('bookings')
      .insert({
        client_id,
        clinic_client_id: null,
        nutritionist_id: ctx.userId,
        type,
        scheduled_at: scheduledAtIso,
        duration_min: durationMin,
        status: 'scheduled',
        notes,
      } as never)
      .select('id')
      .maybeSingle()

    if (error) {
      if ((error as { code?: string }).code === '23P01') {
        return json({ error: 'slot_taken' }, 409)
      }
      return badRequest(error.message)
    }

    const id = (row as { id?: string } | null)?.id

    // Notify the online client their coach booked a session (client_id is
    // their own user id). Mirrors the walk-in booking notification.
    const when = new Date(scheduledAtIso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    await notifyUsers({
      userIds: [client_id],
      title: 'Session booked 📅',
      titleAr: 'تم حجز جلسة 📅',
      body: `Your coach scheduled a session: ${when}.`,
      bodyAr: `حجزت لك مدربتك جلسة: ${when}.`,
      type: 'system',
      url: '/dashboard/bookings',
    })

    return json({ booking: { id } }, 201)
  },
)
