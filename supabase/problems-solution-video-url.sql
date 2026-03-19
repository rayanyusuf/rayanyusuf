-- Run in Supabase SQL Editor to add solution video URL to problems.
-- Optional: YouTube (or other) URL for a walkthrough video for this problem.

alter table public.problems
  add column if not exists solution_video_url text;

comment on column public.problems.solution_video_url is 'Optional URL to solution/walkthrough video (e.g. YouTube).';
