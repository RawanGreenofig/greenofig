-- ============================================================================
-- Greenofig — Posts/recipes UI columns (Migration 011)
--
-- Adds the five UI-side columns the dashboards have always written but
-- the DB silently dropped on every save:
--
--   posts.excerpt          — short summary shown above body
--   posts.audience         — tier-gating: 'all' | 'basic' | 'premium' | 'vip'
--   posts.hue              — per-card accent color (e.g. 'rgb(... / 0.18)')
--   recipes.category       — 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
--   recipes.hue            — per-card accent color
--
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.posts
  add column if not exists excerpt text,
  add column if not exists audience text not null default 'all',
  add column if not exists hue text;

do $$
begin
  alter table public.posts
    add constraint posts_audience_check
    check (audience in ('all','basic','premium','vip'));
exception when duplicate_object then null; end $$;

alter table public.recipes
  add column if not exists category text not null default 'lunch',
  add column if not exists hue text;

do $$
begin
  alter table public.recipes
    add constraint recipes_category_check
    check (category in ('breakfast','lunch','dinner','snack','drink'));
exception when duplicate_object then null; end $$;
