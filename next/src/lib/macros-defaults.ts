/**
 * Platform default daily macro targets. Used as the fallback when a
 * customer hasn't set their own via /dashboard/settings. Per-user
 * overrides live on `profiles.target_calories / target_protein_g /
 * target_carbs_g / target_fat_g` — see migration 026.
 *
 * Values are reasonable defaults for a typical adult woman (~25-40,
 * lightly active) — Coach Rawan's primary demographic.
 */
export const MACRO_TARGETS = {
  calories: 1840,
  waterGlasses: 8,
  protein: 120,
  carbs: 200,
  fat: 60,
} as const

/**
 * Resolve the macro targets a customer-facing page should display.
 * Prefers each per-user column on `profiles` when set, falls back to
 * the platform default for any null column. Pass the loaded profile
 * (or null while loading) and get back a fully-populated shape that
 * matches the render-time MACRO_TARGETS contract.
 */
export interface MacroTargets {
  calories: number
  waterGlasses: number
  protein: number
  carbs: number
  fat: number
}

export function resolveMacroTargets(
  profile: {
    target_calories?: number | null
    target_protein_g?: number | null
    target_carbs_g?: number | null
    target_fat_g?: number | null
  } | null
  | undefined,
): MacroTargets {
  return {
    calories:     profile?.target_calories  ?? MACRO_TARGETS.calories,
    waterGlasses: MACRO_TARGETS.waterGlasses,
    protein:      profile?.target_protein_g ?? MACRO_TARGETS.protein,
    carbs:        profile?.target_carbs_g   ?? MACRO_TARGETS.carbs,
    fat:          profile?.target_fat_g     ?? MACRO_TARGETS.fat,
  }
}
