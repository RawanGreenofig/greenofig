import React from 'react'
import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

export function LanguageToggle({ className }) {
  const { language, setLanguage } = useLanguage()
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9', className)}
          aria-label={t('language.toggle')}
        >
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t('language.toggle')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={cn(language === 'en' && 'bg-accent')}
        >
          <span className="mr-2">🇺🇸</span>
          {t('language.english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ar')}
          className={cn(language === 'ar' && 'bg-accent')}
        >
          <span className="mr-2">🇸🇦</span>
          {t('language.arabic')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function LanguageToggleSimple({ className }) {
  const { language, toggleLanguage } = useLanguage()
  const { t } = useTranslation()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={cn('gap-2', className)}
    >
      <Languages className="h-4 w-4" />
      <span>{language === 'en' ? 'العربية' : 'English'}</span>
    </Button>
  )
}

export default LanguageToggle
