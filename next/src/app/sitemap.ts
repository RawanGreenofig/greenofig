import type { MetadataRoute } from 'next'

/**
 * Public sitemap served at /sitemap.xml.
 *
 * Only marketing surfaces are listed — /dashboard and friends are
 * gated by auth and excluded from indexing via robots.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: 'https://greenofig.com',
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://greenofig.com/pricing',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: 'https://greenofig.com/blog',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: 'https://greenofig.com/sign-up',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: 'https://greenofig.com/sign-in',
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: 'https://greenofig.com/privacy',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://greenofig.com/terms',
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
