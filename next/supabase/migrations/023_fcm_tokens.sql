-- 023: FCM tokens for native Android (Capacitor wrapper).
--
-- Browser web-push subscriptions continue to live in
-- public.push_subscriptions (endpoint + p256dh + auth). The native
-- Android app uses Firebase Cloud Messaging which gives us a single
-- opaque token per device — different shape. Keeping them in a
-- separate table avoids polluting the well-tested web-push pipeline.
--
-- The notification dispatcher reads from BOTH tables when sending
-- a broadcast so a user with both a browser and the APK gets the
-- notification in both places.

create table if not exists public.fcm_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null default 'android',
  app_version text,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.fcm_tokens enable row level security;

-- Owner can read/manage their own tokens. Service role bypasses RLS
-- so the broadcast sender can fan out across users.
drop policy if exists "fcm_tokens_owner_select" on public.fcm_tokens;
create policy "fcm_tokens_owner_select"
  on public.fcm_tokens for select
  using (user_id = auth.uid());

drop policy if exists "fcm_tokens_owner_insert" on public.fcm_tokens;
create policy "fcm_tokens_owner_insert"
  on public.fcm_tokens for insert
  with check (user_id = auth.uid());

drop policy if exists "fcm_tokens_owner_update" on public.fcm_tokens;
create policy "fcm_tokens_owner_update"
  on public.fcm_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "fcm_tokens_owner_delete" on public.fcm_tokens;
create policy "fcm_tokens_owner_delete"
  on public.fcm_tokens for delete
  using (user_id = auth.uid());

create index if not exists idx_fcm_tokens_user_id
  on public.fcm_tokens (user_id);
