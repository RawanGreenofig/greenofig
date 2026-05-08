-- ============================================================================
-- Greenofig — AI chat tables (Migration 007)
-- Exact columns the /api/ai-chat route uses, confirmed by reading
-- src/app/api/ai-chat/route.ts + src/lib/ai-usage.ts. Idempotent — safe
-- to re-run.
-- Paste in Supabase SQL editor or apply via the Supabase CLI.
-- ============================================================================

-- 1) RLS helper. The function already exists from migration 001 and
--    returns `user_role` (the enum). DON'T recreate — Postgres rejects
--    a return-type change without DROP CASCADE, which would also nuke
--    every policy that already uses it across the rest of the schema.
--    The policies below cast the enum to text so 'admin' compares cleanly.


-- 2) ai_conversations
create table if not exists public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null default 'chat',
  messages    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.ai_conversations
  add column if not exists kind text not null default 'chat';
create index if not exists ai_conversations_user_idx
  on public.ai_conversations(user_id);

alter table public.ai_conversations enable row level security;

drop policy if exists "aic_select_own_or_admin" on public.ai_conversations;
create policy "aic_select_own_or_admin"
  on public.ai_conversations for select
  using (auth.uid() = user_id or public.get_my_role()::text = 'admin');

drop policy if exists "aic_user_write" on public.ai_conversations;
create policy "aic_user_write"
  on public.ai_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- 3) ai_usage
create table if not exists public.ai_usage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  feature         text not null,
  request_count   integer not null default 1,
  tokens_used     integer default 0,
  date            date not null default current_date,
  created_at      timestamptz default now(),
  unique (user_id, feature, date)
);
create index if not exists ai_usage_user_date_idx
  on public.ai_usage(user_id, date);
create index if not exists ai_usage_date_feature_idx
  on public.ai_usage(date, feature);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own_or_admin" on public.ai_usage;
create policy "ai_usage_select_own_or_admin"
  on public.ai_usage for select
  using (user_id = auth.uid() or public.get_my_role()::text = 'admin');

drop policy if exists "ai_usage_insert_own" on public.ai_usage;
create policy "ai_usage_insert_own"
  on public.ai_usage for insert
  with check (user_id = auth.uid());

drop policy if exists "ai_usage_update_own" on public.ai_usage;
create policy "ai_usage_update_own"
  on public.ai_usage for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- 4) platform_settings + seed
create table if not exists public.platform_settings (
  key          text primary key,
  value        jsonb not null,
  description  text,
  updated_at   timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

drop policy if exists "ps_read_all_authed" on public.platform_settings;
create policy "ps_read_all_authed"
  on public.platform_settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "ps_write_admin" on public.platform_settings;
create policy "ps_write_admin"
  on public.platform_settings for all
  using (public.get_my_role()::text = 'admin')
  with check (public.get_my_role()::text = 'admin');

insert into public.platform_settings (key, value, description) values
  ('ai_limits_chat',
    '{"free": 0, "basic": 0, "premium": 50, "vip": 999}'::jsonb,
    'Daily AI chat (Figy) message limits per tier'),
  ('ai_limits_scanner',
    '{"free": 3, "basic": 999, "premium": 999, "vip": 999}'::jsonb,
    'Daily food scanner limits per tier'),
  ('ai_limits_research',
    '{"free": 0, "basic": 0, "premium": 20, "vip": 999}'::jsonb,
    'Daily research desk limits per tier'),
  ('ai_daily_global_cap',
    '1000'::jsonb,
    'Max total AI requests per day across all users')
on conflict (key) do nothing;
