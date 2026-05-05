import React, { createContext, useContext, useState, useEffect } from 'react'
import i18n from '../i18n'

const LanguageContext = createContext(undefined)

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('greenofig-lang') || 'en'
    }
    return 'en'
  })

  const isRTL = language === 'ar'

  useEffect(() => {
    const html = document.documentElement
    html.lang = language
    html.dir = isRTL ? 'rtl' : 'ltr'
    localStorage.setItem('greenofig-lang', language)
    if (i18n.isInitialized) {
      i18n.changeLanguage(language)
    }
  }, [language, isRTL])

  const setLanguage = (lang) => {
    setLanguageState(lang)
  }

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'en' ? 'ar' : 'en')
  }

  const value = {
    language,
    isRTL,
    setLanguage,
    toggleLanguage,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default LanguageContext
