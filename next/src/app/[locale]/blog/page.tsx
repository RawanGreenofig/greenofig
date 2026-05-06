import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowRight, Clock } from 'lucide-react'
import { BLOG_ARTICLES, type BlogArticle } from '@/lib/blog-seed'
import { ArticleImage } from '@/components/blog/ArticleImage'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'Nutrition Blog | Dr. Rawan Othman | Greenofig',
  description:
    'Evidence-based nutrition articles by Dr. Rawan Othman, certified clinical nutritionist. Learn about healthy eating, weight loss, supplements, and more.',
  openGraph: {
    title: 'Nutrition Blog | Dr. Rawan Othman | Greenofig',
    description:
      'Evidence-based nutrition articles by Dr. Rawan Othman, certified clinical nutritionist.',
    type: 'website',
  },
}

const CATEGORY_LABEL: Record<BlogArticle['category'], { en: string; ar: string }> = {
  nutrition: { en: 'Nutrition', ar: 'تغذية' },
  'weight-loss': { en: 'Weight loss', ar: 'فقدان الوزن' },
  supplements: { en: 'Supplements', ar: 'مكملات' },
  lifestyle: { en: 'Lifestyle', ar: 'نمط حياة' },
  science: { en: 'Science', ar: 'علوم' },
}

export default function BlogIndexPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  const articles = [...BLOG_ARTICLES].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )

  return (
    <main className="min-h-screen" style={{ background: '#080808' }}>
      <SiteHeader />
      <div className="h-16" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Centered hero */}
        <header className="text-center mb-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface border border-primary/40 px-5 py-2 mb-6">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-lime-400" />
            <span className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
              {isAr ? 'رؤى التغذية' : 'NUTRITION INSIGHTS'}
            </span>
          </span>
          <h1
            className="font-bold text-white tracking-tight max-w-3xl mx-auto"
            style={{
              fontSize: 'clamp(40px, 5vw, 60px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {isAr
              ? 'تغذية مدعومة بالعلم،\nمشروحة ببساطة.'
              : 'Science-backed nutrition,\nexplained simply.'}
          </h1>
          <p className="mt-5 text-base lg:text-lg leading-relaxed max-w-xl mx-auto" style={{ color: '#888' }}>
            {isAr
              ? 'مقالات قائمة على الأدلة لمساعدتك على الأكل بشكل أفضل وفهم جسمك.'
              : 'Evidence-based articles to help you eat better, feel your best, and understand your body.'}
          </p>

          {/* Search + category pills */}
          <div className="flex items-center justify-center gap-3 mt-8 px-4 flex-wrap">
            <input
              placeholder={isAr ? 'ابحث في المقالات…' : 'Search articles...'}
              className="rounded-xl px-5 py-3 text-white text-sm w-72 outline-none"
              style={{
                background: '#111',
                border: '1px solid #222',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#4ade80')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#222')}
            />
            <button
              type="button"
              className="font-semibold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
              style={{ background: '#4ade80', color: '#000' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#86efac')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#4ade80')}
            >
              {isAr ? 'بحث' : 'Search'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6 flex-wrap px-4">
            {(isAr
              ? ['الكل', 'فقدان الوزن', 'تخطيط الوجبات', 'مكملات', 'وصفات']
              : ['All', 'Weight Loss', 'Meal Planning', 'Supplements', 'Recipes']
            ).map((cat) => (
              <button
                key={cat}
                type="button"
                className="text-sm px-4 py-2 rounded-full transition-colors"
                style={{ border: '1px solid #222', color: '#888', background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4ade80'
                  e.currentTarget.style.color = '#4ade80'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#222'
                  e.currentTarget.style.color = '#888'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Article grid: 1 col mobile, 2 col tablet, 3 col desktop */}
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} isAr={isAr} />
          ))}
        </ul>
      </div>
    </main>
  )
}

function ArticleCard({ article, isAr }: { article: BlogArticle; isAr: boolean }) {
  const title = isAr ? article.titleAr : article.title
  const body = isAr ? article.contentAr : article.content
  // First 140 chars of body, stripping markdown
  const excerpt =
    body
      .replace(/^#+\s+.*$/gm, '')
      .replace(/[*_>:]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim()
      .slice(0, 140)
      .trim() + '…'
  const date = new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar' : 'en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const categoryLabel = CATEGORY_LABEL[article.category][isAr ? 'ar' : 'en']

  return (
    <li>
      <Link
        href={`/blog/${article.slug}` as `/blog/${string}`}
        className="group block rounded-xl bg-surface border border-border overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lime-glow hover:border-primary/40"
      >
        <div className="relative w-full aspect-video overflow-hidden">
          <ArticleImage
            src={article.imageUrl}
            alt={isAr ? article.imageAltAr : article.imageAlt}
            width={800}
            height={450}
            className="w-full h-full object-cover transition-transform duration-slow ease-out group-hover:scale-105"
          />
        </div>
        <div className="p-5 space-y-3">
          <span className="inline-flex items-center rounded-full bg-lime-400 text-bg px-3 py-1 text-[11px] font-bold uppercase tracking-eyebrow">
            {categoryLabel}
          </span>
          <h2 className="font-display font-semibold text-lg text-fg-1 leading-snug group-hover:text-lime-400 transition-colors">
            {title}
          </h2>
          <p className="text-sm text-fg-2 leading-relaxed line-clamp-2">{excerpt}</p>
          <div className="flex items-center justify-between text-xs text-fg-3 pt-2" dir="ltr">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              {article.readTimeMinutes} min read · {date}
            </span>
            <span className="inline-flex items-center gap-1 text-lime-400 font-medium text-sm">
              {isAr ? 'اقرأ المزيد' : 'Read more'}
              <ArrowRight
                className={`w-3.5 h-3.5 transition-transform ${
                  isAr
                    ? 'rotate-180 group-hover:-translate-x-1'
                    : 'group-hover:translate-x-1'
                }`}
                strokeWidth={2}
              />
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}
