-- Gated downloads: a restricted resource can only be downloaded after the
-- member submits a request (name / org / reason) and an admin approves it.

create table if not exists public.resource_requests (
  id             uuid primary key default gen_random_uuid(),
  resource_id    text,          -- id copied from the resource (loose ref: works for uuid or text ids)
  resource_title text,
  requester_id   uuid references auth.users(id),
  requester_name text,
  org            text,
  reason         text,
  status         text not null default 'pending',   -- pending | approved | denied
  created_at     timestamptz default now(),
  decided_at     timestamptz
);

alter table public.resource_requests enable row level security;

-- Approved members submit their own request.
drop policy if exists rr_member_insert on public.resource_requests;
create policy rr_member_insert on public.resource_requests
  for insert to authenticated
  with check (public.is_approved() and requester_id = auth.uid());

-- Requesters read their own; admins read all.
drop policy if exists rr_read on public.resource_requests;
create policy rr_read on public.resource_requests
  for select to authenticated
  using (public.is_admin() or requester_id = auth.uid());

-- Admins approve/deny/remove.
drop policy if exists rr_admin_write on public.resource_requests;
create policy rr_admin_write on public.resource_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
