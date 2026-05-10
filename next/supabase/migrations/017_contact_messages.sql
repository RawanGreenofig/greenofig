-- 017: contact_messages — public contact form submissions.
-- Originally applied via Supabase Studio on 2026-05-08; this file
-- captures the live schema so the repo can recreate it on a fresh
-- install. Idempotent.

create table if not exists public.contact_messages (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null,
  subject           text,
  message           text not null,
  topic             text not null default 'general',
  marketing_opt_in  boolean not null default false,
  status            text not null default 'new',
  user_id           uuid references public.profiles(id),
  user_agent        text,
  ip_country        text,
  created_at        timestamptz not null default now(),
  read_at           timestamptz,
  replied_at        timestamptz,
  admin_notes       text
);

alter table public.contact_messages enable row level security;

drop policy if exists "anon can insert contact messages" on public.contact_messages;
create policy "anon can insert contact messages"
  on public.contact_messages for insert
  with check (true);

drop policy if exists "admins manage contact messages" on public.contact_messages;
create policy "admins manage contact messages"
  on public.contact_messages for all
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
