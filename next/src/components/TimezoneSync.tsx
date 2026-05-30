'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Keeps profiles.timezone in sync with the signed-in user's actual
 * browser/device timezone (IANA, e.g. "America/New_York"). The reminder
 * scheduler (/api/cron/reminders) reads this to fire meal/water/workout
 * reminders at each user's correct local time. Writes at most once per
 * session, and only when it actually differs from what's stored.
 */
export function TimezoneSync() {
  const { user, profile } = useAuth()
  const wrote = useRef(false)

  useEffect(() => {
    if (!user || wrote.current) return
    let tz = ''
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    } catch {
      return
    }
    if (!tz) return
    const current = (profile as { timezone?: string | null } | null)?.timezone
    if (current === tz) return

    const supabase = getBrowserSupabase()
    if (!supabase) return
    wrote.current = true
    void supabase
      .from('profiles')
      .update({ timezone: tz } as never)
      .eq('id', user.id)
  }, [user, profile])

  return null
}
