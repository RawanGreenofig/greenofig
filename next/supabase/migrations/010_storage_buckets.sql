-- ============================================================================
-- Greenofig — Storage buckets (Migration 010)
--
-- Creates the buckets the dashboards need for image and document uploads:
--   avatars        — public, profile photos (≤3MB)
--   posts          — public, blog hero images (≤8MB)
--   recipes        — public, recipe photos (≤8MB)
--   product-photos — public, store product images (≤8MB)
--   research-docs  — private, nutritionist research PDFs (≤25MB)
--
-- RLS:
--   avatars: any authed user writes their own; anyone reads (public).
--   posts/recipes/product-photos: nutritionist or admin writes; public reads.
--   research-docs: nutritionist or admin both writes and reads; no anon.
--
-- Idempotent — safe to re-run.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars',       'avatars',       true,  3145728,  array['image/png','image/jpeg','image/webp','image/gif']),
  ('posts',         'posts',         true,  8388608,  array['image/png','image/jpeg','image/webp']),
  ('recipes',       'recipes',       true,  8388608,  array['image/png','image/jpeg','image/webp']),
  ('product-photos','product-photos',true,  8388608,  array['image/png','image/jpeg','image/webp']),
  ('research-docs', 'research-docs', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

-- ── avatars ────────────────────────────────────────────────────────
drop policy if exists "avatars_authed_insert" on storage.objects;
create policy "avatars_authed_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

-- ── posts / recipes / product-photos (staff write, public read) ───
drop policy if exists "content_public_read" on storage.objects;
create policy "content_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('posts','recipes','product-photos'));

drop policy if exists "content_staff_write" on storage.objects;
create policy "content_staff_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('posts','recipes','product-photos')
    and public.get_my_role()::text in ('nutritionist','admin')
  );

drop policy if exists "content_staff_update" on storage.objects;
create policy "content_staff_update"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('posts','recipes','product-photos')
    and public.get_my_role()::text in ('nutritionist','admin')
  );

drop policy if exists "content_staff_delete" on storage.objects;
create policy "content_staff_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('posts','recipes','product-photos')
    and public.get_my_role()::text in ('nutritionist','admin')
  );

-- ── research-docs (private, staff only) ───────────────────────────
drop policy if exists "research_staff_select" on storage.objects;
create policy "research_staff_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'research-docs'
    and public.get_my_role()::text in ('nutritionist','admin')
  );

drop policy if exists "research_staff_insert" on storage.objects;
create policy "research_staff_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'research-docs'
    and public.get_my_role()::text in ('nutritionist','admin')
  );

drop policy if exists "research_staff_delete" on storage.objects;
create policy "research_staff_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'research-docs'
    and public.get_my_role()::text in ('nutritionist','admin')
  );
