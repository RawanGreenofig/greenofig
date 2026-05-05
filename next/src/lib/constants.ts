export { NUTRITIONIST } from './tokens'

/** Subscription tier ladder. Order matters (used for tier comparisons). */
export const TIERS = ['free', 'basic', 'premium', 'vip'] as const
export type Tier = (typeof TIERS)[number]

/**
 * Feature flag IDs — keep in sync with the `feature_flags` table seeded in
 * `001_greenofig.sql`. Used by `useFeature()` and admin Feature Flags page.
 */
export const FEATURES = [
  'food_scanner',
  'food_scanner_free',
  'meal_plans',
  'nutrition_tracking',
  'progress_charts',
  'milestone_sharing',
  'community_feed',
  'direct_messaging',
  'ai_chatbot',
  'ai_chatbot_priority',
  'store_access',
  'store_discount',
  'bookings',
  'recipe_library',
  'educational_content',
  'advanced_analytics',
  'supplement_tracking',
  'water_tracking',
  'sleep_tracking',
  'shopping_list',
] as const
export type FeatureFlag = (typeof FEATURES)[number]

/** 3D icon CDN base. Append `<hash>-<name>/dynamic/200/color.webp`. */
export const CDN_3DICONS =
  'https://bvconuycpdvgzbvbkijl.supabase.co/storage/v1/object/public/sizes'

export const buildIconUrl = (id: string, size: 200 | 400 | 800 = 200): string =>
  `${CDN_3DICONS}/${id}/dynamic/${size}/color.webp`
