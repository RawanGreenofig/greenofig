import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ArrowRight, ArrowLeft, Clock, Calendar, Crown, BadgeCheck } from 'lucide-react'
import { BLOG_ARTICLES, type BlogArticle } from '@/lib/blog-seed'
import { NUTRITIONIST } from '@/lib/tokens'
import { ArticleImage } from '@/components/blog/ArticleImage'
import { SiteHeader } from '@/components/SiteHeader'

interface RouteParams {
  params: { slug: string; locale: 'en' | 'ar' }
}

export function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const article = BLOG_ARTICLES.find((a) => a.slug === params.slug)
  if (!article) return { title: 'Article not found' }
  const isAr = params.locale === 'ar'
  return {
    title: `${isAr ? article.titleAr : article.title} | Greenofig`,
    description: isAr ? article.metaDescriptionAr : article.metaDescription,
    keywords: article.keywords,
    openGraph: {
      title: isAr ? article.titleAr : article.title,
      description: isAr ? article.metaDescriptionAr : article.metaDescription,
      images: [{ url: article.imageUrl, width: 1200, height: 630 }],
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [NUTRITIONIST.name],
    },
  }
}

const CATEGORY_LABEL: Record<BlogArticle['category'], { en: string; ar: string }> = {
  nutrition: { en: 'Nutrition', ar: 'تغذية' },
  'weight-loss': { en: 'Weight loss', ar: 'فقدان الوزن' },
  supplements: { en: 'Supplements', ar: 'مكملات' },
  lifestyle: { en: 'Lifestyle', ar: 'نمط حياة' },
  science: { en: 'Science', ar: 'علوم' },
}

export default async function ArticlePage({ params }: RouteParams) {
  const article = BLOG_ARTICLES.find((a) => a.slug === params.slug)
  if (!article) notFound()

  const locale = (await getLocale()) as 'en' | 'ar'
  const isAr = locale === 'ar'
  const title = isAr ? article.titleAr : article.title
  const body = isAr ? article.contentAr : article.content
  const imageAlt = isAr ? article.imageAltAr : article.imageAlt
  const categoryLabel = CATEGORY_LABEL[article.category][isAr ? 'ar' : 'en']
  const date = new Date(article.publishedAt).toLocaleDateString(isAr ? 'ar' : 'en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Related: 3 random others
  const related = BLOG_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3)

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: isAr ? article.metaDescriptionAr : article.metaDescription,
    image: article.imageUrl,
    datePublished: article.publishedAt,
    author: {
      '@type': 'Person',
      name: NUTRITIONIST.name,
      jobTitle: 'Certified Clinical Nutritionist',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Greenofig',
      url: 'https://greenofig.com',
    },
  }

  return (
    <main
      data-blog-theme=""
      className="min-h-screen"
      style={{ background: 'var(--gf-bg)' }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-10 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-fg-2 hover:text-lime-400 transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} strokeWidth={1.75} />
          {isAr ? 'كل المقالات' : 'All articles'}
        </Link>

        {/* Hero image */}
        <div
          className="relative w-full aspect-video overflow-hidden mb-8"
          style={{
            borderRadius: 20,
            border: '1px solid var(--gf-border)',
          }}
        >
          <ArticleImage
            src={article.imageUrl}
            alt={imageAlt}
            width={1200}
            height={675}
            priority
            className="w-full h-full object-cover"
          />
        </div>

        {/* Article header */}
        <header className="max-w-3xl mx-auto mb-10">
          <div
            className="flex flex-wrap items-center gap-3 font-mono mb-4"
            style={{ fontSize: 12, color: 'var(--gf-fg-3)' }}
            dir="ltr"
          >
            <span className="blog-chip">{categoryLabel}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              {article.readTimeMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3" strokeWidth={1.75} />
              {date}
            </span>
          </div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(32px, 4.5vw, 48px)',
              lineHeight: 1.1,
              fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {title}
          </h1>

          {/* Author row */}
          <div className="mt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-raised shrink-0">
              <Image
                src="/images/dr-rawan-othman.jpg"
                alt={isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
                width={48}
                height={48}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg-1 inline-flex items-center gap-1.5">
                {isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
                <BadgeCheck className="w-4 h-4 text-lime-400" strokeWidth={2} />
              </p>
              <p className="text-xs text-fg-3">
                {isAr ? NUTRITIONIST.roleAr : NUTRITIONIST.role}
              </p>
            </div>
          </div>
        </header>

        {/* Article body */}
        <article className="max-w-3xl mx-auto">
          <ArticleBody markdown={body} isAr={isAr} />
        </article>

        {/* Author card */}
        <aside
          className="blog-card-lift max-w-3xl mx-auto mt-16 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
          style={{
            background: 'var(--gf-surface)',
            border: '1px solid var(--gf-border)',
            borderRadius: 16,
          }}
        >
          <div className="w-20 h-20 rounded-full overflow-hidden bg-surface-raised shrink-0">
            <Image
              src="/images/dr-rawan-othman.jpg"
              alt={isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
              width={80}
              height={80}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-fg-1 text-lg">
              {isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
            </p>
            <p className="text-sm text-lime-400 font-semibold mb-2">
              {isAr ? NUTRITIONIST.roleAr : NUTRITIONIST.role}
            </p>
            <p className="text-sm text-fg-2 leading-relaxed">
              {isAr ? NUTRITIONIST.bio.shortAr : NUTRITIONIST.bio.short}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            {isAr ? 'احجز استشارة' : 'Book a consultation'}
            <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} strokeWidth={2} />
          </Link>
        </aside>

        {/* Related articles */}
        <section className="max-w-5xl mx-auto mt-16">
          <h2 className="font-display font-bold text-2xl text-fg-1 mb-6">
            {isAr ? 'قد يعجبك أيضاً' : 'You might also like'}
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <RelatedCard key={r.slug} article={r} isAr={isAr} />
            ))}
          </ul>
        </section>

        {/* CTA banner */}
        <section className="max-w-3xl mx-auto mt-16 rounded-2xl bg-surface border border-primary/40 p-10 text-center">
          <h2 className="font-display font-bold text-2xl text-fg-1 mb-3">
            {isAr ? 'جاهز لتغيير تغذيتك؟' : 'Ready to transform your nutrition?'}
          </h2>
          <p className="text-fg-2 mb-6">
            {isAr
              ? 'احجز استشارة مجانية مع كوتش روان وابدأ رحلتك اليوم.'
              : 'Book a free consultation with Coach Rawan and start your journey today.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-12 px-7 text-base shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            {isAr ? 'احجز استشارة' : 'Book a consultation'}
            <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} strokeWidth={2} />
          </Link>
        </section>
      </div>
    </main>
  )
}

