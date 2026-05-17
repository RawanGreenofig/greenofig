-- 029: persist notification channel prefs + units on profiles
--
-- The dashboard Settings → Notifications tab held 6 email/push toggles
-- per topic plus a quiet-hours window, but `save()` only wrote profile
-- and goals fields — these toggles never made it past React state. The
-- Account tab also had a units (metric/imperial) selector that did
-- nothing. All three now persist on `profiles`.
--
-- Defaults match the previous in-memory defaults:
--   notification_channels  — email on for all topics except marketing,
--                            push on for dailyReminders/bookings/messages.
--   notification_quiet_hours — { enabled: true, from: '22:00', to: '07:00' }
--   units                  — 'metric' (the existing UI default).

alter table public.profiles
  add column if not exists notification_channels jsonb default '{
    "dailyReminders": { "email": true,  "push": true,  "sms": false },
    "mealPlan":       { "email": true,  "push": false, "sms": false },
    "bookings":       { "email": true,  "push": true,  "sms": false },
    "messages":       { "email": true,  "push": true,  "sms": false },
    "community":      { "email": true,  "push": false, "sms": false },
    "marketing":      { "email": false, "push": false, "sms": false }
  }'::jsonb,
  add column if not exists notification_quiet_hours jsonb default '{
    "enabled": true,
    "from":    "22:00",
    "to":      "07:00"
  }'::jsonb,
  add column if not exists units text default 'metric' check (units in ('metric','imperial'));
