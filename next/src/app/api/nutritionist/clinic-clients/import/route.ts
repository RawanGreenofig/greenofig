import type { NextRequest } from 'next/server'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, json, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'
import { sanitizeParsed, type ParsedClient } from '@/lib/clinic-import'

/**
 * /api/nutritionist/clinic-clients/import
 *
 * POST { rows: ParsedClient[], mode: 'add' | 'replace' }
 *
 * Bulk-create walk-in clinic clients owned by the calling coach.
 *   - 'add'     → always insert a new row.
 *   - 'replace' → if a client of this coach already has the same phone,
 *                 UPDATE it in place (fill/overwrite fields); otherwise
 *                 insert. Phone is the natural key for walk-ins.
 *
 * Returns per-batch counts. Nutritionist or admin only; rows are always
 * stamped coach_id = the caller, so a coach can only import into their
 * own book.
 */

interface Body {
  rows?: unknown
  mode?: 'add' | 'replace'
}

export const POST = withNutritionistOrAdmin(
  async (req: NextRequest, ctx: AuthedContext) => {
    let body: Body
    try {
      body = (await req.json()) as Body
    } catch {
      return badRequest('Invalid JSON body.')
    }

    const rows: ParsedClient[] = sanitizeParsed(body.rows)
    const mode = body.mode === 'replace' ? 'replace' : 'add'
    if (rows.length === 0) return badRequest('No valid clients to import (each needs a name).')

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    let added = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    for (const r of rows) {
      const fields = {
        full_name: r.full_name,
        phone: r.phone,
        email: r.email,
        date_of_birth: r.date_of_birth,
        gender: r.gender,
        notes: r.notes,
      }

      // Replace mode: match an existing walk-in of this coach by phone.
      if (mode === 'replace' && r.phone) {
        const { data: existing } = await service
          .from('clinic_clients')
          .select('id')
          .eq('coach_id', ctx.userId)
          .eq('phone', r.phone)
          .limit(1)
          .maybeSingle()
        const existingId = (existing as { id?: string } | null)?.id
        if (existingId) {
          const { error } = await service
            .from('clinic_clients')
            .update({ ...fields, updated_at: new Date().toISOString() } as never)
            .eq('id', existingId)
          if (error) {
            skipped++
            errors.push(`${r.full_name}: ${error.message}`)
          } else {
            updated++
          }
          continue
        }
      }

      const { error } = await service
        .from('clinic_clients')
        .insert({ coach_id: ctx.userId, ...fields } as never)
      if (error) {
        skipped++
        errors.push(`${r.full_name}: ${error.message}`)
      } else {
        added++
      }
    }

    return json({ added, updated, skipped, errors: errors.slice(0, 10) })
  },
)
