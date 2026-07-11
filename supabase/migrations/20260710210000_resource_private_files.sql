-- Un-shareable resource files: move uploaded files behind a PRIVATE bucket and
-- serve them only through short-lived (60s) signed URLs an approved member mints
-- at download time. A copied link expires almost immediately, so files can't be
-- forwarded to non-members. (Linked resources — external URLs — are unaffected.)

-- 1) store the storage key (path) for uploaded files, separate from external links
alter table public.resources add column if not exists file_path text;

-- 2) backfill the path out of existing public URLs, then drop the now-dead URL
update public.resources
set file_path = regexp_replace(file_url, '^.*/storage/v1/object/public/resources/', '')
where file_path is null
  and file_url like '%/storage/v1/object/public/resources/%';

update public.resources
set file_url = null
where file_path is not null
  and file_url like '%/storage/v1/object/public/resources/%';

-- 3) make the bucket private (public URLs stop resolving)
update storage.buckets set public = false where id = 'resources';

-- 4) reads now require an approved member (this is what lets them mint a signed
--    URL); the old public-read policy is removed so anonymous links can't resolve
drop policy if exists "resources read (public)" on storage.objects;
drop policy if exists "resources read (approved members)" on storage.objects;
create policy "resources read (approved members)" on storage.objects
  for select to authenticated
  using (bucket_id = 'resources' and public.is_approved());
