-- ============================================================================
-- Greenofig — Coupon authorship + targeting (Migration 004)
-- Adds the columns needed by /api/coupons/create and the
-- nutritionist Send Discount feature.
-- Run this in the Supabase SQL editor.
-- ============================================================================

alter table public.coupons
  add column if not exists created_by uuid references public.profiles(id);

alter table public.coupons
  add column if not exists sent_to_user_id uuid references public.profiles(id);

alter table public.coupons
  add column if not exists sent_to_tier user_tier;

alter table public.coupons
  add column if not exists personal_note text;

-- Helpful indexes for the nutritionist's own-codes list and per-client lookups
create index if not exists coupons_created_by_idx on public.coupons (created_by);
create index if not exists coupons_sent_to_user_idx on public.coupons (sent_to_user_id);
