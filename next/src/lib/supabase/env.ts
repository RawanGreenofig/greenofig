/**
 * Centralized env access. Returns null when Supabase isn't configured so
 * the rest of the app degrades gracefully (auth becomes a no-op, all
 * queries return empty) rather than crashing on missing env at build time.
 */

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export const isSupabaseConfigured = (): boolean => getSupabaseEnv() !== null
