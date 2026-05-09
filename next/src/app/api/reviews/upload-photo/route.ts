import type { NextRequest } from 'next/server'
import { getServerSupabase } from '@/lib/supabase/server'

/**
 * POST /api/reviews/upload-photo
 *
 * Uploads a single image to the review-photos Supabase Storage bucket.
 * The path uses the user's id as the first folder so the bucket's
 * delete-policy can match `(storage.foldername(name))[1] = auth.uid()`.
 *
 * multipart/form-data: file=<image>
 * Returns: { path: 'userId/uuid.ext', url: 'https://…/storage/…' }
 *
 * Validates: signed-in user, image MIME, size <= 5 MB.
 */
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function POST(req: NextRequest) {
  const supabase = getServerSupabase()
  if (!supabase) {
    return Response.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Sign in required' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return Response.json(
      { error: 'A file field is required' },
      { status: 400 },
    )
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: 'Only JPEG, PNG, or WebP images allowed' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: 'Photo must be 5 MB or smaller' },
      { status: 400 },
    )
  }

  const ext = file.type === 'image/jpeg'
    ? 'jpg'
    : file.type === 'image/png'
      ? 'png'
      : 'webp'
  const path = `${user.id}/${cryptoRandomId()}.${ext}`

  const buffer = await file.arrayBuffer()
  const { error: upErr } = await supabase.storage
    .from('review-photos')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })
  if (upErr) {
    console.error('[reviews/upload] failed:', upErr)
    return Response.json(
      { error: upErr.message ?? 'Upload failed' },
      { status: 500 },
    )
  }

  const { data: urlData } = supabase.storage
    .from('review-photos')
    .getPublicUrl(path)

  return Response.json({ path, url: urlData.publicUrl })
}

function cryptoRandomId() {
  // Avoid collisions on rapid uploads while keeping URLs short
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
