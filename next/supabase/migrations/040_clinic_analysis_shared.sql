-- Let the coach choose whether a client's AI analysis (summary +
-- recommendations) is visible to that client. Off by default — the
-- analysis can contain clinical/internal notes; the coach opts in to
-- surface a "From your coach" card on the client's dashboard.

alter table public.clinic_analysis
  add column if not exists shared_with_client boolean not null default false;
