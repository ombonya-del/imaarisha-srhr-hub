-- Let hub admins EDIT curated radar_items (fix title/typology/url, toggle the
-- disinfo flag) from the Trending curate tool. Complements the insert/delete
-- policies added in 20260718000000. Public read unchanged; anon still cannot write.

drop policy if exists radar_items_admin_update on public.radar_items;
create policy radar_items_admin_update on public.radar_items
  for update to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ))
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));
