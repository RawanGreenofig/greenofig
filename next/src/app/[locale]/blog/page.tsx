import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ArrowRight, Clock } from 'lucide-react'
import { BLOG_ARTICLES, type BlogArticle } from '@/lib/blog-seed'
import { ArticleImage } from '@/components/blog/ArticleImage'
import { BlogSearchAndFilters } from '@/components/blog/BlogSearchAndFilters'
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
    <main
      data-blog-theme=""
      className="min-h-screen"
      style={{ background: 'var(--gf-bg)' }}
    >
      <SiteHeader />
      <div className="h-16" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Centered hero */}
        <header className="text-center mb-16">
          <span className="blog-chip mb-6">
            {isAr ? 'رؤى التغذية' : 'NUTRITION INSIGHTS'}
          </span>
          <h1
            className="font-bold tracking-tight max-w-3xl mx-auto"
            style={{
              fontSize: 'clamp(40px, 5vw, 60px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--gf-fg-1)',
            }}
          >
            {isAr
              ? 'تغذية مدعومة بالعلم،\nمشروحة ببساطة.'
              : 'Science-backed nutrition,\nexplained simply.'}
          </h1>
          <p
            className="mt-5 text-base lg:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: 'var(--gf-fg-2)' }}
          >
            {isAr
              ? 'مقالات قائمة على الأدلة لمساعدتك على الأكل بشكل أفضل وفهم جسمك.'
              : 'Evidence-based articles to help you eat better, feel your best, and understand your body.'}
          </p>

          {/* Search + category pills (client component — owns the
              hover/focus event handlers that can't live in a Server
              Component). */}
          <BlogSearchAndFilters isAr={isAr} />
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
        className="blog-card-lift group block bg-surface overflow-hidden"
        style={{
          background: 'var(--gf-surface)',
          border: '1px solid var(--gf-border)',
          borderRadius: 16,
        }}
      >
        <div className="blog-img-zoom relative w-full aspect-video">
          <ArticleImage
            src={article.imageUrl}
            alt={isAr ? article.imageAltAr : article.imageAlt}
            width={800}
            height={450}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="space-y-3" style={{ padding: '20px 22px 24px' }}>
          <span className="blog-chip">{categoryLabel}</span>
          <h2
            className="font-display font-semibold leading-snug group-hover:text-lime-400 transition-colors"
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.3,
              color: 'var(--gf-fg-1)',
              marginTop: 10,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: 'var(--gf-fg-2)',
              lineHeight: 1.55,
              marginTop: 8,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {excerpt}
          </p>
          <div
            className="flex items-center justify-between"
            style={{ fontSize: 12, color: 'var(--gf-fg-3)', marginTop: 14 }}
            dir="ltr"
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              {article.readTimeMinutes} min read
              <span
                aria-hidden
                className="inline-block rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: 'var(--gf-lime-400)',
                  margin: '0 4px',
                }}
              />
              {date}
            </span>
            <span
              className="inline-flex items-center gap-1 font-medium text-sm transition-all"
              style={{ color: 'var(--gf-lime-400)' }}
            >
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
