-- Ukweli media, phase 2: Learn goes database-backed (with media).
-- The hardcoded lib/learn.js stays as a fallback so nothing is lost; admins can
-- now add/edit Learn topics (with an image/video/file) from the hub, and those
-- render alongside the built-in topics. Public read (active); admin-only write.

create table if not exists public.ukweli_learn (
  id          uuid primary key default gen_random_uuid(),
  sort_order  int  default 0,
  color       text default '#3FE0A0',
  emoji       text default '📖',
  language    text default 'en',            -- 'en' | 'sw' | 'sheng'
  title       text not null,
  intro       text,
  points      jsonb default '[]'::jsonb,     -- array of [head, body]
  media_url   text,
  media_type  text,                          -- 'image' | 'video' | 'file'
  active      boolean default true,
  created_at  timestamptz default now()
);

create index if not exists ukweli_learn_order_idx on public.ukweli_learn (language, sort_order);

alter table public.ukweli_learn enable row level security;

drop policy if exists ukweli_learn_read on public.ukweli_learn;
create policy ukweli_learn_read on public.ukweli_learn
  for select using (active = true);

drop policy if exists ukweli_learn_admin_write on public.ukweli_learn;
create policy ukweli_learn_admin_write on public.ukweli_learn
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
