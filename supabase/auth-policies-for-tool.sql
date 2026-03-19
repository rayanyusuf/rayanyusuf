-- =============================================================================
-- Allow logged-in users (authenticated) to use the practice tool
-- Run once in Supabase SQL Editor. Without these, RLS only allowed anon, so
-- signed-in users saw "No problems yet" and couldn't load images.
-- =============================================================================

-- Problems: authenticated users can read (same as anon)
drop policy if exists "Allow authenticated select on problems" on public.problems;
create policy "Allow authenticated select on problems"
  on public.problems for select
  to authenticated
  using (true);

-- Answers: authenticated users can read (for "Show Answer" in tool)
drop policy if exists "Allow authenticated select on answers" on public.answers;
create policy "Allow authenticated select on answers"
  on public.answers for select
  to authenticated
  using (true);

-- Storage: authenticated users can read problem-images (signed URLs in tool)
drop policy if exists "Allow authenticated read problem-images" on storage.objects;
create policy "Allow authenticated read problem-images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'problem-images');

-- Attempts: if you use attempts_simple with RLS, allow authenticated to insert
-- (Uncomment and run if the tool's "Got it" / "Didn't get it" save fails for logged-in users.)
-- alter table public.attempts_simple enable row level security;
-- drop policy if exists "Allow authenticated insert attempts_simple" on public.attempts_simple;
-- create policy "Allow authenticated insert attempts_simple"
--   on public.attempts_simple for insert to authenticated with check (true);
