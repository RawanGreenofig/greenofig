-- 035: link a walk-in clinic client to an online account
--
-- Reverses 030's "keep walk-ins separate from online accounts" stance
-- (product decision): the coach now shares an invite link, the walk-in
-- signs in with Google, and we connect that account to their clinic
-- record via clinic_clients.user_id. That lets the coach message them
-- in-app and send pay links. The two universes are linked only when the
-- client explicitly accepts the invite.

begin;

alter table public.clinic_clients
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_clinic_clients_user
  on public.clinic_clients(user_id)
  where user_id is not null;

commit;
