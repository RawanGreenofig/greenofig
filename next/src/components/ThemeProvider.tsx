'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {},
})

const STORAGE_KEY = 'gf-dashboard-theme'

/**
 * Scoped theme toggle for the dashboard.
 *
 * Sets a `data-dash-theme="dark|light"` attribute on the wrapping div
 * so light/dark CSS variables flip without touching the marketing site
 * (which is locked to a forest-green dark theme).
 *
 * Persists in localStorage. Defaults to dark.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  // Hydrate from localStorage on first mount only.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') setThemeState(saved)
  }, [])

  // Persist whenever the theme changes.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(
    () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {/* Wrap so the data-dash-theme attribute scopes the var overrides
       * to the dashboard subtree only. */}
      <div data-dash-theme={theme} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
