-- Member invite / recommend flow.
-- Approved members can put a prospective member forward; admins review the
-- recommendation (alongside the person's own request-to-join) before approving.

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) $$;

create table if not exists public.member_invites (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  invitee_name     text,
  org              text,
  note             text,
  recommended_by   uuid references auth.users(id),
  recommender_name text,
  status           text not null default 'pending',   -- pending | joined | declined
  created_at       timestamptz default now()
);

alter table public.member_invites enable row level security;

-- Approved members may submit a recommendation.
drop policy if exists mi_member_insert on public.member_invites;
create policy mi_member_insert on public.member_invites
  for insert to authenticated with check (public.is_approved());

-- A recommender sees their own; admins see all.
drop policy if exists mi_read on public.member_invites;
create policy mi_read on public.member_invites
  for select to authenticated
  using (public.is_admin() or recommended_by = auth.uid());

-- Admins can update/delete (mark joined/declined, remove).
drop policy if exists mi_admin_write on public.member_invites;
create policy mi_admin_write on public.member_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
