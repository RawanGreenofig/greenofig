import type { MetadataRoute } from 'next'

/**
 * /robots.txt — allow indexing of marketing pages, block the
 * authenticated app surfaces. Points crawlers at /sitemap.xml.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/nutritionist/',
          '/onboarding/',
          '/api/',
          '/auth/',
        ],
      },
    ],
    sitemap: 'https://greenofig.com/sitemap.xml',
  }
}
