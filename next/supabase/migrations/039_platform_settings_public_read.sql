-- Let the PUBLIC (logged-out) site read the handful of platform_settings
-- keys that drive public-facing content. Until now every SELECT policy on
-- platform_settings required auth.role() = 'authenticated', so anonymous
-- visitors to the homepage / pricing page never received the admin's
-- site-editor overrides — the live site always fell back to hardcoded
-- defaults. This grants anon read access ONLY to the public content keys
-- (never the sensitive config: stripe ids, ai limits, integrations, etc.).

drop policy if exists ps_public_read_public_keys on public.platform_settings;

create policy ps_public_read_public_keys
  on public.platform_settings
  for select
  to anon
  using (
    key in (
      'site_hero',
      'site_about',
      'site_pricing',
      'site_faq',
      'site_footer',
      'site_announcement',
      'pricing_page_enabled',
      'store_enabled',
      'store_enabled_tiers',
      'booking_enabled',
      'currency',
      'member_discount_percent'
    )
  );
