'use client'

import { useEffect, useRef, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Browser = SupabaseClient<Database>

export interface QueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-run the query without remounting the component. */
  reload: () => void
}

/**
 * Run a Supabase query and expose its lifecycle as React state. The
 * query function receives the typed browser client; if Supabase env is
 * missing (no `getBrowserSupabase()`), the hook falls back to a `null`
 * data state with `loading: false` so pages can render the seed UI.
 *
 * Re-runs whenever the deps array changes.
 */
export function useSupabaseQuery<T>(
  fetcher: (supabase: Browser) => Promise<T>,
  deps: React.DependencyList = [],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const cancelRef = useRef(false)

  useEffect(() => {
    cancelRef.current = false
    const supabase = getBrowserSupabase()
    if (!supabase) {
      // Env not configured — render seed and exit. `null` data is the
      // signal pages use to keep their fallback constants visible.
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    // Wait for the session to be hydrated from cookies/localStorage
    // before firing the query. Otherwise supabase-js sends the
    // request with anon credentials during the brief window between
    // mount and session restore, RLS treats it as unauthenticated,
    // and every list page on /admin /nutritionist /dashboard
    // briefly returns empty on hard refresh.
    //
    // .getSession() reads local storage / cookies synchronously and
    // resolves immediately — it does NOT round-trip the server, so
    // we're not adding latency. We're just sequencing the await so
    // supabase-js has the JWT attached when fetcher runs.
    void (async () => {
      try {
        await supabase.auth.getSession()
        if (cancelRef.current) return
        const res = await fetcher(supabase as Browser)
        if (cancelRef.current) return
        setData(res)
      } catch (err: unknown) {
        if (cancelRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelRef.current) setLoading(false)
      }
    })()
    return () => {
      cancelRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, reload: () => setTick((n) => n + 1) }
}

/** True when the runtime is configured to talk to Supabase. */
export function useIsLive(): boolean {
  const [live, setLive] = useState(false)
  useEffect(() => {
    setLive(!!getBrowserSupabase())
  }, [])
  return live
}
