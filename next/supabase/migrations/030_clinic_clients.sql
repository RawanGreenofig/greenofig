-- 030: clinic-only clients + walk-in bookings
--
-- The coach runs a physical nutrition clinic alongside the website.
-- Some clients walk in (cash or in-person card) and never sign up
-- online — they have no auth.users row, so they can't have a profiles
-- row either. This migration introduces a parallel "clinic_clients"
-- table for those people and extends `bookings` so a single booking
-- row can belong to either an online user OR a walk-in (never both).
--
-- Design choices:
--   * clinic_clients is owned by exactly one coach (coach_id). Multi-
--     coach clinics keep their books separate. Head coach can re-assign.
--   * Walk-ins are intentionally NOT linkable to a future online
--     account — the user asked us to keep the two universes apart so
--     online sign-ups always look fresh.
--   * Payment fields cover the mixed cash/card/online reality of an
--     in-person clinic. Online sessions paid via Stripe leave these
--     null and rely on stripe_payment_intent_id as before.

-- ============================================================================
-- clinic_clients
-- ============================================================================
create table if not exists public.clinic_clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  date_of_birth date,
  gender text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clinic_clients_coach
  on public.clinic_clients(coach_id);
create index if not exists idx_clinic_clients_phone
  on public.clinic_clients(phone)
  where phone is not null;

alter table public.clinic_clients enable row level security;

-- Only the owning coach + admins can see or edit. Walk-ins have no
-- session of their own, so we never expose their rows to auth.uid()
-- outside of staff roles.
drop policy if exists "cc_select_own_or_admin" on public.clinic_clients;
create policy "cc_select_own_or_admin"
  on public.clinic_clients for select
  using (
    coach_id = auth.uid()
    or public.get_my_role() = 'admin'
  );

drop policy if exists "cc_insert_self_coach" on public.clinic_clients;
create policy "cc_insert_self_coach"
  on public.clinic_clients for insert
  with check (
    coach_id = auth.uid()
    and public.get_my_role() in ('nutritionist', 'admin')
  );

drop policy if exists "cc_update_own_or_admin" on public.clinic_clients;
create policy "cc_update_own_or_admin"
  on public.clinic_clients for update
  using (
    coach_id = auth.uid()
    or public.get_my_role() = 'admin'
  )
  with check (
    coach_id = auth.uid()
    or public.get_my_role() = 'admin'
  );

drop policy if exists "cc_delete_own_or_admin" on public.clinic_clients;
create policy "cc_delete_own_or_admin"
  on public.clinic_clients for delete
  using (
    coach_id = auth.uid()
    or public.get_my_role() = 'admin'
  );

-- Mirror the updated_at trigger pattern used elsewhere in this schema
create or replace function public.set_updated_at_clinic_clients()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clinic_clients_updated_at on public.clinic_clients;
create trigger trg_clinic_clients_updated_at
  before update on public.clinic_clients
  for each row execute function public.set_updated_at_clinic_clients();

-- ============================================================================
-- bookings: optional walk-in branch + payment tracking
-- ============================================================================
-- A booking now belongs to EITHER an online client_id OR a
-- clinic_client_id. (Migration 008 renamed user_id → client_id, so
-- that's the column we touch here.) Existing rows all have client_id
-- set and clinic_client_id NULL, so the new check passes for the
-- entire backlog.
alter table public.bookings
  alter column client_id drop not null,
  add column if not exists clinic_client_id uuid
    references public.clinic_clients(id) on delete cascade,
  add column if not exists payment_method text
    check (payment_method in ('cash','card','transfer','online','other')),
  add column if not exists is_paid boolean not null default false,
  add column if not exists amount_paid_cents int;

-- Drop-and-recreate so re-running the migration is idempotent.
alter table public.bookings
  drop constraint if exists bookings_client_xor_walkin;
alter table public.bookings
  add constraint bookings_client_xor_walkin
    check ((client_id is null) <> (clinic_client_id is null));

create index if not exists idx_bookings_clinic_client
  on public.bookings(clinic_client_id, scheduled_at desc)
  where clinic_client_id is not null;

-- ============================================================================
-- bookings RLS: allow the coach to insert walk-in bookings
-- ============================================================================
-- The original bk_user_insert policy (migration 008) required
-- auth.uid() = client_id, which forbade the coach from creating a
-- booking on behalf of a walk-in (client_id would be NULL). Replace
-- it with a policy that accepts EITHER the online-self-insert OR a
-- coach inserting a clinic_client booking they own.
drop policy if exists "bk_user_insert" on public.bookings;
drop policy if exists "bk_insert_self_or_coach_walkin" on public.bookings;
create policy "bk_insert_self_or_coach_walkin"
  on public.bookings for insert
  with check (
    -- Online client booking themselves (existing path)
    (auth.uid() = client_id and clinic_client_id is null)
    -- OR: coach creating a walk-in booking for one of their own
    -- clinic_clients. We check coach_id via a subquery so we never
    -- trust a client-side claim.
    or (
      client_id is null
      and clinic_client_id is not null
      and exists (
        select 1 from public.clinic_clients cc
        where cc.id = clinic_client_id
          and cc.coach_id = auth.uid()
      )
    )
    or public.get_my_role()::text = 'admin'
  );
