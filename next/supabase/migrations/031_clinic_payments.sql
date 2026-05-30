-- 031: clinic payment ledger + due-date tracking
--
-- Walk-in clinic clients (030) pay in the mixed cash/card/transfer
-- reality of a physical clinic, sometimes on a plan with money still
-- owed. Per-visit payment lives on bookings (030: is_paid /
-- payment_method / amount_paid_cents). This adds a standalone LEDGER so
-- the coach can record payments and amounts DUE with a due date — and
-- get a notification when something becomes due/overdue.
--
-- Design:
--   * One row per payment/charge, owned by the same coach as the client.
--   * status 'due' until marked 'paid' (stamps paid_at).
--   * due_notified_at is stamped the first time we raise a "payment due"
--     notification so the coach isn't pinged about the same row twice.

begin;

create table if not exists public.clinic_payments (
  id uuid primary key default gen_random_uuid(),
  clinic_client_id uuid not null references public.clinic_clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD',
  status text not null default 'due' check (status in ('due', 'paid')),
  due_date date,
  paid_at timestamptz,
  method text check (method in ('cash', 'card', 'transfer', 'online', 'other')),
  notes text,
  due_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clinic_payments_client
  on public.clinic_payments(clinic_client_id);
create index if not exists idx_clinic_payments_coach
  on public.clinic_payments(coach_id);
create index if not exists idx_clinic_payments_due
  on public.clinic_payments(coach_id, due_date)
  where status = 'due';

alter table public.clinic_payments enable row level security;

-- Mirror clinic_clients: only the owning coach + admins.
drop policy if exists "cp_select_own_or_admin" on public.clinic_payments;
create policy "cp_select_own_or_admin"
  on public.clinic_payments for select
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "cp_insert_own_coach" on public.clinic_payments;
create policy "cp_insert_own_coach"
  on public.clinic_payments for insert
  with check (
    (coach_id = auth.uid() and public.get_my_role() in ('nutritionist', 'admin'))
    or public.get_my_role() = 'admin'
  );

drop policy if exists "cp_update_own_or_admin" on public.clinic_payments;
create policy "cp_update_own_or_admin"
  on public.clinic_payments for update
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "cp_delete_own_or_admin" on public.clinic_payments;
create policy "cp_delete_own_or_admin"
  on public.clinic_payments for delete
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

-- updated_at trigger (own function, mirroring 030's per-table style).
create or replace function public.set_updated_at_clinic_payments()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clinic_payments_updated_at on public.clinic_payments;
create trigger trg_clinic_payments_updated_at
  before update on public.clinic_payments
  for each row execute function public.set_updated_at_clinic_payments();

commit;
