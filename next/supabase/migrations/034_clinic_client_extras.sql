-- 034: clinic client extras — end date, insurance, and a plan/progress log
--
--  * end_date / insured / insurance_provider on clinic_clients.
--  * clinic_client_log: a timestamped per-client journal so the coach
--    records what she GAVE the client (meal plans) and the CHANGES she
--    observed (progress), plus free notes — to know what to give next.
--    (Payment amounts & dues already live in clinic_payments / 031.)

begin;

alter table public.clinic_clients
  add column if not exists end_date date,
  add column if not exists insured boolean not null default false,
  add column if not exists insurance_provider text;

create table if not exists public.clinic_client_log (
  id uuid primary key default gen_random_uuid(),
  clinic_client_id uuid not null references public.clinic_clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'note' check (kind in ('meal_plan', 'progress', 'note')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinic_client_log_client
  on public.clinic_client_log(clinic_client_id, created_at desc);

alter table public.clinic_client_log enable row level security;

drop policy if exists "ccl_select_own_or_admin" on public.clinic_client_log;
create policy "ccl_select_own_or_admin"
  on public.clinic_client_log for select
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "ccl_insert_own" on public.clinic_client_log;
create policy "ccl_insert_own"
  on public.clinic_client_log for insert
  with check (
    (coach_id = auth.uid() and public.get_my_role() in ('nutritionist', 'admin'))
    or public.get_my_role() = 'admin'
  );

drop policy if exists "ccl_delete_own_or_admin" on public.clinic_client_log;
create policy "ccl_delete_own_or_admin"
  on public.clinic_client_log for delete
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

commit;
