'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Inside the Capacitor Android WebView, the marketing homepage is
 * skipped — there's no reason to ship a "Download the app" page to
 * someone who's already inside the app. This gate fires on mount:
 *
 *   - Not in Capacitor          → render nothing, marketing page stays.
 *   - In Capacitor + signed in  → router.replace('/dashboard').
 *   - In Capacitor + signed out → router.replace('/sign-in').
 *
 * While the session check is in flight (which is one HTTP round-trip
 * to Supabase), we cover the marketing content with a full-screen
 * splash so users never see the homepage flash before the redirect.
 *
 * NOTE: the spec said redirect to /login, but the live route is
 * /sign-in — using that. If a /login alias gets added later, swap
 * the path here.
 */
export function CapacitorHomeGate() {
  const router = useRouter()
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!isInsideCapacitor()) return
    setActive(true)
    let cancelled = false
    const supabase = getBrowserSupabase()
    if (!supabase) {
      router.replace('/sign-in')
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      router.replace(data.session ? '/dashboard' : '/sign-in')
    })
    return () => {
      cancelled = true
    }
  }, [router])

  if (!active) return null
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
