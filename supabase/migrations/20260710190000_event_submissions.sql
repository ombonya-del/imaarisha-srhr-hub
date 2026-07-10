-- Member event submissions: any approved member can post an event, but it stays
-- PENDING until an admin approves it (then it appears on the Events calendar).
-- Mirrors resource_submissions / opportunities.

alter table public.events add column if not exists status         text not null default 'approved';
alter table public.events add column if not exists submitted_by   uuid references auth.users(id);
alter table public.events add column if not exists submitter_name text;
alter table public.events add column if not exists link           text;   -- registration / more-info URL

-- Existing events stay visible.
update public.events set status = 'approved' where status is null or status = '';

-- Approved members may post an event, but only as a pending one they own.
drop policy if exists events_member_insert on public.events;
create policy events_member_insert on public.events
  for insert to authenticated
  with check (public.is_approved() and status = 'pending' and submitted_by = auth.uid());
