-- 021: Careers (job postings + applications) + message oversight for
-- admin and head coach.
--
-- TWO PARTS:
--
-- A. Careers
--    job_postings — admin creates/edits, public reads when published.
--    job_applications — anyone can submit (anon apply form), only
--    the HEAD COACH (Coach Rawan) reviews and interviews. Admin can
--    see applications for awareness but the interview workflow is
--    head-coach-only by RLS.
--
-- B. Message oversight
--    Admin and head coach get SELECT access to every message in the
--    messages table so they can monitor team-coach ↔ customer
--    conversations for quality and customer-service review. The
--    existing party/recipient policies still apply for INSERT/UPDATE
--    so monitoring is read-only.

create table if not exists public.job_postings (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  department         text,
  location           text,
  job_type           text not null default 'full_time',
  summary            text not null,
  description        text not null,
  requirements       text[] not null default '{}'::text[],
  responsibilities   text[] not null default '{}'::text[],
  benefits           text[] not null default '{}'::text[],
  salary_min         integer,
  salary_max         integer,
  salary_currency    text default 'USD',
  is_published       boolean not null default false,
  published_at       timestamptz,
  created_by         uuid references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.job_postings enable row level security;

drop policy if exists "anyone reads published job postings" on public.job_postings;
create policy "anyone reads published job postings"
  on public.job_postings for select
  using (is_published = true);

drop policy if exists "admins manage job postings" on public.job_postings;
create policy "admins manage job postings"
  on public.job_postings for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

drop policy if exists "head coach reads all postings" on public.job_postings;
create policy "head coach reads all postings"
  on public.job_postings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_head_coach = true
    )
  );

create index if not exists idx_job_postings_published
  on public.job_postings (is_published, published_at desc)
  where is_published = true;

-- ── Applications ────────────────────────────────────────────────────
create table if not exists public.job_applications (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid not null references public.job_postings(id) on delete cascade,
  applicant_name  text not null,
  applicant_email text not null,
  applicant_phone text,
  cover_letter    text,
  resume_url      text,
  linkedin_url    text,
  status          text not null default 'new',
  notes           text,
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  interview_at    timestamptz,
  ip_country      text,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint job_applications_status_check
    check (status in ('new','reviewing','interviewing','offered','hired','rejected'))
);
alter table public.job_applications enable row level security;

drop policy if exists "anon can submit applications" on public.job_applications;
create policy "anon can submit applications"
  on public.job_applications for insert
  with check (true);

-- Admin can see applications but cannot change status (review is the
-- head coach's job). Drop+create so we can re-run idempotently.
drop policy if exists "admin reads applications" on public.job_applications;
create policy "admin reads applications"
  on public.job_applications for select
  using (get_my_role() = 'admin');

drop policy if exists "head coach manages applications" on public.job_applications;
create policy "head coach manages applications"
  on public.job_applications for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_head_coach = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_head_coach = true
    )
  );

create index if not exists idx_job_applications_job_status
  on public.job_applications (job_id, status, created_at desc);

-- ── Message oversight (Part B) ──────────────────────────────────────
-- Existing msg_select_party_or_admin policy already covers admin
-- SELECT. Add a parallel one for the head coach so Coach Rawan can
-- read every coach ↔ client thread to monitor service quality. The
-- INSERT and UPDATE policies stay untouched, so this is read-only
-- oversight — monitors can't impersonate either party.
drop policy if exists "head coach reads all messages" on public.messages;
create policy "head coach reads all messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_head_coach = true
    )
  );

drop policy if exists "head coach reads all conversations" on public.conversations;
create policy "head coach reads all conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_head_coach = true
    )
  );
