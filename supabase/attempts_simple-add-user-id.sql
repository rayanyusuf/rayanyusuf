-- =============================================================================
-- Add user_id to attempts_simple so we know who attempted each problem.
-- Run once in Supabase SQL Editor. Then enable RLS so users only see their own.
-- =============================================================================

-- Add column (nullable for existing rows; new inserts from app will set it)
alter table public.attempts_simple
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Optional: add created_at if you want to order attempts (e.g. "last attempted")
alter table public.attempts_simple
  add column if not exists created_at timestamptz default now();

-- Index for "my attempts" queries
create index if not exists attempts_simple_user_id_created_at_idx
  on public.attempts_simple (user_id, created_at desc);

-- RLS: users can insert their own attempt and select only their own
alter table public.attempts_simple enable row level security;

drop policy if exists "Allow authenticated insert own attempts_simple" on public.attempts_simple;
create policy "Allow authenticated insert own attempts_simple"
  on public.attempts_simple for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Allow authenticated select own attempts_simple" on public.attempts_simple;
create policy "Allow authenticated select own attempts_simple"
  on public.attempts_simple for select
  to authenticated
  using (auth.uid() = user_id);

-- If you had anon insert before (e.g. no auth), drop or keep; below allows anon insert
-- without user_id for backward compatibility. Prefer requiring auth and user_id.
drop policy if exists "Allow anon insert attempts_simple" on public.attempts_simple;
create policy "Allow anon insert attempts_simple"
  on public.attempts_simple for insert
  to anon
  with check (true);
