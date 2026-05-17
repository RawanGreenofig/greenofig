-- Migration 025 — community comments + per-user post likes
--
-- The /dashboard/community page rendered like-count and comment
-- interactions as local-state only: a user could like a post, type a
-- comment, and lose both on refresh. The `posts` table already has a
-- `reactions jsonb` column we can use for an aggregate like counter,
-- but per-user likes (so a user sees "you liked this" on return)
-- and threaded comments both need their own tables.
--
-- Tables added:
--   post_likes     one row per (post_id, user_id) — primary key on
--                  the pair so a user can only like once. Read/insert/
--                  delete by the user themselves; staff can read all.
--   post_comments  one row per comment, ordered by created_at.
--                  Authenticated users can write comments on
--                  published posts; users can edit/delete their own;
--                  staff can delete any (moderation).
--
-- Both tables are added to the realtime publication so the
-- community feed can update live without polling.

begin;

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_post_likes_post on public.post_likes (post_id);
create index if not exists idx_post_likes_user on public.post_likes (user_id);

alter table public.post_likes enable row level security;

-- Anyone signed-in can see likes on published posts; staff see all.
drop policy if exists pl_select on public.post_likes;
create policy pl_select on public.post_likes
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_likes.post_id
        and (p.is_published or get_my_role() = any (array['admin'::user_role, 'nutritionist'::user_role]))
    )
  );

-- A user can only insert/delete their own like row.
drop policy if exists pl_insert_own on public.post_likes;
create policy pl_insert_own on public.post_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists pl_delete_own on public.post_likes;
create policy pl_delete_own on public.post_likes
  for delete using (auth.uid() = user_id);


create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_post_comments_post_created
  on public.post_comments (post_id, created_at desc);
create index if not exists idx_post_comments_author on public.post_comments (author_id);

alter table public.post_comments enable row level security;

-- Read comments on any published post (anyone signed in) + staff see all.
drop policy if exists pc_select on public.post_comments;
create policy pc_select on public.post_comments
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id
        and (p.is_published or get_my_role() = any (array['admin'::user_role, 'nutritionist'::user_role]))
    )
  );

-- Anyone authenticated can write a comment on a published post; the
-- author of the row is the signed-in user.
drop policy if exists pc_insert on public.post_comments;
create policy pc_insert on public.post_comments
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.posts p
      where p.id = post_comments.post_id and p.is_published
    )
  );

-- Author can edit their own comment; staff can update (moderation).
drop policy if exists pc_update on public.post_comments;
create policy pc_update on public.post_comments
  for update using (
    auth.uid() = author_id
    or get_my_role() = any (array['admin'::user_role, 'nutritionist'::user_role])
  );

-- Author or staff can delete.
drop policy if exists pc_delete on public.post_comments;
create policy pc_delete on public.post_comments
  for delete using (
    auth.uid() = author_id
    or get_my_role() = any (array['admin'::user_role, 'nutritionist'::user_role])
  );


-- Add both tables to realtime so the feed updates without polling.
do $$
begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    alter publication supabase_realtime add table public.post_likes;
    alter publication supabase_realtime add table public.post_comments;
  end if;
exception
  when duplicate_object then null;
end $$;

commit;