function RelatedCard({ article, isAr }: { article: BlogArticle; isAr: boolean }) {
  const title = isAr ? article.titleAr : article.title
  return (
    <li>
      <Link
        href={`/blog/${article.slug}` as `/blog/${string}`}
        className="blog-card-lift group block overflow-hidden"
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
            width={400}
            height={225}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="font-display font-semibold text-base text-fg-1 group-hover:text-lime-400 transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="mt-2 text-[11px] text-fg-3 font-mono" dir="ltr">
            {article.readTimeMinutes} min read
          </p>
        </div>
      </Link>
    </li>
  )
}

/* ── Markdown renderer ──────────────────────────────────────────── */

interface BodyProps {
  markdown: string
  isAr: boolean
}

function ArticleBody({ markdown, isAr }: BodyProps) {
  // Parse blocks separated by blank lines
  const blocks = parseBlocks(markdown)
  return (
    <div
      className="prose-greenofig"
      style={{ fontSize: '1.075rem', lineHeight: 1.85, color: 'var(--gf-fg-2, #9baf9f)' }}
    >
      {blocks.map((block, i) => renderBlock(block, i, isAr))}
    </div>
  )
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'tip'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string }

function parseBlocks(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }

    // Tip block
    if (line.startsWith(':::tip')) {
      const buf: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== ':::') {
        buf.push(lines[i])
        i++
      }
      blocks.push({ type: 'tip', text: buf.join('\n').trim() })
      i++
      continue
    }

    // Headings
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      i++
      continue
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
      i++
      continue
    }

    // Lists
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Paragraph (collect until blank line)
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith('#') && !lines[i].startsWith(':::') && !/^[-*\d]/.test(lines[i].trim())) {
      para.push(lines[i].trim())
      i++
    }
    blocks.push({ type: 'p', text: para.join(' ') })
  }
  return blocks
}

function renderBlock(block: Block, key: number, isAr: boolean) {
  switch (block.type) {
    case 'h2':
      return (
        <h2 key={key} className="font-display font-semibold text-2xl text-fg-1 mt-10 mb-4">
          {renderInline(block.text)}
        </h2>
      )
    case 'h3':
      return (
        <h3 key={key} className="font-sans font-semibold text-xl text-fg-1 mt-8 mb-3">
          {renderInline(block.text)}
        </h3>
      )
    case 'tip':
      return (
        <aside
          key={key}
          className="my-8 rounded-r-xl bg-surface-raised border-l-4 border-primary p-5"
        >
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow font-bold text-lime-400 mb-2">
            <Crown className="w-3.5 h-3.5" strokeWidth={2} />
            {isAr ? 'نصيحة كوتش روان' : "Coach Rawan's Tip"}
          </p>
          <p className="italic text-fg-1 leading-relaxed">{renderInline(block.text)}</p>
        </aside>
      )
    case 'ul':
      return (
        <ul key={key} className="space-y-2 my-4 list-none">
          {block.items.map((it, j) => (
            <li key={j} className="flex items-start gap-3">
              <span aria-hidden className="mt-2.5 w-1.5 h-1.5 rounded-full bg-lime-400 shrink-0" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol key={key} className="space-y-2 my-4 list-decimal list-inside marker:text-lime-400 marker:font-bold">
          {block.items.map((it, j) => (
            <li key={j} className="ps-1">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      )
    case 'p':
      return (
        <p key={key} className="my-4">
          {renderInline(block.text)}
        </p>
      )
  }
}

/**
 * Inline renderer — handles **bold**, *italic*, and [text](/path) links.
 * Returns an array of React nodes.
 */
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  // Combined regex: link, bold, italic
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(text.slice(lastIndex, m.index))
    }
    if (m[1] && m[2]) {
      // Link
      parts.push(
        <Link key={key++} href={m[2] as string} className="text-lime-400 hover:underline font-medium">
          {m[1]}
        </Link>,
      )
    } else if (m[3]) {
      // Bold
      parts.push(
        <strong key={key++} className="text-fg-1 font-semibold">
          {m[3]}
        </strong>,
      )
    } else if (m[4]) {
      // Italic
      parts.push(
        <em key={key++} className="italic">
          {m[4]}
        </em>,
      )
    }
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}
