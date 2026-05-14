/**
 * Shape of one row in public.notification_preferences. Mirrors the
 * 024_notification_preferences migration. Times are postgres `time`
 * → serialised as "HH:MM:SS" strings over the wire.
 */
export interface NotificationPreferences {
  user_id: string
  breakfast_enabled: boolean
  breakfast_time: string
  lunch_enabled: boolean
  lunch_time: string
  dinner_enabled: boolean
  dinner_time: string
  hydration_enabled: boolean
  hydration_start_time: string
  hydration_end_time: string
  hydration_interval_hours: number
  workout_enabled: boolean
  workout_time: string
  updated_at: string
}

/** Defaults match the migration `default` clauses. Used when no row
 *  exists yet so the settings page renders without a blocking fetch
 *  on the user's first visit. */
export const DEFAULT_PREFS: Omit<NotificationPreferences, 'user_id' | 'updated_at'> = {
  breakfast_enabled: true,
  breakfast_time: '08:00:00',
  lunch_enabled: true,
  lunch_time: '13:00:00',
  dinner_enabled: true,
  dinner_time: '19:00:00',
  hydration_enabled: true,
  hydration_start_time: '09:00:00',
  hydration_end_time: '21:00:00',
  hydration_interval_hours: 2,
  workout_enabled: true,
  workout_time: '18:00:00',
}
