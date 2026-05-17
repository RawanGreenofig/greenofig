-- 028: body measurements on progress_entries
--
-- The progress dashboard already had six measurement inputs (chest,
-- waist, hips, arms, thighs, neck) but only `waist_cm` was a real
-- column — the rest were local-only React state that vanished on
-- refresh. Adds the missing five columns alongside `waist_cm` so
-- /api/dashboard/measurements can persist all six in one row.
--
-- Each is nullable: a row inserted with only waist + chest leaves the
-- others NULL, and the read query in the dashboard takes the latest
-- non-null per column.

alter table public.progress_entries
  add column if not exists chest_cm  numeric,
  add column if not exists hips_cm   numeric,
  add column if not exists arms_cm   numeric,
  add column if not exists thighs_cm numeric,
  add column if not exists neck_cm   numeric;
