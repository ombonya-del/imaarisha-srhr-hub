-- ════════════════════════════════════════════════════════════════════════════
-- HEBU FIKA — community suggestions for missing SRHR service points
-- Run in Imaarisha project (uwxtqyqyrhhxqagaqelg). Depends on public.is_admin().
--
-- Anonymous: young people suggest a place not yet listed; it lands as 'pending'
-- and an admin reviews before promoting it into fika_facilities.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.fika_suggestions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  county      text not null,
  area        text,
  note        text,
  language    text default 'en',
  status      text default 'pending',     -- pending | added | rejected
  created_at  timestamptz default now()
);
create index if not exists fika_suggestions_status_idx on public.fika_suggestions (status, created_at desc);

alter table public.fika_suggestions enable row level security;

-- Anyone may submit a pending suggestion (safe columns only); only admins read/moderate.
drop policy if exists fika_suggestions_submit    on public.fika_suggestions;
drop policy if exists fika_suggestions_admin_read on public.fika_suggestions;
drop policy if exists fika_suggestions_admin_upd  on public.fika_suggestions;
drop policy if exists fika_suggestions_admin_del  on public.fika_suggestions;
create policy fika_suggestions_submit    on public.fika_suggestions for insert with check (status = 'pending');
create policy fika_suggestions_admin_read on public.fika_suggestions for select using (public.is_admin());
create policy fika_suggestions_admin_upd  on public.fika_suggestions for update using (public.is_admin());
create policy fika_suggestions_admin_del  on public.fika_suggestions for delete using (public.is_admin());
