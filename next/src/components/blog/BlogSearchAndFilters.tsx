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
        <input
          placeholder={isAr ? 'ابحث في المقالات…' : 'Search articles...'}
          className="rounded-xl px-4 text-sm w-72 outline-none transition-colors"
          style={{
            height: 40,
            background: 'var(--gf-surface)',
            border: '1px solid var(--gf-border)',
            color: 'var(--gf-fg-1)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgb(163 230 53 / 0.5)'
            e.currentTarget.style.boxShadow =
              '0 0 0 3px rgb(163 230 53 / 0.12)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--gf-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ height: 40, padding: '0 18px', fontSize: 14 }}
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
