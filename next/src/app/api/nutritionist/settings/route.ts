import type { NextRequest } from 'next/server'
import {
  withNutritionistOrAdmin,
  type AuthedContext,
} from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * The nutritionist self-service settings save. Three tabs (profile,
 * availability, sessions) each write a different shape:
 *
 *   tab = 'profile'      → profiles.full_name + medical_notes (json bag)
 *   tab = 'availability' → nutritionist_schedules upsert (7 rows / week)
 *   tab = 'sessions'     → profiles.medical_notes (json bag of pricing)
 *
 * Was direct browser supabase writes — no error handling, no audit
 * trail. The page even rendered "saved" inside the async IIFE
 * regardless of whether the await succeeded.
 *
 * The nutritionist is editing THEIR OWN profile / schedule, so the
 * server-side check is "is the caller a nutritionist or admin" rather
 * than head-coach gating. The /api/admin/availability route covers
 * admin acting on someone else's schedule.
 */

interface Body {
  tab?: 'profile' | 'availability' | 'sessions'
  displayName?: string
  title?: string
  bio?: string
  credentials?: unknown
  languages?: unknown
  specialties?: unknown
  schedule?: {
    day_of_week?: number
    is_open?: boolean
    start_time?: string
    end_time?: string
  }[]
  buffer_min?: number
  pricing?: unknown
}

const isTime = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(s)

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }
    if (body.tab !== 'profile' && body.tab !== 'availability' && body.tab !== 'sessions') {
      return badRequest('tab must be profile, availability, or sessions.')
    }

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    if (body.tab === 'availability') {
      if (!Array.isArray(body.schedule)) {
        return badRequest('schedule must be an array.')
      }
      const rows = body.schedule.map((d) => {
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
          nutritionist_id: ctx.userId,
          day_of_week: d.day_of_week,
          is_open: d.is_open,
          start_time: d.start_time,
          end_time: d.end_time,
          buffer_min: body.buffer_min ?? 0,
        }
      })
      const { error } = await service
        .from('nutritionist_schedules')
        .upsert(rows as never, { onConflict: 'nutritionist_id,day_of_week' })
      if (error) return badRequest(error.message)

      await logAudit({
        action: 'nutritionist_schedules.self_update',
        actorId: ctx.userId,
        actorRole: 'nutritionist',
        resourceType: 'nutritionist_schedules',
        resourceId: ctx.userId,
        newValue: { schedule: rows },
        ip: ipFromRequest(req),
      })
      return json({ ok: true })
    }

    // profile + sessions both end up in profiles.{full_name, medical_notes}.
    const patch: Record<string, unknown> = {}
    if (body.tab === 'profile') {
      if (typeof body.displayName === 'string') patch.full_name = body.displayName
      patch.medical_notes = JSON.stringify({
        title: body.title ?? '',
        bio: body.bio ?? '',
        credentials: body.credentials ?? [],
        languages: body.languages ?? [],
        specialties: body.specialties ?? [],
      })
    }
    if (body.tab === 'sessions') {
      patch.medical_notes = JSON.stringify({ pricing: body.pricing ?? {} })
    }

    if (Object.keys(patch).length === 0) {
      return badRequest('Nothing to save.')
    }

    const { error } = await service
      .from('profiles')
      .update(patch as never)
      .eq('id', ctx.userId)
    if (error) return badRequest(error.message)

    await logAudit({
      action: `profiles.self_update.${body.tab}`,
      actorId: ctx.userId,
      actorRole: 'nutritionist',
      resourceType: 'profiles',
      resourceId: ctx.userId,
      newValue: patch,
      ip: ipFromRequest(req),
    })

    return json({ ok: true })
  },
)
