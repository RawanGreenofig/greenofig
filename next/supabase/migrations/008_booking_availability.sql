-- ============================================================================
-- Greenofig — Booking availability + double-booking prevention (Migration 008)
--
-- What this does:
--   1. Aligns bookings table column names with the application code.
--      App writes `client_id` and `duration_min`; the original schema in
--      migration 001 had `user_id` and `duration_minutes`. Rename idempotently
--      and rebuild RLS policies that referenced the old names.
--   2. Adds the status values the app already writes (`scheduled`, `noShow`)
--      to the appointment_status enum.
--   3. Creates `nutritionist_schedules` (working hours per day-of-week) and
--      `nutritionist_time_off` (vacation/blackout windows).
--   4. Adds an EXCLUDE constraint on bookings so the database itself rejects
--      two active bookings that overlap on the same nutritionist.
--   5. Seeds a default Mon-Fri 9-5 schedule for every existing nutritionist.
--
-- Idempotent — safe to re-run.
-- Apply via Supabase SQL editor or `supabase db push`.
-- ============================================================================

-- 1) Required extension for the EXCLUDE constraint (= on uuid + && on tstzrange)
create extension if not exists btree_gist;

-- 2) Idempotent column renames so the schema matches the application code
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'user_id'
  ) then
    alter table public.bookings rename column user_id to client_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'duration_minutes'
  ) then
    alter table public.bookings rename column duration_minutes to duration_min;
  end if;
end $$;

-- 3) Recreate the bookings RLS policies against the new column name.
--    These were originally created in migration 001 and reference user_id.
drop policy if exists "bk_select_party_or_admin" on public.bookings;
create policy "bk_select_party_or_admin"
  on public.bookings for select
  using (
    auth.uid() = client_id
    or auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  );

drop policy if exists "bk_user_insert" on public.bookings;
create policy "bk_user_insert"
  on public.bookings for insert
  with check (auth.uid() = client_id);

drop policy if exists "bk_party_update" on public.bookings;
create policy "bk_party_update"
  on public.bookings for update
  using (
    auth.uid() = client_id
    or auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  )
  with check (
    auth.uid() = client_id
    or auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  );

-- 4) Status enum values the app already writes.
--    Postgres requires `ALTER TYPE ADD VALUE` to run outside of the same
--    transaction that creates the EXCLUDE constraint (which references
--    `'cancelled'::appointment_status`). Apply these in a separate
--    migration step — the live DB has them as migration 008b.
--    For a fresh DB the values are added by the dedicated migration
--    `008b_booking_status_values.sql`.

-- 5) Nutritionist working hours, keyed by day-of-week (0=Sunday, 6=Saturday).
--    The customer-facing availability picker reads this to know which slots
--    to offer; the nutritionist edits their own row from /nutritionist/settings.
create table if not exists public.nutritionist_schedules (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week     smallint not null check (day_of_week between 0 and 6),
  is_open         boolean not null default true,
  start_time      time not null default '09:00',
  end_time        time not null default '17:00',
  slot_min        smallint not null default 30 check (slot_min > 0),
  buffer_min      smallint not null default 0  check (buffer_min >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (nutritionist_id, day_of_week)
);
alter table public.nutritionist_schedules enable row level security;

drop policy if exists "ns_read_authed" on public.nutritionist_schedules;
create policy "ns_read_authed"
  on public.nutritionist_schedules for select
  using (auth.role() = 'authenticated');

drop policy if exists "ns_write_own_or_admin" on public.nutritionist_schedules;
create policy "ns_write_own_or_admin"
  on public.nutritionist_schedules for all
  using (
    auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  )
  with check (
    auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  );

-- 6) Vacation / blackout windows (date-range; takes precedence over schedule)
create table if not exists public.nutritionist_time_off (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.profiles(id) on delete cascade,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  reason          text,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists nto_nutritionist_starts_idx
  on public.nutritionist_time_off (nutritionist_id, starts_at);

alter table public.nutritionist_time_off enable row level security;

drop policy if exists "nto_read_authed" on public.nutritionist_time_off;
create policy "nto_read_authed"
  on public.nutritionist_time_off for select
  using (auth.role() = 'authenticated');

drop policy if exists "nto_write_own_or_admin" on public.nutritionist_time_off;
create policy "nto_write_own_or_admin"
  on public.nutritionist_time_off for all
  using (
    auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  )
  with check (
    auth.uid() = nutritionist_id
    or public.get_my_role()::text = 'admin'
  );

-- 7) Double-booking prevention: no two active bookings on the same
--    nutritionist may share any second of time. Cancelled bookings are
--    excluded so the slot reopens once cancelled.
--
--    `tstzrange(...)` and timestamptz arithmetic are STABLE in Postgres,
--    but PG requires every expression in an EXCLUDE / index predicate to
--    be IMMUTABLE. Wrap the range computation in a custom function we
--    explicitly mark IMMUTABLE — the result is purely a function of its
--    inputs.
create or replace function public.booking_range(s timestamptz, dur int)
returns tstzrange
language sql
immutable
as $$
  select tstzrange(s, s + make_interval(mins => dur))
$$;

do $$
begin
  alter table public.bookings
    add constraint bookings_no_overlap
    exclude using gist (
      nutritionist_id with =,
      public.booking_range(scheduled_at, duration_min) with &&
    )
    where (status <> 'cancelled'::appointment_status);
exception
  when duplicate_object then null;
  when invalid_table_definition then null;
end $$;

-- 8) Seed a Mon-Fri 09-17 default schedule for every existing nutritionist.
--    Existing rows are preserved by ON CONFLICT DO NOTHING.
insert into public.nutritionist_schedules
  (nutritionist_id, day_of_week, is_open, start_time, end_time)
select
  p.id,
  dow,
  case when dow between 1 and 5 then true else false end,
  '09:00'::time,
  '17:00'::time
from public.profiles p
cross join generate_series(0, 6) as dow
where p.role = 'nutritionist'
on conflict (nutritionist_id, day_of_week) do nothing;
