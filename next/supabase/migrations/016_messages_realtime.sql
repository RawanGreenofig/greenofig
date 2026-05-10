-- 016: Make the customer ↔ nutritionist message thread actually work end-to-end.
--
-- TWO FIXES, both deferred from the original 001 schema:
--
-- 1. Trigger that maintains `conversations.last_message_at` and the
--    per-side unread counters on every message insert. The clients
--    were inserting into `messages` directly but the conversation
--    row never updated, so the nutritionist's thread list never
--    showed new previews and unread badges always read 0.
--
-- 2. Add `messages` and `conversations` to the supabase_realtime
--    publication so the postgres_changes channel actually fires
--    when new rows land. Without this, the customer ↔ nutritionist
--    thread requires a manual refresh to see new messages.

create or replace function public.bump_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_user_sender boolean;
begin
  -- Determine which side sent it; bump the OTHER side's unread.
  select c.user_id = NEW.sender_id
    into is_user_sender
    from public.conversations c
    where c.id = NEW.conversation_id;

  update public.conversations
     set last_message_at = NEW.created_at,
         nutritionist_unread = case
           when is_user_sender then nutritionist_unread + 1
           else nutritionist_unread
         end,
         user_unread = case
           when is_user_sender then user_unread
           else user_unread + 1
         end
   where id = NEW.conversation_id;

  return NEW;
end;
$$;

drop trigger if exists trg_bump_conversation_on_message on public.messages;
create trigger trg_bump_conversation_on_message
  after insert on public.messages
  for each row
  execute function public.bump_conversation_on_message();

-- Realtime: include messages + conversations in the publication so
-- postgres_changes channels can subscribe. The "if not in publication"
-- check makes this idempotent.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.conversations';
  end if;
end $$;
