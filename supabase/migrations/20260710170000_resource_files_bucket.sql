-- Storage bucket for member-uploaded resource files (media + documents),
-- complementing the link option. Public bucket: approved members upload, anyone
-- can read the file via its URL (matches how linked resources already work).
-- (Restricted resources stay UI-gated; hard file-level locking via a private
-- bucket + signed URLs is a future step.)

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "resources upload (approved members)" on storage.objects;
create policy "resources upload (approved members)" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resources' and public.is_approved());

drop policy if exists "resources read (public)" on storage.objects;
create policy "resources read (public)" on storage.objects
  for select to public
  using (bucket_id = 'resources');

drop policy if exists "resources delete (admin)" on storage.objects;
create policy "resources delete (admin)" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resources' and public.is_admin());
