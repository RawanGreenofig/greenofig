import { TIERS, type Tier } from './constants'

const ORDER: Record<Tier, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  vip: 3,
}

/** True when `current` is at or above `min` on the tier ladder. */
export function tierAtLeast(current: Tier | null | undefined, min: Tier): boolean {
  if (!current) return false
  return ORDER[current] >= ORDER[min]
}

export { TIERS, type Tier }
