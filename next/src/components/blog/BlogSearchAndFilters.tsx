'use client'

/**
 * Search input + filter pill row for the blog index.
 *
 * Lifted out of the index page because that page is a Server
 * Component (it exports `metadata`) and Server Components cannot
 * pass event handlers to Client Components. The onFocus/onBlur
 * border-color tweak on the input and the onMouseEnter/Leave
 * tweaks on the filter pills both require a client boundary.
 *
 * Pure presentational — no state, no data fetching. The page
 * still owns the locale + translations.
 */

import { Search } from 'lucide-react'

interface Props {
  isAr: boolean
}

export function BlogSearchAndFilters({ isAr }: Props) {
  const categories = isAr
    ? ['الكل', 'فقدان الوزن', 'تخطيط الوجبات', 'مكملات', 'وصفات']
    : ['All', 'Weight Loss', 'Meal Planning', 'Supplements', 'Recipes']

  return (
    <>
      <div className="flex items-center justify-center gap-3 mt-8 px-4 flex-wrap">
        <div className="relative w-72 max-w-full">
          <Search
            className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            placeholder={isAr ? 'ابحث في المقالات…' : 'Search articles...'}
            className="h-11 w-full rounded-full ps-10 pe-4 text-sm transition-colors duration-200"
            style={{
              background: 'rgba(8, 20, 10, 0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor: 'rgba(255,255,255,0.14)',
              color: 'hsl(var(--foreground))',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#a3e635'
              e.currentTarget.style.boxShadow =
                '0 0 0 3px rgba(163,230,53,0.18)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.currentTarget) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'
              }
            }}
            onMouseLeave={(e) => {
              if (document.activeElement !== e.currentTarget) {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
              }
            }}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ height: 40, padding: '0 32px', fontSize: 13 }}
        >
          {isAr ? 'بحث' : 'Search'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-3 mt-6 flex-wrap px-4">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className="rounded-full transition-colors"
            style={{
              height: 32,
              padding: '0 14px',
              background: 'var(--gf-surface)',
              border: '1px solid var(--gf-border)',
              color: 'var(--gf-fg-2)',
              fontSize: 13,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.color = 'var(--gf-fg-1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--gf-border)'
              e.currentTarget.style.color = 'var(--gf-fg-2)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>
    </>
  )
}
