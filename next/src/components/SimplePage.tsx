import { Link } from '@/i18n/navigation'
import { ArrowLeft } from 'lucide-react'

interface SimplePageProps {
  title: string
  subtitle?: string
  isAr?: boolean
  children: React.ReactNode
}

/**
 * Shared wrapper for static text pages (privacy, terms, cookies, accessibility).
 * Provides consistent typography, max-width, and a back link.
 */
export function SimplePage({ title, subtitle, isAr, children }: SimplePageProps) {
  return (
    <main className="bg-bg min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-20 lg:py-28">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-fg-2 hover:text-lime-400 transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} strokeWidth={1.75} />
          {isAr ? 'عودة للرئيسية' : 'Back to home'}
        </Link>
        <header className="mb-10">
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(36px, 4.5vw, 56px)',
              lineHeight: 1.1,
              fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-4 text-lg text-fg-2 leading-relaxed">{subtitle}</p>}
        </header>
        <div className="prose-greenofig text-fg-2" style={{ fontSize: '1rem', lineHeight: 1.8 }}>
          {children}
        </div>
      </div>
    </main>
  )
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans font-semibold text-lg text-fg-1 mt-10 mb-3">{children}</h2>
  )
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="my-4">{children}</p>
}
