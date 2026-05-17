-- Migration 026 — per-user daily macro targets
--
-- /dashboard and /dashboard/track previously rendered hardcoded
-- targets {calories: 1840, protein: 120, carbs: 200, fat: 60} for
-- every customer regardless of body composition, activity level, or
-- goal. The values are reasonable for an average adult woman (Coach
-- Rawan's primary demographic) but a 90kg active man should not be
-- aiming for 1840 kcal.
--
-- These columns let the customer (or their nutritionist) override
-- the platform default. UI: /dashboard/settings will add a "Daily
-- goals" section that writes to these columns. Pages prefer
-- profile.target_* when set; fall back to MACRO_TARGETS otherwise.
--
-- All four are nullable so existing rows aren't forced to a value —
-- a null column means "use the platform default."

begin;

alter table public.profiles
  add column if not exists target_calories  integer check (target_calories  is null or (target_calories  between 800 and 6000)),
  add column if not exists target_protein_g integer check (target_protein_g is null or (target_protein_g between 0   and 500)),
  add column if not exists target_carbs_g   integer check (target_carbs_g   is null or (target_carbs_g   between 0   and 1000)),
  add column if not exists target_fat_g     integer check (target_fat_g     is null or (target_fat_g     between 0   and 400));

comment on column public.profiles.target_calories  is 'Daily kcal goal. null = use MACRO_TARGETS default.';
comment on column public.profiles.target_protein_g is 'Daily protein goal in grams. null = use MACRO_TARGETS default.';
comment on column public.profiles.target_carbs_g   is 'Daily carbs goal in grams. null = use MACRO_TARGETS default.';
comment on column public.profiles.target_fat_g     is 'Daily fat goal in grams. null = use MACRO_TARGETS default.';

commit;
