import type { MetadataRoute } from 'next'
import { BLOG_ARTICLES } from '@/lib/blog-seed'

/**
 * Public sitemap served at /sitemap.xml.
 *
 * Only marketing surfaces are listed — /dashboard and friends are
 * gated by auth and excluded from indexing via robots.ts. Blog post
 * detail pages are folded in from the seed list so every article URL
 * is discoverable by crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const base = 'https://greenofig.com'

  const core: MetadataRoute.Sitemap = [
    { url: base,                       lastModified: now, changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/pricing`,          lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/about`,            lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/coach-rawan-othman`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/blog`,             lastModified: now, changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/reviews`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/careers`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/download`,         lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${base}/contact`,          lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/sign-up`,          lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/sign-in`,          lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/privacy`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/terms`,            lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/cookies`,          lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${base}/accessibility`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  const blog: MetadataRoute.Sitemap = BLOG_ARTICLES.map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: a.publishedAt ? new Date(a.publishedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [...core, ...blog]
}
