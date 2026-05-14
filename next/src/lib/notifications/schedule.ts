/**
 * Pure builder: turns a NotificationPreferences row into the list of
 * notification descriptors @capacitor/local-notifications expects.
 *
 * No imports of the plugin — kept side-effect-free so it can run in
 * Node tests later if we add any. The Capacitor side is in sync.ts.
 */

import type { NotificationPreferences } from './types'
import {
  NOTIF_ID_BREAKFAST,
  NOTIF_ID_DINNER,
  NOTIF_ID_LUNCH,
  NOTIF_ID_WORKOUT,
  hydrationId,
} from './ids'

export interface ScheduledNotification {
  id: number
  title: string
  body: string
  /** Hour of day in 0..23 used for first-fire computation. */
  hour: number
  /** Minute of hour in 0..59. */
  minute: number
}

/** "HH:MM:SS" or "HH:MM" → { hour, minute }. Falls back to [0, 0]
 *  on parse failure rather than throwing — we'd rather schedule a
 *  midnight reminder than have the whole flow blow up. */
function parseTime(t: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{1,2})/.exec(t ?? '')
  if (!m) return { hour: 0, minute: 0 }
  const hour = Math.max(0, Math.min(23, Number(m[1])))
  const minute = Math.max(0, Math.min(59, Number(m[2])))
  return { hour, minute }
}

export function buildScheduleList(
  prefs: NotificationPreferences,
): ScheduledNotification[] {
  const list: ScheduledNotification[] = []

  if (prefs.breakfast_enabled) {
    const { hour, minute } = parseTime(prefs.breakfast_time)
    list.push({
      id: NOTIF_ID_BREAKFAST,
      title: 'Breakfast time',
      body: 'Time for breakfast! Log your meal 🍳',
      hour,
      minute,
    })
  }
  if (prefs.lunch_enabled) {
    const { hour, minute } = parseTime(prefs.lunch_time)
    list.push({
      id: NOTIF_ID_LUNCH,
      title: 'Lunch time',
      body: "Don't forget to log your lunch 🥗",
      hour,
      minute,
    })
  }
  if (prefs.dinner_enabled) {
    const { hour, minute } = parseTime(prefs.dinner_time)
    list.push({
      id: NOTIF_ID_DINNER,
      title: 'Dinner time',
      body: 'Log your dinner and stay on track 🍽️',
      hour,
      minute,
    })
  }
  if (prefs.workout_enabled) {
    const { hour, minute } = parseTime(prefs.workout_time)
    list.push({
      id: NOTIF_ID_WORKOUT,
      title: 'Workout reminder',
      body: 'Time to move! Your workout is waiting 💪',
      hour,
      minute,
    })
  }

  if (prefs.hydration_enabled) {
    const start = parseTime(prefs.hydration_start_time).hour
    const end = parseTime(prefs.hydration_end_time).hour
    const step = Math.max(1, Math.min(12, prefs.hydration_interval_hours || 2))
    // Inclusive of both endpoints when the step divides evenly.
    // start=9, end=21, step=2 → 9, 11, 13, 15, 17, 19, 21 (7 fires).
    for (let h = start; h <= end; h += step) {
      list.push({
        id: hydrationId(h),
        title: 'Hydration check-in',
        body: 'Stay hydrated! Drink a glass of water 💧',
        hour: h,
        minute: 0,
      })
    }
  }

  return list
}

/**
 * First-fire timestamp for a daily HH:MM. If the time is in the
 * past for today, returns tomorrow at HH:MM. The plugin then
 * advances by 24h on `schedule.every: 'day'`.
 *
 * Pure — caller passes `now` in tests; defaults to system clock.
 */
export function nextOccurrence(
  hour: number,
  minute: number,
  now: Date = new Date(),
): Date {
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }
  return target
}
