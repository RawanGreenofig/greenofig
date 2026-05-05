/**
 * GreenoFig design tokens — single source of truth.
 * GSAP, Three.js, Recharts, and any non-Tailwind code reads from here.
 *
 * The palette is forest-green primary (`#3d7a4a`); lime is an accent only.
 */

export const colors = {
  // Page surfaces
  bg: '#0d1a12',
  bgDeeper: '#060d09',
  surface: '#132218',
  surfaceRaised: '#1a3320',
  border: '#243d2a',

  // Brand
  primary: '#3d7a4a',
  primaryHover: '#4a9259',
  primaryActive: '#2e5c37',
  brandTint: 'rgba(61,122,74,0.1)',

  // Lime — accent (NOT primary)
  lime400: '#a3e635',
  lime500: '#84cc16',
  lime600: '#65a30d',

  // Other accents
  amber: '#e8912a',
  beet: '#c0392b',
  berry: '#6b3fa0',
  figGold: '#c9a84c',
  forest: '#16a34a',

  // Text levels
  text1: '#f0ede6',
  text2: '#9baf9f',
  text3: '#5c7262',

  // Semantic state
  success: '#4caf72',
  warning: '#e8912a',
  error: '#c0392b',
  info: '#4a9ac4',
} as const

export const motion = {
  cinema: 1200,
  slow: 700,
  normal: 350,
  fast: 150,
  instant: 100,
} as const

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  in: [0.4, 0, 0.6, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  cinematic: [0.76, 0, 0.24, 1] as const,
} as const

/** CSS cubic-bezier strings (for inline style + non-Framer-Motion uses) */
export const easeCss = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  in: 'cubic-bezier(0.4, 0, 0.6, 1)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  cinematic: 'cubic-bezier(0.76, 0, 0.24, 1)',
} as const

export const heroFrames = {
  total: 40,
  word1: 5, // "Nourish"
  word2: 9, // "Better."
  sub1: 14, // "Personalized nutrition"
  sub2: 18, // "plans that work"
  sub3: 22, // "for your body."
  exit: 30, // all words exit
  second1: 35, // "Your healthiest self"
  second2: 35, // "starts here."
  cta: 38, // CTA button
  reducedMotionStill: 20,
} as const

export const NUTRITIONIST = {
  name: 'Dr. Rawan Othman',
  nameAr: 'د. روان عثمان',
  firstName: 'Rawan',
  title: 'Dr.',
  shortName: 'Dr. Rawan',
  role: 'Certified Clinical Nutritionist',
  roleAr: 'أخصائية التغذية الإكلينيكية',
  initials: 'RO',
  experience: '3 years',
  credentials: [
    'Certified Clinical Nutritionist',
    '3 Years of Specialized Practice',
    '500+ Clients Transformed',
  ],
  credentialsAr: [
    'أخصائية تغذية إكلينيكية معتمدة',
    '3 سنوات من الممارسة المتخصصة',
    '+500 عميل تم تحويلهم',
  ],
  bio: {
    short:
      'Dr. Rawan Othman is a certified nutritionist dedicated to helping people achieve lasting health through science-backed, personalized nutrition.',
    long:
      'Dr. Rawan Othman brings a fresh, evidence-based approach to nutrition that goes beyond generic diets. In her 3 years of specialized practice, she has helped hundreds of clients transform their relationship with food — building sustainable habits that fit real life, not just theory.',
    shortAr:
      'د. روان عثمان أخصائية تغذية معتمدة، تكرّس جهودها لمساعدة الناس على تحقيق صحة دائمة من خلال تغذية شخصية قائمة على العلم.',
    longAr:
      'تقدم د. روان عثمان نهجاً حديثاً قائماً على الأدلة العلمية في التغذية، يتجاوز الحميات الغذائية العامة. في سنواتها الثلاث من الممارسة المتخصصة، ساعدت مئات العملاء على تغيير علاقتهم بالطعام.',
  },
} as const

export const tracking = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.04em',
  eyebrow: '0.18em',
} as const

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 24,
  pill: 9999,
} as const

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  glow: '0 4px 20px rgb(61 122 74 / 0.35)',
  glowLg: '0 8px 40px rgb(61 122 74 / 0.45)',
  limeGlow: '0 4px 20px rgb(163 230 53 / 0.3)',
  limeGlowLg: '0 8px 40px rgb(163 230 53 / 0.4)',
  glass: '0 10px 40px rgb(0 0 0 / 0.15)',
} as const

export type ColorToken = keyof typeof colors
export type MotionToken = keyof typeof motion
export type EaseToken = keyof typeof ease
