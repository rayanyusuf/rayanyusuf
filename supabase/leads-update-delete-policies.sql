-- Run in Supabase SQL Editor so admin UI can update/delete leads (anon key).
-- Your admin is gated by app password; tighten with real auth if needed.

drop policy if exists "Allow anon update leads" on public.leads;
create policy "Allow anon update leads"
  on public.leads
  for update
  to anon
  using (true)
  with check (true);

drop policy if exists "Allow anon delete leads" on public.leads;
create policy "Allow anon delete leads"
  on public.leads
  for delete
  to anon
  using (true);
