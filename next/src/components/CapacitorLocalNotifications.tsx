'use client'

import { useEffect, useRef } from 'react'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { useAuth } from '@/context/AuthContext'
import {
  applyToDevice,
  fetchPreferences,
  requestPermissionIfNeeded,
} from '@/lib/notifications/sync'

/**
 * Bootstraps on-device meal/hydration/workout reminders inside the
 * Capacitor Android app.
 *
 * Runs once per signed-in user per session:
 *   1. Verify we're inside Capacitor (no-op on browsers).
 *   2. Request POST_NOTIFICATIONS permission if not yet decided.
 *   3. Fetch the user's notification_preferences row (defaults if
 *      no row exists yet).
 *   4. Cancel any pending fires we own, then schedule the new set.
 *
 * Mounted alongside <CapacitorPushRegistration /> in the locale
 * layout, so both Capacitor-only bootstraps share the same React
 * lifecycle as the auth context. Re-runs when the signed-in user
 * id changes (new sign-in).
 */
export function CapacitorLocalNotifications() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const scheduledFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isInsideCapacitor()) return
    if (!userId) return
    if (scheduledFor.current === userId) return

    let cancelled = false
    void (async () => {
      const granted = await requestPermissionIfNeeded()
      if (cancelled) return
      if (!granted) {
        // eslint-disable-next-line no-console
        console.log('[gf-notif] permission not granted — skipping schedule')
        return
      }
      const prefs = await fetchPreferences(userId)
      if (cancelled) return
      const ok = await applyToDevice(prefs)
      if (ok) scheduledFor.current = userId
    })()

    return () => {
      cancelled = true
    }
  }, [userId])

  return null
}
