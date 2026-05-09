-- ============================================================================
-- Greenofig — Nutritionist timezone (Migration 009)
--
-- Adds `timezone` to profiles so each nutritionist's working hours are
-- interpreted in their own zone, not the server's. Customers see slots
-- formatted in their browser's local timezone but the underlying slot
-- generation happens in the nutritionist's zone, so a booking at 09:00
-- Amman time is the same instant for every customer regardless of where
-- they're sitting.
--
-- Default 'Asia/Amman' matches the project's home base. Existing rows
-- pick up the default automatically; clients in different zones can
-- update via the settings page later.
--
-- Idempotent — safe to re-run.
-- ============================================================================

alter table public.profiles
  add column if not exists timezone text not null default 'Asia/Amman';

comment on column public.profiles.timezone is
  'IANA timezone name. For nutritionists this defines the timezone their working hours are stored in. For customers it is informational.';
