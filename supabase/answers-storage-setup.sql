-- =============================================================================
-- ANSWERS: table + bucket + storage policies
-- Run this once in Supabase SQL Editor to allow saving and reading answer images.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Answers table (links answer_id to image path in storage)
-- -----------------------------------------------------------------------------
create table if not exists public.answers (
  answer_id text primary key,
  answer_image text not null,
  created_at timestamptz default now() not null
);

comment on table public.answers is 'Confirmed answer images from answer PDFs; answer_id matches problems id pattern e.g. Further-Maths-2022-paper-1-Question-4';
comment on column public.answers.answer_id is 'Same format as problems.problem_id for linking, e.g. Further-Maths-2020-paper-1-Question-5';
comment on column public.answers.answer_image is 'Storage path in problem-images bucket, e.g. answers/confirmed/Further-Maths-2020-paper-1-Question-5.png';

alter table public.answers enable row level security;

drop policy if exists "Allow anon insert and select on answers" on public.answers;
create policy "Allow anon insert and select on answers"
  on public.answers for all
  to anon
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 2. Ensure problem-images bucket exists (used for both problems and answers)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('problem-images', 'problem-images', false)
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 3. Storage policies: allow anon to read/write problem-images (answers + problems)
-- Your app uses the anon key for admin uploads and tool signed URLs.
-- -----------------------------------------------------------------------------

-- Allow anon to read objects (required for signed URLs and tool "Show answer")
drop policy if exists "Allow anon read problem-images" on storage.objects;
create policy "Allow anon read problem-images"
  on storage.objects for select
  to anon
  using (bucket_id = 'problem-images');

-- Allow anon to upload (admin: confirm crop → save under answers/confirmed/ and problems/confirmed/)
drop policy if exists "Allow anon insert problem-images" on storage.objects;
create policy "Allow anon insert problem-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'problem-images');

-- Allow anon to update (upsert when confirming same answer_id again)
drop policy if exists "Allow anon update problem-images" on storage.objects;
create policy "Allow anon update problem-images"
  on storage.objects for update
  to anon
  using (bucket_id = 'problem-images')
  with check (bucket_id = 'problem-images');

-- Allow anon to delete (admin: delete problem/answer from storage)
drop policy if exists "Allow anon delete problem-images" on storage.objects;
create policy "Allow anon delete problem-images"
  on storage.objects for delete
  to anon
  using (bucket_id = 'problem-images');

notify pgrst, 'reload schema';
