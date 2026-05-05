import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function truncate(str, length = 100) {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const TIER_COLORS = {
  Base: 'text-gray-400',
  Premium: 'text-blue-400',
  Ultimate: 'text-purple-400',
  Elite: 'text-amber-400',
}

export const TIER_FEATURES = {
  Base: {
    aiCoachMessages: 5,
    mealPlanning: false,
    recipeDatabase: false,
    nutritionistMessaging: false,
    videoConsultations: 0,
    hasAds: true,
  },
  Premium: {
    aiCoachMessages: -1,
    mealPlanning: true,
    recipeDatabase: true,
    nutritionistMessaging: false,
    videoConsultations: 0,
    hasAds: false,
  },
  Ultimate: {
    aiCoachMessages: -1,
    mealPlanning: true,
    recipeDatabase: true,
    nutritionistMessaging: true,
    videoConsultations: 2,
    hasAds: false,
  },
  Elite: {
    aiCoachMessages: -1,
    mealPlanning: true,
    recipeDatabase: true,
    nutritionistMessaging: true,
    videoConsultations: -1,
    hasAds: false,
  },
}
