-- 022: AI assistant messages on customer ↔ coach threads.
--
-- When a customer sends a message to their assigned coach, an AI
-- (Gemini) drafts an instant reply that lands in the same thread.
-- The coach can then follow up personally. This migration adds the
-- column the UI uses to differentiate AI replies from human replies.

alter table public.messages
  add column if not exists is_ai boolean not null default false;

create index if not exists idx_messages_is_ai
  on public.messages (conversation_id, is_ai)
  where is_ai = true;
