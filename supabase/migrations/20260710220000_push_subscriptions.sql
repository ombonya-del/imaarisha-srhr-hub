-- Web-push subscriptions for hub members. A member opts in (🔔) and their
-- browser/device subscription is stored; the send-push function targets the
-- 'hub_members' group when a new event is approved or an admin broadcasts.

create table if not exists public.push_subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  endpoint           text unique not null,
  p256dh             text not null,
  auth               text not null,
  user_id            uuid references auth.users(id) on delete cascade,
  subscription_group text default 'hub_members',
  created_at         timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

-- A member manages only their own subscription rows.
drop policy if exists ps_insert on public.push_subscriptions;
create policy ps_insert on public.push_subscriptions
  for insert to authenticated
  with check (public.is_approved() and user_id = auth.uid());

drop policy if exists ps_update on public.push_subscriptions;
create policy ps_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists ps_delete on public.push_subscriptions;
create policy ps_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists ps_read on public.push_subscriptions;
create policy ps_read on public.push_subscriptions
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());
