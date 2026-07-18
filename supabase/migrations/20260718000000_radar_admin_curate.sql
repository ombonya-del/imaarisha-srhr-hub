-- Curated social posts for the Ukweli "Trending" tab.
-- radar_items writes were service-role-only (the scanner). This adds a NARROW,
-- admin-gated insert/delete so hub admins can hand-curate real TikTok / YouTube / X
-- post URLs (which the free auto-feeds can't reach) straight into the disinfo Radar.
-- Public read is unchanged; anon still cannot write.

drop policy if exists radar_items_admin_insert on public.radar_items;
create policy radar_items_admin_insert on public.radar_items
  for insert to authenticated
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

drop policy if exists radar_items_admin_delete on public.radar_items;
create policy radar_items_admin_delete on public.radar_items
  for delete to authenticated
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));
