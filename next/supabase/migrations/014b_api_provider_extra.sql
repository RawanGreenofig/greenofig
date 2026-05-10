-- 014b: extend api_provider enum so the admin UI can pick the provider
-- the integration actually targets. Original enum was a small set
-- (anthropic/supabase/stripe/google/custom); the /admin/api-keys page
-- already exposes a wider list. ALTER ADD VALUE has to live in its own
-- transaction in Postgres, so this is split out from 014.
alter type api_provider add value if not exists 'openai';
alter type api_provider add value if not exists 'gemini';
alter type api_provider add value if not exists 'n8n';
alter type api_provider add value if not exists 'sendgrid';
alter type api_provider add value if not exists 'twilio';
alter type api_provider add value if not exists 'supabase_service';
