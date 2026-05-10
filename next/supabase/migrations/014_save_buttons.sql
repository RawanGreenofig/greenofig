-- 014: Persist three previously UI-only Save flows.
--
-- saved_recipes — customer bookmarks on /dashboard/recipes. Composite
-- PK so the same user can't double-bookmark a recipe; ON DELETE CASCADE
-- keeps the join clean when a recipe or profile is removed.
--
-- scheduled_export_jobs — admin-configured periodic CSV exports. Stored
-- here so the UI list survives reload; an actual scheduler (pg_cron or
-- a cron worker) can poll this table to dispatch when due. The
-- `next_run_at` column is left null for now and computed lazily by
-- whatever picks the rows up.
--
-- Both tables are RLS-gated: saved_recipes is per-user; scheduled jobs
-- are admin-only.

create table if not exists public.saved_recipes (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);
alter table public.saved_recipes enable row level security;
drop policy if exists "saved_recipes_self_read"   on public.saved_recipes;
drop policy if exists "saved_recipes_self_write"  on public.saved_recipes;
drop policy if exists "saved_recipes_self_delete" on public.saved_recipes;
create policy "saved_recipes_self_read"
  on public.saved_recipes for select using (user_id = auth.uid());
create policy "saved_recipes_self_write"
  on public.saved_recipes for insert with check (user_id = auth.uid());
create policy "saved_recipes_self_delete"
  on public.saved_recipes for delete using (user_id = auth.uid());

create index if not exists idx_saved_recipes_user
  on public.saved_recipes (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────
create table if not exists public.scheduled_export_jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,            -- 'subscriptions' | 'orders' | …
  format       text not null,            -- 'csv' | 'json'
  frequency    text not null,            -- 'daily' | 'weekly' | 'monthly'
  email        text not null,
  is_active    boolean not null default true,
  next_run_at  timestamptz,
  last_run_at  timestamptz,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
alter table public.scheduled_export_jobs enable row level security;
drop policy if exists "sej_admin_only" on public.scheduled_export_jobs;
create policy "sej_admin_only"
  on public.scheduled_export_jobs for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

create index if not exists idx_sej_active_next
  on public.scheduled_export_jobs (is_active, next_run_at);
