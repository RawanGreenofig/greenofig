-- 018: consultation_leads — quiz / lead-magnet submissions from the
-- marketing site. Originally applied via Supabase Studio on
-- 2026-05-09; this file captures the live schema. Idempotent.

create table if not exists public.consultation_leads (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text not null,
  phone           text,
  country         text,
  quiz_answers    jsonb not null default '{}'::jsonb,
  primary_goal    text,
  ebook_sent      boolean not null default false,
  thank_you_sent  boolean not null default false,
  status          text not null default 'new',
  assigned_to     uuid references public.profiles(id),
  notes           text,
  user_id         uuid references public.profiles(id),
  user_agent      text,
  ip_country      text,
  utm_source      text,
  utm_campaign    text,
  created_at      timestamptz not null default now(),
  contacted_at    timestamptz,
  converted_at    timestamptz
);

alter table public.consultation_leads enable row level security;

drop policy if exists "anon can insert consultation leads" on public.consultation_leads;
create policy "anon can insert consultation leads"
  on public.consultation_leads for insert
  with check (true);

drop policy if exists "admins and nutritionists manage consultation leads"
  on public.consultation_leads;
create policy "admins and nutritionists manage consultation leads"
  on public.consultation_leads for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array['admin'::user_role, 'nutritionist'::user_role])
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = any (array['admin'::user_role, 'nutritionist'::user_role])
    )
  );
