-- 015: capture user country (ISO-3166-1 alpha-2) so the admin/analytics
-- countries chart can show real geography. Filled lazily by middleware
-- using Vercel's `x-vercel-ip-country` header on the first authenticated
-- request after this migration ships. Existing rows stay null until the
-- user signs in again.
alter table public.profiles
  add column if not exists country text;

create index if not exists idx_profiles_country
  on public.profiles (country)
  where country is not null;
