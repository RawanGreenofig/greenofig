-- Security hardening for the walk-in clinic flow.
--
-- 1) Invite tokens — the clinic_clients UUID alone was the only secret
--    guarding the /clinic-link claim flow, and it's reused in pay/update
--    links the coach texts out. A leak would let a stranger bind that
--    patient's plan/payments/coach-thread to their own account. We now
--    require a separate, hashed, expiring token to CLAIM a client. The
--    raw token lives only in the invite URL the coach shares; we store
--    its SHA-256 hash. Cleared on successful link (one-time use).
alter table public.clinic_clients
  add column if not exists invite_token_hash text,
  add column if not exists invite_token_expires_at timestamptz;

-- 2) Lightweight rate limiting for the unauthenticated public routes
--    (clinic-link / clinic-intake / clinic-update / clinic-pay) so they
--    can't be scripted to spam fake clients, flood check-ins, or hammer
--    Stripe. One row per hit; the limiter counts rows in a time window.
--    Service-role only (RLS on, no policies) — the public routes write
--    through the service client.
create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_events_bucket_time
  on public.rate_limit_events (bucket, created_at);
alter table public.rate_limit_events enable row level security;
