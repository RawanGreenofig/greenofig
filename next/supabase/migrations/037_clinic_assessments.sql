-- 037: structured clinic progress assessments + per-client analysis
--
-- Replaces the free-text "progress" notes with real check-in data the
-- coach (or the client, via the update link) fills into fields, plus a
-- per-client analysis (what improved / what needs work) the coach keeps
-- on the profile (AI-assisted from the assessment history).

begin;

create table if not exists public.clinic_assessments (
  id uuid primary key default gen_random_uuid(),
  clinic_client_id uuid not null references public.clinic_clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  source text not null default 'coach' check (source in ('coach', 'client')),
  -- body metrics
  weight_kg numeric,
  waist_cm numeric,
  hip_cm numeric,
  arm_cm numeric,
  thigh_cm numeric,
  -- 1-5 self/observed ratings
  energy smallint check (energy between 1 and 5),
  sleep smallint check (sleep between 1 and 5),
  adherence smallint check (adherence between 1 and 5),
  appetite smallint check (appetite between 1 and 5),
  -- free text
  wins text,
  challenges text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_clinic_assessments_client
  on public.clinic_assessments(clinic_client_id, created_at desc);

alter table public.clinic_assessments enable row level security;

drop policy if exists "ca_select_own_or_admin" on public.clinic_assessments;
create policy "ca_select_own_or_admin"
  on public.clinic_assessments for select
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "ca_insert_own" on public.clinic_assessments;
create policy "ca_insert_own"
  on public.clinic_assessments for insert
  with check (
    (coach_id = auth.uid() and public.get_my_role() in ('nutritionist', 'admin'))
    or public.get_my_role() = 'admin'
  );

drop policy if exists "ca_delete_own_or_admin" on public.clinic_assessments;
create policy "ca_delete_own_or_admin"
  on public.clinic_assessments for delete
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

-- One analysis row per client (improvements / needs-improvement / summary).
create table if not exists public.clinic_analysis (
  clinic_client_id uuid primary key references public.clinic_clients(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  improvements text,
  needs_improvement text,
  summary text,
  updated_at timestamptz not null default now()
);

alter table public.clinic_analysis enable row level security;

drop policy if exists "can_select_own_or_admin" on public.clinic_analysis;
create policy "can_select_own_or_admin"
  on public.clinic_analysis for select
  using (coach_id = auth.uid() or public.get_my_role() = 'admin');

drop policy if exists "can_write_own_or_admin" on public.clinic_analysis;
create policy "can_write_own_or_admin"
  on public.clinic_analysis for all
  using (coach_id = auth.uid() or public.get_my_role() = 'admin')
  with check (coach_id = auth.uid() or public.get_my_role() = 'admin');

commit;
