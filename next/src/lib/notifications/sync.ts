/**
 * Glue between Supabase notification_preferences and the Capacitor
 * @capacitor/local-notifications scheduler.
 *
 * Three public entry points:
 *
 *   - fetchPreferences(userId)        — read prefs row, returns
 *                                       DEFAULT_PREFS if no row yet
 *   - upsertPreferences(userId, prefs) — write the row back
 *   - applyToDevice(prefs)            — cancel everything we own,
 *                                        then schedule afresh; only
 *                                        runs inside Capacitor
 *
 * Capacitor-only behavior: the @capacitor/local-notifications import
 * is dynamic so the plugin shim never reaches browser bundles, and
 * applyToDevice() no-ops on web. Web settings page can still save —
 * just nothing schedules until the user opens the APK.
 */

import { getBrowserSupabase } from '@/lib/supabase/client'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import {
  DEFAULT_PREFS,
  type NotificationPreferences,
} from './types'
import { allManagedIds } from './ids'
import { buildScheduleList, nextOccurrence } from './schedule'

export type WritablePrefs = Omit<NotificationPreferences, 'user_id' | 'updated_at'>

/**
 * Load prefs for the user. Returns the row if it exists, else a
 * defaults-only object — the settings page can render immediately
 * either way and only persist when the user changes something.
 */
export async function fetchPreferences(
  userId: string,
): Promise<WritablePrefs> {
  const supabase = getBrowserSupabase()
  if (!supabase) return { ...DEFAULT_PREFS }
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[gf-notif] fetchPreferences failed', error)
    return { ...DEFAULT_PREFS }
  }
  if (!data) return { ...DEFAULT_PREFS }
  // Strip the metadata columns so callers can treat the result as
  // an editable form value.
  const { user_id: _u, updated_at: _t, ...rest } = data as NotificationPreferences
  return rest
}

export async function upsertPreferences(
  userId: string,
  prefs: WritablePrefs,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getBrowserSupabase()
  if (!supabase) return { ok: false, error: 'Supabase client unavailable' }
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      { user_id: userId, ...prefs },
      { onConflict: 'user_id' },
    )
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[gf-notif] upsertPreferences failed', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/**
 * Push the desired schedule to the device's local-notification
 * queue. Idempotent: cancels every ID we manage before scheduling,
 * so a category toggled off has its pending fires removed.
 *
 * Returns true if anything was actually scheduled (i.e. we're on
 * Capacitor AND permission is granted). False otherwise.
 */
export async function applyToDevice(prefs: WritablePrefs): Promise<boolean> {
  if (!isInsideCapacitor()) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('@capacitor/local-notifications')
    const LocalNotifications = mod.LocalNotifications
    if (!LocalNotifications) return false

    // Permission gate. Don't request here — the boot component does
    // that once on app open. If we're not granted yet, no-op.
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      // eslint-disable-next-line no-console
      console.log('[gf-notif] applyToDevice: permission not granted', perm.display)
      return false
    }

    // Cancel every ID we own so a category turned off this round
    // actually drops out of the device queue.
    const owned = allManagedIds().map((id) => ({ id }))
    try {
      await LocalNotifications.cancel({ notifications: owned })
    } catch (cancelErr) {
      // Cancelling a non-existent ID throws on some platforms; the
      // schedule call below replaces by ID either way so we can swallow.
      // eslint-disable-next-line no-console
      console.log('[gf-notif] cancel ignored', cancelErr)
    }

    const list = buildScheduleList({
      ...prefs,
      user_id: '',
      updated_at: '',
    })
    if (list.length === 0) return true

    const now = new Date()
    const notifications = list.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      // Capacitor plugin schedule shape:
      //   at:  first fire timestamp
      //   every:'day' makes it repeat every 24h after `at`
      //   allowWhileIdle: fire even when Android Doze is active
      schedule: {
        at: nextOccurrence(n.hour, n.minute, now),
        every: 'day' as const,
        allowWhileIdle: true,
      },
      // Tapping the notification deep-links into the dashboard.
      // The plugin opens the wrapper which is already pointed at
      // greenofig.com — no extra wiring needed.
      smallIcon: 'ic_stat_icon',
      iconColor: '#a3e635',
    }))

    await LocalNotifications.schedule({ notifications })
    // eslint-disable-next-line no-console
    console.log(
      `[gf-notif] scheduled ${notifications.length} reminders`,
      notifications.map((n) => ({ id: n.id, when: n.schedule.at.toISOString() })),
    )
    return true
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[gf-notif] applyToDevice failed', err)
    return false
  }
}

/**
 * Ask the user for permission. Resolves to true if granted (or
 * already granted), false on denial / unavailable. Safe to call
 * outside Capacitor — returns false without side effects.
 */
export async function requestPermissionIfNeeded(): Promise<boolean> {
  if (!isInsideCapacitor()) return false
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import('@capacitor/local-notifications')
    const LocalNotifications = mod.LocalNotifications
    if (!LocalNotifications) return false
    let perm = await LocalNotifications.checkPermissions()
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
      perm = await LocalNotifications.requestPermissions()
    }
    return perm.display === 'granted'
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[gf-notif] requestPermission failed', err)
    return false
  }
}
