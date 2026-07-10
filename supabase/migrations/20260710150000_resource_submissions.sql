-- Member resource submissions: any approved member can add a resource, but it
-- stays PENDING until an admin approves it (then it appears publicly).

alter table public.resources add column if not exists status         text not null default 'approved';
alter table public.resources add column if not exists submitted_by   uuid references auth.users(id);
alter table public.resources add column if not exists submitter_name text;

-- Existing resources stay visible.
update public.resources set status = 'approved' where status is null or status = '';

-- Approved members may submit a resource, but only as a pending one they own.
drop policy if exists resources_member_insert on public.resources;
create policy resources_member_insert on public.resources
  for insert to authenticated
  with check (public.is_approved() and status = 'pending' and submitted_by = auth.uid());
