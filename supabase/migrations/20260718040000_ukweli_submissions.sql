-- Ukweli media, phase 3: youth-submitted media (moderated).
-- Young people can share a myth they've heard (with a photo/video/file) from the
-- app. Submissions arrive as 'pending' via the turnstile-verify edge function
-- (service-role insert; the function forces status='pending' and whitelists cols).
-- Public sees only APPROVED items; admins moderate. Anon may upload files ONLY
-- into the submissions/ folder of the media bucket.

create table if not exists public.ukweli_submissions (
  id          uuid primary key default gen_random_uuid(),
  caption     text,
  media_url   text,
  media_type  text,                       -- 'image' | 'video' | 'file'
  language    text default 'en',
  status      text default 'pending',      -- pending | approved | rejected
  created_at  timestamptz default now()
);

alter table public.ukweli_submissions enable row level security;

-- Public reads only approved submissions
drop policy if exists ukweli_sub_read on public.ukweli_submissions;
create policy ukweli_sub_read on public.ukweli_submissions
  for select using (status = 'approved');

-- Admins moderate (read all / approve / reject / delete)
drop policy if exists ukweli_sub_admin on public.ukweli_submissions;
create policy ukweli_sub_admin on public.ukweli_submissions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- NOTE: no anon INSERT policy — submissions come through turnstile-verify (service role).

-- Anonymous youth may upload files, but ONLY into the submissions/ folder.
drop policy if exists "ukweli-media submit (public)" on storage.objects;
create policy "ukweli-media submit (public)" on storage.objects
  for insert to public
  with check (bucket_id = 'ukweli-media' and (storage.foldername(name))[1] = 'submissions');
