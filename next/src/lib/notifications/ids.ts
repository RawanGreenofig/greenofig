/**
 * Stable integer IDs for every notification we schedule with
 * @capacitor/local-notifications. The plugin uses IDs to
 * deduplicate: schedule()-ing with an existing ID replaces the
 * pending notification. We pick fixed numbers per category so a
 * settings-page save can call cancel({ ids: ALL_IDS }) followed by
 * schedule(...) without orphaning yesterday's pending fires.
 *
 * Range allocation:
 *   1001-1099  Meals + workout (one per category)
 *   1100-1199  Hydration fire-times (one per hour-slot)
 */

export const NOTIF_ID_BREAKFAST = 1001
export const NOTIF_ID_LUNCH = 1002
export const NOTIF_ID_DINNER = 1003
export const NOTIF_ID_WORKOUT = 1004

/** Up to 12 hydration slots (one per hour-of-day 0..23 truncated to
 *  the configured window). Allocates 1100..1199 so future categories
 *  can grow without colliding. */
export const NOTIF_ID_HYDRATION_BASE = 1100

export function hydrationId(hourOfDay: number): number {
  return NOTIF_ID_HYDRATION_BASE + hourOfDay
}

/** Every ID this module could ever produce. Used by sync.ts to
 *  cancel ALL local notifications we own before re-scheduling — so
 *  toggling a category off actually removes its pending fires. */
export function allManagedIds(): number[] {
  const ids = [
    NOTIF_ID_BREAKFAST,
    NOTIF_ID_LUNCH,
    NOTIF_ID_DINNER,
    NOTIF_ID_WORKOUT,
  ]
  for (let h = 0; h < 24; h += 1) ids.push(hydrationId(h))
  return ids
}
