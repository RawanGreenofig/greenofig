import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware Link/redirect/useRouter/usePathname wrappers.
 * Always import from here, not directly from `next/link` or `next/navigation`.
 */
export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing)
