-- Opportunity Desk: calls for funding, consultancies, conferences, scholarships,
-- fellowships, jobs. Members post; an admin approves before it appears.

create table if not exists public.opportunities (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  kind           text,          -- funding | consultancy | conference | scholarship | fellowship | job | other
  org            text,
  description    text,
  deadline       date,
  link           text,
  status         text not null default 'pending',   -- pending | approved
  submitted_by   uuid references auth.users(id),
  submitter_name text,
  created_at     timestamptz default now()
);

alter table public.opportunities enable row level security;

drop policy if exists opp_read on public.opportunities;
create policy opp_read on public.opportunities
  for select to authenticated using (public.is_approved());

drop policy if exists opp_member_insert on public.opportunities;
create policy opp_member_insert on public.opportunities
  for insert to authenticated
  with check (public.is_approved() and status = 'pending' and submitted_by = auth.uid());

drop policy if exists opp_admin_write on public.opportunities;
create policy opp_admin_write on public.opportunities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
