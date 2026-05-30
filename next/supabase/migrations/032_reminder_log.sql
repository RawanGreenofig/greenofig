-- 032: reminder de-dup log
--
-- The reminder scheduler (/api/cron/reminders) runs every few minutes
-- and pushes meal / hydration / workout / progress reminders when a
-- user's local time crosses their preferred time. This table records
-- "we already sent reminder <kind> to <user> on <day>" so a reminder
-- fires exactly once per day even though the cron sweeps repeatedly and
-- its timing can drift.
--
-- Service-role only — RLS is enabled with no policies so the table is
-- invisible to client sessions (the cron uses the service key).

begin;

create table if not exists public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,        -- 'breakfast' | 'lunch' | 'dinner' | 'workout'
                             -- | 'hydration:HH:MM' | 'progress'
  sent_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, sent_on)
);

create index if not exists idx_reminder_log_user_day
  on public.reminder_log(user_id, sent_on);

alter table public.reminder_log enable row level security;

commit;
