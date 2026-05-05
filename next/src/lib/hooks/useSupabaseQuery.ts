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
    fetcher(supabase as Browser)
      .then((res) => {
        if (cancelRef.current) return
        setData(res)
      })
      .catch((err: unknown) => {
        if (cancelRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
      .finally(() => {
        if (cancelRef.current) return
        setLoading(false)
      })
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
