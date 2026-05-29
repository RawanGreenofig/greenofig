import type { Config } from 'tailwindcss'

// Forest-green primary palette. Lime is an accent only.
// Token source of truth: src/lib/tokens.ts.

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  darkMode: 'class',
  // Without this, `hover:` styles fire on the first tap on touch
  // devices and stick until the user taps elsewhere — the Capacitor
  // WebView "glitchy gradient" right after tapping Add to cart was
  // exactly the sticky `hover:-translate-y` / `hover:brightness`
  // states from the store cards. With hoverOnlyWhenSupported, hover
  // variants compile to `@media (hover: hover)` so they never fire
  // on a finger tap.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',

      // Page surfaces — pistachio (no white, no dark)
      bg: { DEFAULT: '#e8f3de', deeper: '#d4eac6' },
      surface: { DEFAULT: '#deefd0', raised: '#e8f3de' },
      border: '#a8cc8c',

      // Brand — deep forest green (works on light bg)
      primary: { DEFAULT: '#2d6b3a', hover: '#3a8049', active: '#1e4f2a' },
      'brand-tint': 'rgb(45 107 58 / 0.08)',

      // Lime — darkened for readability on pistachio bg
      lime: { 400: '#4d7c0f', 500: '#3d6b0a', 600: '#2d5208' },

      // Other accents
      amber: '#e8912a',
      beet: '#c0392b',
      berry: '#6b3fa0',
      'fig-gold': '#c9a84c',
      forest: '#16a34a',

      // Text levels — dark on light bg
      fg: { 1: '#1c2e20', 2: '#4a6352', 3: '#8a9e8f' },

      // Semantic state
      success: '#4caf72',
      warning: '#e8912a',
      error: '#c0392b',
      info: '#4a9ac4',
    },

    spacing: {
      0: '0',
      px: '1px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      24: '96px',
    },

    borderRadius: {
      none: '0',
      sm: '8px',
      md: '10px',
      lg: '12px',
      xl: '16px',
      '2xl': '24px',
      pill: '9999px',
      full: '9999px',
    },

    fontFamily: {
      sans: ['var(--font-sans)'],
      display: ['var(--font-display)'],
      mono: ['var(--font-mono)'],
      arabic: ['var(--font-arabic)'],
    },

    boxShadow: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      glow: '0 4px 20px rgb(61 122 74 / 0.35)',
      'glow-lg': '0 8px 40px rgb(61 122 74 / 0.45)',
      'lime-glow': '0 4px 20px rgb(163 230 53 / 0.3)',
      'lime-glow-lg': '0 8px 40px rgb(163 230 53 / 0.4)',
      glass: '0 10px 40px rgb(0 0 0 / 0.15)',
    },

    transitionTimingFunction: {
      out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      in: 'cubic-bezier(0.4, 0, 0.6, 1)',
      bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      cinematic: 'cubic-bezier(0.76, 0, 0.24, 1)',
    },

    transitionDuration: {
      instant: '100ms',
      fast: '150ms',
      normal: '350ms',
      slow: '700ms',
      cinema: '1200ms',
    },

    extend: {
      letterSpacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.04em',
        eyebrow: '0.18em',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 4px 20px rgb(45 107 58 / 0.18)' },
          '50%': { boxShadow: '0 8px 40px rgb(45 107 58 / 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
