'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Inside the Capacitor Android WebView, signed-in users skip the
 * marketing homepage and land on /dashboard. Signed-out users see
 * the marketing page like everyone else so they can browse, read
 * about features, and sign up. Behaviour:
 *
 *   - Not in Capacitor          → render nothing, marketing page stays.
 *   - In Capacitor + signed in  → splash + router.replace('/dashboard').
 *   - In Capacitor + signed out → render nothing, marketing page stays.
 *
 * The splash overlay is ONLY mounted once we've confirmed a session
 * exists. While the auth check is in flight the marketing page
 * renders normally — Supabase reads the session from local storage
 * synchronously after init, so the gap is essentially imperceptible
 * for signed-out users.
 */
export function CapacitorHomeGate() {
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (!isInsideCapacitor()) return
    const supabase = getBrowserSupabase()
    if (!supabase) return // no Supabase client → treat as signed-out
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) {
        setRedirecting(true)
        router.replace('/dashboard')
      }
      // No session → leave the marketing homepage alone.
    })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!redirecting) return null
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: '#0d1a12' }}
    >
      <span
        className="w-7 h-7 rounded-full animate-spin"
        style={{
          border: '2px solid rgba(132,217,61,0.25)',
          borderTopColor: '#a3e635',
        }}
      />
    </div>
  )
}
