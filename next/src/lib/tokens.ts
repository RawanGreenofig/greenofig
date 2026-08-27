/**
 * GreenoFig design tokens — single source of truth.
 * GSAP, Three.js, Recharts, and any non-Tailwind code reads from here.
 *
 * The palette is forest-green primary (`#3d7a4a`); lime is an accent only.
 */

export const colors = {
  // Page surfaces — pistachio (no white, no dark)
  bg: '#e8f3de',
  bgDeeper: '#d4eac6',
  surface: '#deefd0',
  surfaceRaised: '#e8f3de',
  border: '#a8cc8c',

  // Brand — deep forest green (works on light bg)
  primary: '#2d6b3a',
  primaryHover: '#3a8049',
  primaryActive: '#1e4f2a',
  brandTint: 'rgba(45,107,58,0.08)',

  // Lime — darkened for readability on pistachio bg
  lime400: '#4d7c0f',
  lime500: '#3d6b0a',
  lime600: '#2d5208',

  // Other accents
  amber: '#e8912a',
  beet: '#c0392b',
  berry: '#6b3fa0',
  figGold: '#c9a84c',
  forest: '#16a34a',

  // Text levels — dark on light bg
  text1: '#1c2e20',
  text2: '#4a6352',
  text3: '#8a9e8f',

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
  sub: 14, // single combined subtitle line
  // Legacy frame triggers — no longer used by HeroSequence but kept so
  // any older import paths don't break.
  sub1: 14,
  sub2: 18,
  sub3: 22,
  exit: 30, // all words exit
  second1: 35, // "Your healthiest self"
  second2: 35, // "starts here."
  cta: 38, // CTA button
  reducedMotionStill: 20,
} as const

// Head-coach metadata used by marketing pages and components that
// need the founder's identity (about section, footer, hero credits).
// Greenofig is rebranding from "Nutrition Coach Rawan" to "Nutrition Coach Rawan Othman"
// as we hire more nutritionists onto the team. Use NUTRITIONIST.name
// or .shortName for owner-coach copy; for generic platform copy,
// prefer "your coach" / "coaches" so additional team members can
// own those touchpoints without rewording.
export const NUTRITIONIST = {
  name: 'Nutrition Coach Rawan Othman',
  nameAr: 'كوتش التغذية روان عثمان',
  firstName: 'Rawan',
  title: 'Nutrition Coach',
  shortName: 'Nutrition Coach Rawan',
  role: 'Certified Nutritionist · Head Coach',
  roleAr: 'أخصائية التغذية · المدرّبة الرئيسية',
  initials: 'RO',
  experience: '3 years',
  credentials: [
    'Certified Nutritionist',
    '3 Years of Specialized Practice',
    '500+ Clients Transformed',
  ],
  credentialsAr: [
    'أخصائية تغذية معتمدة',
    '3 سنوات من الممارسة المتخصصة',
    '+500 عميل تم تحويلهم',
  ],
  bio: {
    short:
      'Nutrition Coach Rawan Othman is a certified nutritionist and head coach of the Greenofig team, dedicated to helping people achieve lasting health through science-backed, personalized nutrition.',
    long:
      'Nutrition Coach Rawan Othman leads the Greenofig coaching team. She brings an evidence-based approach to nutrition that goes beyond generic diets. In her 3 years of specialized practice, she — along with the nutritionist coaches she trains — has helped hundreds of clients transform their relationship with food, building sustainable habits that fit real life, not just theory.',
    shortAr:
      'كوتش التغذية روان عثمان أخصائية تغذية معتمدة ومدرّبة رئيسية في فريق Greenofig، تكرّس جهودها لمساعدة الناس على تحقيق صحة دائمة من خلال تغذية شخصية قائمة على العلم.',
    longAr:
      'تقود كوتش التغذية روان عثمان فريق Greenofig. تقدّم نهجاً حديثاً قائماً على الأدلة العلمية في التغذية، يتجاوز الأنظمة العامة. في سنواتها الثلاث من الممارسة، ساعدت — مع أخصائيي التغذية المدرّبين الذين تدرّبهم — مئات العملاء على تغيير علاقتهم بالطعام وبناء عادات صحية مستدامة تناسب الحياة الواقعية.',
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
  glow: '0 4px 20px rgb(45 107 58 / 0.18)',
  glowLg: '0 8px 40px rgb(45 107 58 / 0.25)',
  limeGlow: '0 4px 20px rgb(163 230 53 / 0.3)',
  limeGlowLg: '0 8px 40px rgb(163 230 53 / 0.4)',
  glass: '0 10px 40px rgb(0 0 0 / 0.15)',
} as const

export type ColorToken = keyof typeof colors
export type MotionToken = keyof typeof motion
export type EaseToken = keyof typeof ease
