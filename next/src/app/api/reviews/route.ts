import type { NextRequest } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServerSupabase } from '@/lib/supabase/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import { getSupabaseEnv } from '@/lib/supabase/env'
import type { Database } from '@/lib/supabase/types'

/**
 * GET /api/reviews — list approved reviews for public display.
 * Query params: limit (default 50, max 200), rating (1-5 to filter)
 *
 * POST /api/reviews — authenticated users submit a new review.
 * Body: { rating, title?, body, photoPaths? }
 * Returns: { ok: true, id }
 */

interface ReviewRow {
  id: string
  user_id: string
  rating: number
  title: string | null
  body: string
  photo_paths: string[]
  status: 'pending' | 'approved' | 'rejected' | 'flagged'
  auto_themes: string[]
  helpful_count: number
  reply_text: string | null
  reply_at: string | null
  created_at: string
  // Author info joined in
  author_name?: string
  author_initials?: string
}

function getReadClient(): SupabaseClient<Database> | null {
  // Public read — anon client is enough thanks to RLS policy on
  // status='approved'. Fall back to service if anon env missing.
  const env = getSupabaseEnv()
  if (env) {
    return createClient<Database>(env.url, env.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return getServiceSupabase()
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 1),
    200,
  )
  const ratingParam = url.searchParams.get('rating')
  const rating =
    ratingParam && /^[1-5]$/.test(ratingParam) ? parseInt(ratingParam, 10) : null

  const supabase = getReadClient()
  if (!supabase) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }

  let q = supabase
    .from('reviews')
    .select(
      'id, user_id, rating, title, body, photo_paths, auto_themes, helpful_count, reply_text, reply_at, created_at',
    )
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (rating !== null) q = q.eq('rating', rating)

  const { data, error } = await q
  if (error) {
    console.error('[reviews] read failed:', error)
    return Response.json({ error: 'Could not load reviews' }, { status: 500 })
  }

  // Hydrate author display info from profiles in a second query (RLS on
  // profiles already restricts what's exposed)
  const reviews = (data ?? []) as ReviewRow[]
  const userIds = Array.from(new Set(reviews.map((r) => r.user_id)))
  const authorById = new Map<string, { name: string; initials: string }>()
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    type ProfRow = { id: string; full_name: string | null }
    for (const p of (profs as ProfRow[] | null) ?? []) {
      const name = p.full_name?.trim() || 'Greenofig member'
      const initials = name
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
      authorById.set(p.id, { name, initials })
    }
  }

  // Build a public photo URL for each photo path so the client can
  // <img src> directly without re-deriving the bucket prefix.
  const env = getSupabaseEnv()
  const baseUrl = env
    ? `${env.url.replace(/\/$/, '')}/storage/v1/object/public/review-photos/`
    : ''

  const out = reviews.map((r) => {
    const author = authorById.get(r.user_id) ?? {
      name: 'Greenofig member',
      initials: 'GM',
    }
    return {
      ...r,
      author_name: author.name,
      author_initials: author.initials,
      photo_urls: r.photo_paths.map((p) => baseUrl + p),
    }
  })

  return Response.json({ reviews: out })
}

export async function POST(req: NextRequest) {
  const ssb = getServerSupabase()
  if (!ssb) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const {
    data: { user },
  } = await ssb.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Sign in required' }, { status: 401 })
  }

  let body: {
    rating?: unknown
    title?: unknown
    body?: unknown
    photoPaths?: unknown
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rating = typeof body.rating === 'number' ? body.rating : NaN
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: 'rating must be an integer 1-5' },
      { status: 400 },
    )
  }
  const title =
    typeof body.title === 'string' && body.title.trim().length
      ? body.title.trim().slice(0, 200)
      : null
  const reviewBody =
    typeof body.body === 'string' ? body.body.trim() : ''
  if (reviewBody.length < 10 || reviewBody.length > 4000) {
    return Response.json(
      { error: 'body must be 10–4000 characters' },
      { status: 400 },
    )
  }
  const photoPathsRaw = Array.isArray(body.photoPaths)
    ? (body.photoPaths as unknown[])
    : []
  const photoPaths = photoPathsRaw
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .slice(0, 5)

  const ipCountry = req.headers.get('x-vercel-ip-country') ?? null

  const { data, error } = await ssb
    .from('reviews')
    .insert({
      user_id: user.id,
      rating: Math.round(rating),
      title,
      body: reviewBody,
      photo_paths: photoPaths,
      ip_country: ipCountry,
    } as never)
    .select('id')
    .single()

  if (error || !data) {
    console.error('[reviews] insert failed:', error)
    return Response.json({ error: 'Could not save review' }, { status: 500 })
  }

  return Response.json({ ok: true, id: (data as { id: string }).id })
}
