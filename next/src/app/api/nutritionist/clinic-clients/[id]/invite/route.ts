import type { NextRequest } from 'next/server'
import crypto from 'crypto'
import { withNutritionistOrAdmin, type AuthedContext } from '@/lib/api/auth'
import { badRequest, forbidden, json, notFound, serviceUnavailable } from '@/lib/api/response'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/nutritionist/clinic-clients/[id]/invite
 *
 * Mints a fresh, single-use, expiring invite token for the walk-in
 * client's /clinic-link claim flow. Only the SHA-256 hash is stored; the
 * raw token is returned once and lives only in the URL the coach shares.
 * Generating a new token invalidates any previously shared link.
 */
const TOKEN_TTL_DAYS = 14

export const POST = withNutritionistOrAdmin<{ id: string }>(
  async (_req: NextRequest, ctx: AuthedContext, { params }) => {
    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    const { data } = await service
      .from('clinic_clients')
      .select('id, coach_id, user_id')
      .eq('id', params.id)
      .maybeSingle()
    const cc = data as { id: string; coach_id: string; user_id: string | null } | null
    if (!cc) return notFound('Client not found.')
    if (ctx.profile.role !== 'admin' && cc.coach_id !== ctx.userId) return forbidden()
    if (cc.user_id) return badRequest('This client is already connected to an account.')

    const raw = crypto.randomBytes(24).toString('base64url')
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000).toISOString()

    const { error } = await service
      .from('clinic_clients')
      .update({ invite_token_hash: hash, invite_token_expires_at: expiresAt } as never)
      .eq('id', cc.id)
    if (error) return badRequest(error.message)

    return json({ token: raw, expiresAt })
  },
)
