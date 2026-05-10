-- 020: Multi-coach support.
--
-- Greenofig was built around a single nutritionist ("Dr. Rawan"). The
-- business is now hiring more coaches under one head coach. Two new
-- columns on profiles model the structure:
--
--   is_head_coach     true for the owner-coach (Coach Rawan). The
--                     head coach sees everything (earnings, store,
--                     all clients). Employee coaches don't.
--   assigned_coach_id which coach owns this client. NULL until the
--                     head coach assigns. Employee coaches see only
--                     clients where assigned_coach_id = themself;
--                     the head coach sees all clients.
--
-- Both columns are also useful even on non-customer profiles
-- (is_head_coach distinguishes the head from employee nutritionists;
-- assigned_coach_id stays NULL on staff rows).
--
-- We seed is_head_coach=true for the oldest nutritionist profile so
-- a fresh install / migration on an existing install both pick the
-- right person. If there are no nutritionist profiles yet, no row is
-- updated and the first one created later can be flagged by an admin.

alter table public.profiles
  add column if not exists is_head_coach boolean not null default false,
  add column if not exists assigned_coach_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_head_coach
  on public.profiles (is_head_coach) where is_head_coach = true;
create index if not exists idx_profiles_assigned_coach
  on public.profiles (assigned_coach_id) where assigned_coach_id is not null;

-- Promote the oldest nutritionist to head coach (idempotent: only
-- writes if no head coach exists yet).
update public.profiles
   set is_head_coach = true
 where id = (
   select id from public.profiles
    where role = 'nutritionist'
    order by created_at asc
    limit 1
 )
 and not exists (
   select 1 from public.profiles where is_head_coach = true
 );
