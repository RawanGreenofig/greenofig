import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

/**
 * Resolve a presentable display name from whatever signal we have.
 *
 * Priority:
 *   1. profiles.full_name (set during onboarding)
 *   2. user.user_metadata.full_name (provided by Google OAuth)
 *   3. local-part of the email, with digits stripped and case fixed
 *      ("ahmed93sabah93@gmail.com" → "Ahmed Sabah")
 *
 * Returns the final fallback string when none of those produce text.
 *
 * Pure — safe to call from server components and inside reducers.
 */
export function resolveDisplayName(
  profile: Profile | null,
  user: User | null,
  fallback = 'there',
): string {
  const fromProfile = profile?.full_name?.trim()
  if (fromProfile) return fromProfile

  const meta = user?.user_metadata as { full_name?: unknown } | undefined
  const fromMeta =
    typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  if (fromMeta) return fromMeta

  const email = user?.email
  if (email) {
    const cleaned = prettifyEmailLocalPart(email)
    if (cleaned) return cleaned
  }

  return fallback
}

/** "Ahmed" — drop the numbers, take the first word, capitalize. */
export function resolveFirstName(
  profile: Profile | null,
  user: User | null,
  fallback = 'there',
): string {
  const full = resolveDisplayName(profile, user, fallback)
  const first = full.split(/\s+/)[0]
  if (!first) return fallback
  // Strip trailing/leading digits left over from "ahmed93".
  const trimmed = first.replace(/\d+/g, '').trim()
  if (!trimmed) return fallback
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

/** "ahmed93sabah93" → "Ahmed Sabah". */
function prettifyEmailLocalPart(email: string): string | null {
  const local = email.split('@')[0]
  if (!local) return null
  // Replace dots / underscores / dashes with spaces, drop digits.
  const words = local
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return null
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
