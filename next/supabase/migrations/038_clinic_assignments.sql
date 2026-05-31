-- 038: clinic assignments (meal plans / recipes) + analysis recommendations
--
-- The coach assigns a meal plan or recipe to a walk-in client; the
-- linked client checks it off when they do it. Completion = adherence
-- signal that feeds the per-client AI analysis (which now also outputs
-- recommendations for what to give next).

begin;

create table if not exists public.clinic_assignments (
  id uuid primary key default gen_random_uuid(),
  clinic_client_id uuid not null references public.clinic_clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'meal_plan' check (kind in ('meal_plan', 'recipe')),
  title text not null,
  details text,
  link text,
  status text not null default 'assigned' check (status in ('assigned', 'done')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinic_assignments_client
  on public.clinic_assignments(clinic_client_id, created_at desc);

alter table public.clinic_assignments enable row level security;

-- Coach/admin manage; client-side reads/check-offs go through service-role
-- APIs that verify ownership via clinic_clients.user_id.
drop policy if exists "casg_select_own_or_admin" on public.clinic_assignments;
create policy "casg_select_own_or_admin"
  on public.clinic_assignments for select
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "casg_write_own_or_admin" on public.clinic_assignments;
create policy "casg_write_own_or_admin"
  on public.clinic_assignments for all
  using (coach_id = auth.uid() or public.get_my_role() = 'admin')
  with check (coach_id = auth.uid() or public.get_my_role() = 'admin');

-- AI recommendations on the analysis (what to give next).
alter table public.clinic_analysis
  add column if not exists recommendations text;

commit;
