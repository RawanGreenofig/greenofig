import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, locale = 'en') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatNumber(num, locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(num)
}

export function formatCurrency(amount, currency = 'USD', locale = 'en') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function truncate(str, length = 100) {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
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

export function throttle(func, limit) {
  let inThrottle
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function getInitials(name) {
  if (!name) return ''
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getErrorMessage(error) {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  return 'An unexpected error occurred'
}

export const SUBSCRIPTION_TIERS = {
  base: {
    id: 'base',
    name: 'Base',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      aiMealPlans: 2,
      aiWorkoutPlans: 2,
      aiChatMessages: 10,
      expertConsultations: false,
      videoConsultations: false,
      photoFoodRecognition: false,
      adFree: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 9.99,
    yearlyPrice: 89.99,
    features: {
      aiMealPlans: -1, // unlimited
      aiWorkoutPlans: -1,
      aiChatMessages: -1,
      expertConsultations: false,
      videoConsultations: false,
      photoFoodRecognition: false,
      adFree: true,
    },
  },
  ultimate: {
    id: 'ultimate',
    name: 'Ultimate',
    monthlyPrice: 19.99,
    yearlyPrice: 179.99,
    features: {
      aiMealPlans: -1,
      aiWorkoutPlans: -1,
      aiChatMessages: -1,
      expertConsultations: true,
      videoConsultations: 2,
      photoFoodRecognition: false,
      adFree: true,
    },
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    monthlyPrice: 49.99,
    yearlyPrice: 449.99,
    features: {
      aiMealPlans: -1,
      aiWorkoutPlans: -1,
      aiChatMessages: -1,
      expertConsultations: true,
      videoConsultations: -1,
      photoFoodRecognition: true,
      adFree: true,
    },
  },
}
