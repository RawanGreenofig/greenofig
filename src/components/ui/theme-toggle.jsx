import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { Button } from './button'

export function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn('relative h-9 w-9', className)}
      aria-label={theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      <Sun className={cn(
        'h-5 w-5 transition-all',
        theme === 'dark' ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
      )} />
      <Moon className={cn(
        'absolute h-5 w-5 transition-all',
        theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
      )} />
      <span className="sr-only">{t('theme.toggle')}</span>
    </Button>
  )
}

export function ThemeToggleExpanded({ className }) {
  const { theme, toggleTheme, isDark } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg w-full',
        'bg-muted hover:bg-accent transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      {isDark ? (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-sm">{t('theme.dark')}</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-sm">{t('theme.light')}</span>
        </>
      )}
    </button>
  )
}

export default ThemeToggle
