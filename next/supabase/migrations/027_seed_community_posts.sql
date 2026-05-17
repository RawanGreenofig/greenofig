-- Migration 027 — seed two community posts so the dashboard feed
-- has real DB-backed content instead of two hardcoded JSX blocks.
--
-- The /dashboard/community page renders two demo posts inline
-- (Coach Rawan's protein-at-breakfast reminder + a "Tip of the
-- week" eat-the-rainbow tip). They needed real `posts` rows so the
-- like + comment persistence wired in migration 025 actually
-- applies to them. After this migration runs, the inline JSX is
-- removed and the feed renders these two posts (and any others)
-- entirely from the DB.
--
-- Idempotent: keyed by slug, so re-running this migration won't
-- duplicate the rows.

begin;

do $$
declare
  v_author_id uuid;
begin
  -- Pick an author: head coach if present, otherwise any nutritionist,
  -- otherwise the first admin. We're not creating a "system" user —
  -- these posts are coach content authored by the platform's coach.
  select id into v_author_id from public.profiles
    where role = 'nutritionist' and is_head_coach = true
    limit 1;

  if v_author_id is null then
    select id into v_author_id from public.profiles
      where role = 'nutritionist'
      order by created_at asc
      limit 1;
  end if;

  if v_author_id is null then
    select id into v_author_id from public.profiles
      where role = 'admin'
      order by created_at asc
      limit 1;
  end if;

  -- No staff yet → skip the seed. The community page will render
  -- empty until a coach publishes their first post.
  if v_author_id is null then
    raise notice 'No nutritionist/admin user found; skipping community seed.';
    return;
  end if;

  -- Post 1: Coach Rawan's pinned weekly reminder.
  -- Idempotent via NOT EXISTS — `slug` has no unique constraint so
  -- we can't use ON CONFLICT, but a slug match is the right
  -- "already seeded" signal.
  if not exists (select 1 from public.posts where slug = 'protein-at-breakfast-30g') then
    insert into public.posts (
      author_id, type, title, content, excerpt,
      is_published, published_at, pinned, audience, slug, hue
    )
    values (
      v_author_id,
      'tip',
      'Reminder for the week: 30g of protein at breakfast',
      'Reminder for the week: aim for 30g of protein at breakfast. It steadies blood sugar and the rest of your day reads differently. Drop a 🙋 if you''d like a quick 5-min recipe shortlist!',
      '30g protein at breakfast steadies blood sugar — and the rest of your day.',
      true, now(), true, 'all',
      'protein-at-breakfast-30g',
      'rgb(163 230 53 / 0.18)'
    );
  end if;

  -- Post 2: Tip of the week — eat the rainbow.
  if not exists (select 1 from public.posts where slug = 'tip-of-the-week-eat-the-rainbow') then
    insert into public.posts (
      author_id, type, title, content, excerpt,
      is_published, published_at, pinned, audience, slug, hue
    )
    values (
      v_author_id,
      'tip',
      'Tip of the week: eat the rainbow',
      'Aim for 5 different colours of plant on your plate this week. Each pigment carries its own phytonutrient — variety matters more than quantity.',
      'Five colours of plant on your plate this week — variety beats quantity.',
      true, now(), false, 'all',
      'tip-of-the-week-eat-the-rainbow',
      'rgb(132 204 22 / 0.16)'
    );
  end if;
end $$;

commit;
