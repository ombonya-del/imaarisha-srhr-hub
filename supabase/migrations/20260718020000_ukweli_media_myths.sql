-- Ukweli media, phase 1: Myths authoring + media.
-- Adds media to myth cards, a public storage bucket for Ukweli media, and admin
-- write access so the hub control room can author/edit Myths cards (previously
-- seeded via SQL only). Public read is unchanged; anon still cannot write.

-- 1. Media columns on the myth cards
alter table public.ukweli_cards add column if not exists media_url  text;
alter table public.ukweli_cards add column if not exists media_type text;   -- 'image' | 'video' | 'file'

-- 2. Public storage bucket for Ukweli media (images/videos/docs served by URL)
insert into storage.buckets (id, name, public)
values ('ukweli-media', 'ukweli-media', true)
on conflict (id) do nothing;

drop policy if exists "ukweli-media upload (admin)" on storage.objects;
create policy "ukweli-media upload (admin)" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ukweli-media' and public.is_admin());

drop policy if exists "ukweli-media update (admin)" on storage.objects;
create policy "ukweli-media update (admin)" on storage.objects
  for update to authenticated
  using (bucket_id = 'ukweli-media' and public.is_admin());

drop policy if exists "ukweli-media read (public)" on storage.objects;
create policy "ukweli-media read (public)" on storage.objects
  for select to public
  using (bucket_id = 'ukweli-media');

drop policy if exists "ukweli-media delete (admin)" on storage.objects;
create policy "ukweli-media delete (admin)" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ukweli-media' and public.is_admin());

-- 3. Admin write access to myth cards (author/edit/remove from the hub)
drop policy if exists ukweli_cards_admin_write on public.ukweli_cards;
create policy ukweli_cards_admin_write on public.ukweli_cards
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
