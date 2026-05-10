-- ============================================================================
-- Greenofig — Pricing settings seed (Migration 013)
--
-- Seeds platform_settings with the current Stripe price IDs and the
-- sticker USD amounts shown on the /pricing page. The new /admin/pricing
-- admin UI updates these rows; lib/stripe.ts and /api/pricing read them.
--
-- Updating the rows from the admin UI flows:
--   1. Admin enters new monthly + annual amounts.
--   2. Server creates new Stripe prices, archives the old ones.
--   3. Server updates the stripe_price_* rows with the new IDs and the
--      pricing_*_monthly/annual rows with the new sticker amounts.
--
-- Idempotent — `on conflict (key) do nothing`.
-- ============================================================================

insert into public.platform_settings (key, value, description) values
  ('stripe_price_basic_monthly',   to_jsonb('price_1TVKfh2OHDHL9Mv9EEODgruh'::text), 'Stripe price ID — basic / monthly'),
  ('stripe_price_basic_yearly',    to_jsonb('price_1TVKfk2OHDHL9Mv9OITv4FK3'::text), 'Stripe price ID — basic / yearly'),
  ('stripe_price_premium_monthly', to_jsonb('price_1TVKfn2OHDHL9Mv99p9FfkUM'::text), 'Stripe price ID — premium / monthly'),
  ('stripe_price_premium_yearly',  to_jsonb('price_1TVKfq2OHDHL9Mv9I3377K4g'::text), 'Stripe price ID — premium / yearly'),
  ('stripe_price_vip_monthly',     to_jsonb('price_1TVKft2OHDHL9Mv9UcFoLzlf'::text), 'Stripe price ID — vip / monthly'),
  ('stripe_price_vip_yearly',      to_jsonb('price_1TVKfw2OHDHL9Mv9TDTW8Cip'::text), 'Stripe price ID — vip / yearly'),
  ('pricing_basic_monthly',        to_jsonb(34.99),                                  'Basic monthly USD shown on /pricing'),
  ('pricing_basic_annual',         to_jsonb(29.99),                                  'Basic annual-per-month USD shown on /pricing'),
  ('pricing_premium_monthly',      to_jsonb(49.99),                                  'Premium monthly USD shown on /pricing'),
  ('pricing_premium_annual',       to_jsonb(39.99),                                  'Premium annual-per-month USD shown on /pricing'),
  ('pricing_vip_monthly',          to_jsonb(79.99),                                  'VIP monthly USD shown on /pricing'),
  ('pricing_vip_annual',           to_jsonb(59.99),                                  'VIP annual-per-month USD shown on /pricing')
on conflict (key) do nothing;
