-- =============================================================================
-- Fix: "new row violates row-level security policy" when uploading from admin
-- while logged into TaskTutor (browser uses `authenticated`, not `anon`).
-- Run once in Supabase SQL Editor.
--
-- Security: any signed-in user gets these rights — same as your current anon
-- admin surface (password gate is only in the app). Tighten later with a role
-- or service-role API if needed.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- public.problems — authenticated can insert/update/delete (not only select)
-- -----------------------------------------------------------------------------
drop policy if exists "Allow authenticated insert on problems" on public.problems;
create policy "Allow authenticated insert on problems"
  on public.problems for insert
  to authenticated
  with check (true);

drop policy if exists "Allow authenticated update on problems" on public.problems;
create policy "Allow authenticated update on problems"
  on public.problems for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow authenticated delete on problems" on public.problems;
create policy "Allow authenticated delete on problems"
  on public.problems for delete
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- public.answers
-- -----------------------------------------------------------------------------
drop policy if exists "Allow authenticated insert on answers" on public.answers;
create policy "Allow authenticated insert on answers"
  on public.answers for insert
  to authenticated
  with check (true);

drop policy if exists "Allow authenticated update on answers" on public.answers;
create policy "Allow authenticated update on answers"
  on public.answers for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow authenticated delete on answers" on public.answers;
create policy "Allow authenticated delete on answers"
  on public.answers for delete
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- storage: problem-images (cropped PNGs, confirmed paths)
-- -----------------------------------------------------------------------------
drop policy if exists "Allow authenticated insert problem-images" on storage.objects;
create policy "Allow authenticated insert problem-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'problem-images');

drop policy if exists "Allow authenticated update problem-images" on storage.objects;
create policy "Allow authenticated update problem-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'problem-images')
  with check (bucket_id = 'problem-images');

drop policy if exists "Allow authenticated delete problem-images" on storage.objects;
create policy "Allow authenticated delete problem-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'problem-images');

-- -----------------------------------------------------------------------------
-- storage: past-papers (PDF uploads in admin)
-- -----------------------------------------------------------------------------
drop policy if exists "Allow authenticated read past-papers" on storage.objects;
create policy "Allow authenticated read past-papers"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'past-papers');

drop policy if exists "Allow authenticated insert past-papers" on storage.objects;
create policy "Allow authenticated insert past-papers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'past-papers');

drop policy if exists "Allow authenticated update past-papers" on storage.objects;
create policy "Allow authenticated update past-papers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'past-papers')
  with check (bucket_id = 'past-papers');

drop policy if exists "Allow authenticated delete past-papers" on storage.objects;
create policy "Allow authenticated delete past-papers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'past-papers');
