/**
 * Platform default daily macro targets. Until each user has personalised
 * goals stored on their profile (TODO: add `target_calories`,
 * `target_protein_g`, `target_carbs_g`, `target_fat_g` columns and a
 * settings UI), every customer's dashboard + track page renders these
 * as their "today's goals".
 *
 * Values are reasonable defaults for a typical adult woman (~25-40,
 * lightly active) — Coach Rawan's target demographic. They're shared
 * here so changing the platform default is a one-line edit and so
 * the user-facing pages all agree on the same numbers.
 *
 * When per-user goals land, replace usage of `MACRO_TARGETS` with the
 * profile-derived value and treat this constant as the fallback only.
 */
export const MACRO_TARGETS = {
  calories: 1840,
  waterGlasses: 8,
  protein: 120,
  carbs: 200,
  fat: 60,
} as const
