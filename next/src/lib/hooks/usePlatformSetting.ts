'use client'

import { useEffect, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Read a single `platform_settings` row and stay subscribed to changes
 * via Supabase realtime. The store-toggle relies on this for instant
 * propagation across all sessions.
 */
export function usePlatformSetting<T = unknown>(key: string) {
  const [value, setValue] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setValue(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      const { data } = await supabase!
        .from('platform_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      if (cancelled) return
      const row = data as { value?: T } | null
      setValue((row?.value ?? null) as T | null)
      setIsLoading(false)
    }
    void load()

    const channel = supabase
      .channel(`platform_settings:${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings',
          filter: `key=eq.${key}`,
        },
        (payload) => {
          const row = payload.new as { value?: T } | null
          setValue((row?.value ?? null) as T | null)
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [key])

  return { value, isLoading }
}
