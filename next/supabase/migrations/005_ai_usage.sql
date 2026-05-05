-- ============================================================================
-- Greenofig — AI usage tracking + per-tier limits (Migration 005)
-- Run this in the Supabase SQL editor.
-- ============================================================================

-- Per-user, per-feature, per-day request counter
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  feature text not null,
  tokens_used integer default 0,
  request_count integer default 1,
  date date default current_date,
  created_at timestamptz default now(),
  unique(user_id, feature, date)
);

create index if not exists ai_usage_user_date_idx
  on public.ai_usage(user_id, date);

create index if not exists ai_usage_date_feature_idx
  on public.ai_usage(date, feature);

alter table public.ai_usage enable row level security;

drop policy if exists "ai_usage_select_own_or_admin" on public.ai_usage;
create policy "ai_usage_select_own_or_admin"
  on public.ai_usage for select
  using (
    user_id = auth.uid()
    or get_my_role() = 'admin'
  );

drop policy if exists "ai_usage_insert_own" on public.ai_usage;
create policy "ai_usage_insert_own"
  on public.ai_usage for insert
  with check (user_id = auth.uid());

drop policy if exists "ai_usage_update_own" on public.ai_usage;
create policy "ai_usage_update_own"
  on public.ai_usage for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Default per-tier limits (admin-editable via /admin/ai-limits)
-- 999 = unlimited, 0 = disabled, 1..998 = exact daily cap.
insert into public.platform_settings (key, value, description)
values
  ('ai_limits_scanner',
    '{"free": 3, "basic": 999, "premium": 999, "vip": 999}'::jsonb,
    'Daily food scanner limits per tier'),
  ('ai_limits_chat',
    '{"free": 0, "basic": 0, "premium": 50, "vip": 999}'::jsonb,
    'Daily AI chat message limits per tier'),
  ('ai_limits_research',
    '{"free": 0, "basic": 0, "premium": 20, "vip": 999}'::jsonb,
    'Daily research desk limits per tier'),
  ('ai_daily_global_cap',
    '1000'::jsonb,
    'Max total AI requests per day across all users')
on conflict (key) do nothing;
