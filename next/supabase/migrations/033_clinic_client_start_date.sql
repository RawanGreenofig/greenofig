-- 033: clinic client start date + source tag
--
-- start_date  — when the client started at the clinic (separate from
--               created_at, which is just when the row was entered).
-- source      — how the row arrived: 'manual' (typed), 'import' (bulk
--               file/photo import), or 'intake' (client self-submitted
--               via the shareable intake link). Lets the coach spot
--               newly self-registered clients.

begin;

alter table public.clinic_clients
  add column if not exists start_date date,
  add column if not exists source text not null default 'manual';

commit;
