-- 019: reviews — customer reviews shown on /reviews. Originally
-- applied via Supabase Studio on 2026-05-09; this file captures the
-- live schema. Idempotent.

create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 5),
  title           text,
  body            text not null,
  photo_paths     text[] not null default '{}'::text[],
  status          text not null default 'approved',
  auto_themes     text[] not null default '{}'::text[],
  moderated_by    uuid references public.profiles(id),
  moderated_at    timestamptz,
  moderation_note text,
  helpful_count   integer not null default 0,
  reply_text      text,
  reply_at        timestamptz,
  ip_country      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "anyone reads approved reviews" on public.reviews;
create policy "anyone reads approved reviews"
  on public.reviews for select
  using (status = 'approved');

drop policy if exists "authors read their own reviews" on public.reviews;
create policy "authors read their own reviews"
  on public.reviews for select
  using (auth.uid() = user_id);

drop policy if exists "users insert their own reviews" on public.reviews;
create policy "users insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "authors update their own reviews" on public.reviews;
create policy "authors update their own reviews"
  on public.reviews for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "authors delete their own reviews" on public.reviews;
create policy "authors delete their own reviews"
  on public.reviews for delete
  using (auth.uid() = user_id);

drop policy if exists "staff manage reviews" on public.reviews;
create policy "staff manage reviews"
  on public.reviews for all
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
