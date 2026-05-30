-- 036: mark accounts that belong to a linked walk-in clinic client
--
-- Set true when a walk-in connects their account via the invite link
-- (035). Lets these free-tier accounts message their coach even though
-- client→coach chat is otherwise a Premium feature — they're real
-- paying clinic clients, just paying in person rather than online.

begin;

alter table public.profiles
  add column if not exists is_clinic_client boolean not null default false;

commit;
