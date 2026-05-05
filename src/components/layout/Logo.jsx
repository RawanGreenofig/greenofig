import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

// Brand name always stays in English
const BRAND_NAME = 'GreenoFig'

export function Logo({ className, size = 'default', showText = true, linkTo = '/' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    default: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  const logoContent = (
    <div className={cn('flex items-center gap-2', className)}>
      <img
        src="/logo.png"
        alt={BRAND_NAME}
        className={cn('rounded-xl', sizeClasses[size])}
        onError={(e) => {
          e.target.onerror = null
          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2365a30d" width="100" height="100" rx="20"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50" font-weight="bold">G</text></svg>'
        }}
      />
      {showText && (
        <span className={cn('font-bold gradient-text', textSizeClasses[size])} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {BRAND_NAME}
        </span>
      )}
    </div>
  )

  if (linkTo) {
    return (
      <Link to={linkTo} className="focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}

export default Logo
