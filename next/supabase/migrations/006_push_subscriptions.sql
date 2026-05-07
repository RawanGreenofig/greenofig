-- Web Push subscriptions. One row per (user, endpoint) pair so a user
-- can subscribe from multiple devices. RLS lets the user manage their
-- own rows; the server uses the service-role key to read for sending.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_select_own" on public.push_subscriptions;
create policy "push_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_insert_own" on public.push_subscriptions;
create policy "push_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_update_own" on public.push_subscriptions;
create policy "push_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_delete_own" on public.push_subscriptions;
create policy "push_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Surface notifications via Supabase realtime so the bell can stream
-- inserts without polling. (notifications + push_subscriptions tables.)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
