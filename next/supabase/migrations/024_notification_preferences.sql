-- 024: per-user preferences for Capacitor local notifications.
--
-- Drives the Android wrapper's on-device reminder schedule
-- (meals, hydration, workout). The Capacitor app reads this row
-- on sign-in and after each settings change, then calls
-- @capacitor/local-notifications schedule() to materialise the
-- reminders. No server-side fan-out — these are *local*
-- notifications fired by the device's own scheduler, separate
-- from the push pipeline in 023_fcm_tokens.sql.
--
-- One row per user (PK = user_id). Inserted lazily by the
-- settings page when the user first lands on it; defaults match
-- what the app would schedule if no row existed.

create table if not exists public.notification_preferences (
  user_id                    uuid primary key references public.profiles(id) on delete cascade,

  -- Meals
  breakfast_enabled          boolean not null default true,
  breakfast_time             time    not null default '08:00:00',
  lunch_enabled              boolean not null default true,
  lunch_time                 time    not null default '13:00:00',
  dinner_enabled             boolean not null default true,
  dinner_time                time    not null default '19:00:00',

  -- Hydration: fire every `interval_hours` between start and end (inclusive).
  hydration_enabled          boolean not null default true,
  hydration_start_time       time    not null default '09:00:00',
  hydration_end_time         time    not null default '21:00:00',
  hydration_interval_hours   int     not null default 2 check (hydration_interval_hours between 1 and 12),

  -- Workout
  workout_enabled            boolean not null default true,
  workout_time               time    not null default '18:00:00',

  updated_at                 timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs_owner_select" on public.notification_preferences;
create policy "notif_prefs_owner_select"
  on public.notification_preferences for select
  using (user_id = auth.uid());

drop policy if exists "notif_prefs_owner_insert" on public.notification_preferences;
create policy "notif_prefs_owner_insert"
  on public.notification_preferences for insert
  with check (user_id = auth.uid());

drop policy if exists "notif_prefs_owner_update" on public.notification_preferences;
create policy "notif_prefs_owner_update"
  on public.notification_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notif_prefs_owner_delete" on public.notification_preferences;
create policy "notif_prefs_owner_delete"
  on public.notification_preferences for delete
  using (user_id = auth.uid());

-- Touch updated_at on every UPDATE so the Capacitor app can use it
-- as a cheap "do I need to reschedule?" check.
create or replace function public.tg_notification_preferences_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists notification_preferences_touch on public.notification_preferences;
create trigger notification_preferences_touch
  before update on public.notification_preferences
  for each row execute function public.tg_notification_preferences_touch();
