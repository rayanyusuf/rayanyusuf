-- Run this in Supabase SQL Editor to create the answers table (mark schemes / worked solutions).
-- Mirrors public.problems; images live under problem-images bucket paths like answers/confirmed/...

create table if not exists public.answers (
  answer_id text primary key,
  answer_image text not null,
  created_at timestamptz default now() not null
);

comment on table public.answers is 'Confirmed answer images from answer PDFs; answer_id matches problems id pattern e.g. Further-Maths-2022-paper-1-Question-4';
comment on column public.answers.answer_image is 'Storage path in problem-images bucket, e.g. answers/confirmed/Further-Maths-2022-paper-1-Question-4.png';

alter table public.answers enable row level security;

drop policy if exists "Allow anon insert and select on answers" on public.answers;
create policy "Allow anon insert and select on answers"
  on public.answers for all
  to anon
  using (true)
  with check (true);

-- Help PostgREST pick up the new table immediately (fixes "not in schema cache")
notify pgrst, 'reload schema';
