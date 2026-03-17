-- Run this in Supabase SQL Editor to create the problems table.
-- Table stores confirmed problems with a unique identifier and their image path in storage.

create table if not exists public.problems (
  problem_id text primary key,
  problem_image text not null,
  created_at timestamptz default now() not null
);

comment on table public.problems is 'Confirmed problems extracted from past papers; problem_id is e.g. Further-maths-2022-Paper-5-2';
comment on column public.problems.problem_id is 'Unique id: Further-maths-<year>-Paper-<paperNum>-<problemNum>';
comment on column public.problems.problem_image is 'Storage path in problem-images bucket, e.g. confirmed/Further-maths-2022-Paper-5-2.png';

-- Allow anon to insert/select (adjust RLS as needed for your auth)
alter table public.problems enable row level security;

create policy "Allow anon insert and select on problems"
  on public.problems for all
  to anon
  using (true)
  with check (true);
