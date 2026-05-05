-- ============================================================================
-- Greenofig — Blog columns + slug (Migration 002)
-- Adds the columns needed by scripts/seed-blog.ts and the public blog pages.
-- Run this in the Supabase SQL editor as a privileged role.
-- ============================================================================

-- Slug for SEO-friendly URLs
alter table public.posts add column if not exists slug text;
create unique index if not exists posts_slug_unique on public.posts (slug) where slug is not null;
create index if not exists posts_slug_idx on public.posts (slug);

-- Bilingual fields used by the blog listing/article pages
alter table public.posts add column if not exists title_ar text;
alter table public.posts add column if not exists body_ar text;
alter table public.posts add column if not exists meta_description text;
alter table public.posts add column if not exists meta_description_ar text;
alter table public.posts add column if not exists image_alt text;
alter table public.posts add column if not exists image_alt_ar text;

-- Tags as a text array (the seed script writes a `tags` array per article)
alter table public.posts add column if not exists tags text[] default '{}';

-- SEO keywords array
alter table public.posts add column if not exists keywords text[] default '{}';

-- Read-time estimate
alter table public.posts add column if not exists read_time_minutes integer;

-- Public flag (alias for status='published'; lets us flip without migrations)
alter table public.posts add column if not exists is_published boolean not null default false;

-- Backfill is_published from existing status column — only if that column exists.
-- Some installs don't have a `status` column; skip silently in that case.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'status'
  ) then
    execute $sql$update public.posts set is_published = true where status = 'published' and is_published = false$sql$;
  end if;
end $$;

-- Fast index for the public listing query.
-- Uses publish_at if present, otherwise falls back to created_at.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'posts'
      and column_name = 'publish_at'
  ) then
    execute 'create index if not exists posts_published_at_idx on public.posts (publish_at desc) where is_published = true';
  else
    execute 'create index if not exists posts_published_at_idx on public.posts (created_at desc) where is_published = true';
  end if;
end $$;
