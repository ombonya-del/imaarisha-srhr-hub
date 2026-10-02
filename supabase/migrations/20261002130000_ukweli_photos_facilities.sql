-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — youth feedback, part 2 (Oct 2026)
--   1. Optional photo with a question — PRIVATE bucket, only admins can view,
--      deleted when the question is answered or hidden (done by the admin app).
--   2. Admins can see hidden (inactive) Hebu Fika facilities, so new listings can
--      be checked before they go live.
--   3. Facilities young people named (Juja Road, Mathare, Dandora, MSF) added as
--      HIDDEN, UNVERIFIED drafts. Phone each one, fix details in Admin → Hebu Fika
--      → Facilities, set "Details checked on", then tick "Show in the app".
-- Run AFTER 20261002120000_ukweli_youth_feedback.sql. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Photo questions ───────────────────────────────────────────────────────
alter table public.uliza_questions add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uliza-photos', 'uliza-photos', false, 3145728, array['image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/webp'];

-- Anyone may upload into q/ (they can't list, read, overwrite or delete).
drop policy if exists "uliza-photos upload (public)" on storage.objects;
create policy "uliza-photos upload (public)" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'uliza-photos' and (storage.foldername(name))[1] = 'q');
-- Only admins may view or delete.
drop policy if exists "uliza-photos admin read" on storage.objects;
create policy "uliza-photos admin read" on storage.objects
  for select using (bucket_id = 'uliza-photos' and public.is_admin());
drop policy if exists "uliza-photos admin delete" on storage.objects;
create policy "uliza-photos admin delete" on storage.objects
  for delete using (bucket_id = 'uliza-photos' and public.is_admin());

-- ── 2. Admins see hidden facilities too ─────────────────────────────────────
drop policy if exists fika_facilities_admin_read on public.fika_facilities;
create policy fika_facilities_admin_read on public.fika_facilities
  for select using (public.is_admin());

-- ── 3. Draft listings from the youth test run (all hidden until verified) ───
insert into public.fika_facilities
  (id, name, county, area, kind, services, verified, active, cost_level, cost_note, hours, phone, age_note)
values
('f-nbo-dandora-yfc', 'Dandora Youth Friendly Centre (Dandora II Health Centre)', 'Nairobi', 'Dandora, Embakasi North', 'public',
  array['Family planning','Pregnancy tests','Antenatal care','Post-abortion care','HIV testing','STI care','GBV support','Counselling','Mental health','HPV vaccine'],
  false, false, null, 'UNVERIFIED — county + MSF run; likely free but confirm. Source: MSF press release 14 Aug 2026.',
  'Open 7 days (times not published)', null, '10–24 years'),
('f-nbo-dandora-ii', 'Dandora II Health Centre', 'Nairobi', 'Dandora Area I, Embakasi North', 'public',
  array['Family planning','Antenatal care','HIV testing','STI care','Mental health (Mondays)'],
  false, false, null, 'UNVERIFIED — public health centre; confirm fees. ("Dandora Level II" in the youth feedback = this facility.)',
  null, null, null),
('f-nbo-lavender-house', 'MSF Lavender House Clinic', 'Nairobi', 'Juja Road, Eastleigh (serves Mathare & Huruma)', 'ngo',
  array['Sexual violence care','PEP','Emergency contraception','STI care','Counselling','Medico-legal support','24h emergency room'],
  false, false, 'free', 'Free (MSF). UNVERIFIED phone — confirm before publishing.',
  '24 hours, 7 days', '0800 721 100', 'All ages'),
('f-nbo-kutrrh-tumaini', 'Tumaini Clinic, KUTRRH', 'Nairobi', 'Thika Road, Kahawa', 'public',
  array['Sexual violence care','PEP','Emergency contraception','STI care','Counselling','Forensic & legal documentation'],
  false, false, 'free', 'Free (KUTRRH + MSF, opened Mar 2026). Check whether it is listed under Nairobi or Kiambu.',
  '24/7, no appointment (Accident & Emergency)', '1558', 'All ages'),
('f-nbo-mama-lucy-tumaini', 'Tumaini GBV Clinic, Mama Lucy Kibaki Hospital', 'Nairobi', 'Umoja / Kayole, Embakasi', 'public',
  array['Sexual violence care'],
  false, false, null, 'LOW CONFIDENCE — opened 2021; no 2025–26 source confirms it still runs. Phone before listing.',
  null, null, null),
('f-nbo-mama-margaret', 'Mama Margaret Uhuru Hospital', 'Nairobi', 'Mathare North / Korogocho', 'public',
  array['Maternity','Outpatient','Emergency','GBV care'],
  false, false, null, 'LOW CONFIDENCE — partly operational in 2025 (drug shortages reported). Phone before listing.',
  null, null, null),
('f-nbo-mathare-north', 'Mathare North Health Centre', 'Nairobi', 'Mathare North, behind NYS Engineering', 'public',
  array['Family planning','HIV testing','Adolescent SRH','Peer support','Counselling','Mental health (Tuesdays)'],
  false, false, null, 'UNVERIFIED — public facility; confirm fees. Listed on the MoH Rika youth-friendly directory.',
  'Mon–Fri 8am–5pm', null, null),
('f-nbo-kariobangi-hc', 'Kariobangi Health Centre', 'Nairobi', 'Kariobangi North, Embakasi North', 'public',
  array['Family planning','Antenatal care','HIV testing','STI care','Mental health (Tuesdays)'],
  false, false, null, 'LOW CONFIDENCE — no youth corner found. Confirm before listing.',
  null, null, null),
('f-nbo-pumwani', 'Pumwani Maternity Hospital', 'Nairobi', 'Pumwani, Kamukunji (near Juja Road)', 'public',
  array['Antenatal care','Delivery','Teen maternal care','Reproductive health','Counselling'],
  false, false, null, 'UNVERIFIED — confirm fees. Listed on the MoH Rika youth-friendly directory.',
  '24 hours', '+254 20 2726810', null)
on conflict (id) do nothing;
