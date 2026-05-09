-- ============================================================================
-- Greenofig — posts.pinned (Migration 012)
--
-- Adds a boolean `pinned` flag to posts so the admin/content "pin" toggle
-- actually persists across reloads. A partial index on pinned=true keeps
-- the "show pinned first" sort fast even when most posts aren't pinned.
--
-- Idempotent.
-- ============================================================================

alter table public.posts
  add column if not exists pinned boolean not null default false;

create index if not exists posts_pinned_idx
  on public.posts (pinned) where pinned = true;
