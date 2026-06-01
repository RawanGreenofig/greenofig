-- Defense-in-depth: let a LINKED walk-in client read THEIR OWN clinic data
-- directly under RLS. Today the my-* API routes serve this via the service
-- role (which bypasses RLS), so RLS currently DENIES the client any direct
-- read. These additive, permissive SELECT policies align the database with
-- the app's intent and provide a safe foundation for direct/realtime client
-- reads. Coach/admin policies are unchanged (permissive policies OR together).
--
-- Scope is always "the caller's own linked record(s)" — clinic_clients.user_id
-- = auth.uid(). clinic_analysis is additionally gated on shared_with_client so
-- the client only ever sees what the coach chose to share.

drop policy if exists cc_select_linked_client on public.clinic_clients;
create policy cc_select_linked_client on public.clinic_clients
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists casg_select_linked_client on public.clinic_assignments;
create policy casg_select_linked_client on public.clinic_assignments
  for select to authenticated
  using (clinic_client_id in (select id from public.clinic_clients where user_id = auth.uid()));

drop policy if exists casm_select_linked_client on public.clinic_assessments;
create policy casm_select_linked_client on public.clinic_assessments
  for select to authenticated
  using (clinic_client_id in (select id from public.clinic_clients where user_id = auth.uid()));

drop policy if exists cpay_select_linked_client on public.clinic_payments;
create policy cpay_select_linked_client on public.clinic_payments
  for select to authenticated
  using (clinic_client_id in (select id from public.clinic_clients where user_id = auth.uid()));

drop policy if exists canal_select_linked_client on public.clinic_analysis;
create policy canal_select_linked_client on public.clinic_analysis
  for select to authenticated
  using (
    shared_with_client
    and clinic_client_id in (select id from public.clinic_clients where user_id = auth.uid())
  );

-- bookings: the existing party policy covers client_id / nutritionist_id; add
-- the linked walk-in client's own clinic visits.
drop policy if exists bk_select_linked_clinic_client on public.bookings;
create policy bk_select_linked_clinic_client on public.bookings
  for select to authenticated
  using (clinic_client_id in (select id from public.clinic_clients where user_id = auth.uid()));
