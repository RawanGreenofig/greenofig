/* eslint-disable no-console */
/**
 * Seed Greenofig blog posts into Supabase.
 *
 * Usage:  npm run seed:blog
 *
 * Reads `next/.env.local` for SUPABASE creds.
 * Maps `BLOG_ARTICLES` from `src/lib/blog-seed.ts` into the `posts` schema
 * defined in `supabase/migrations/001_greenofig.sql` + `002_add_blog_columns.sql`.
 *
 * Idempotent: uses upsert with onConflict: 'slug' so re-runs update existing rows.
 */

import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { BLOG_ARTICLES } from '../src/lib/blog-seed'

// Load env from next/.env.local (script runs from `next/`)
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) loadEnv({ path: envPath })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[seed-blog] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function seedBlog() {
  console.log(`[seed-blog] Seeding ${BLOG_ARTICLES.length} articles into posts table…`)

  let ok = 0
  let fail = 0

  for (const a of BLOG_ARTICLES) {
    // Map schema: 001 columns + 002 additions
    const row = {
      slug: a.slug,
      title: a.title,
      title_ar: a.titleAr,
      body: a.content,
      body_ar: a.contentAr,
      excerpt: a.metaDescription,
      meta_description: a.metaDescription,
      meta_description_ar: a.metaDescriptionAr,
      hero_image_url: a.imageUrl,
      image_alt: a.imageAlt,
      image_alt_ar: a.imageAltAr,
      category: a.category,
      tags: a.tags,
      keywords: a.keywords,
      read_time_minutes: a.readTimeMinutes,
      audience: 'public',
      status: 'published' as const,
      is_published: true,
      publish_at: a.publishedAt,
    }

    const { error } = await supabase
      .from('posts')
      .upsert(row, { onConflict: 'slug' })

    if (error) {
      console.error(`  ✗ ${a.slug}: ${error.message}`)
      fail++
    } else {
      console.log(`  ✓ ${a.slug}`)
      ok++
    }
  }

  console.log(`\n[seed-blog] Done. ${ok} ok, ${fail} failed.`)
  if (fail > 0) process.exit(1)
}

void seedBlog()
