-- ════════════════════════════════════════════════════════════════════════════
-- HEBU FIKA — youth-rated access to SRHR services (UkweliSRHR app)
-- Run in Imaarisha project (uwxtqyqyrhhxqagaqelg) SQL editor or via `supabase db push`
--
-- fika_facilities : service points (public hospitals, NGO/youth centres, clinics)
-- fika_reviews    : anonymous experiences + ratings submitted by young people
--
-- Reviews are moderated: they insert as 'pending' and only show once an admin
-- sets status = 'published'. Ratings are built only from real submissions —
-- the app never displays a fabricated score.
-- Non-destructive: create-if-not-exists + on-conflict-do-nothing seeding.
-- Depends on public.is_admin().
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.fika_facilities (
  id          text primary key,                 -- stable slug id (matches app fallback ids)
  name        text not null,
  county      text not null,
  area        text,
  kind        text default 'public',            -- public | ngo | private
  services    text[] default '{}',
  verified    boolean default false,            -- a known, established service point
  active      boolean default true,
  created_at  timestamptz default now()
);
create index if not exists fika_facilities_county_idx on public.fika_facilities (county) where active;

create table if not exists public.fika_reviews (
  id           uuid primary key default gen_random_uuid(),
  facility_id  text references public.fika_facilities(id) on delete cascade,
  rating       int not null check (rating between 1 and 5),
  attributes   text[] default '{}',             -- Uber-style "what was good" tags
  comment      text,
  language     text default 'en',
  status       text default 'pending',          -- pending | published | hidden
  created_at   timestamptz default now()
);
-- Reconcile an older table that predates the attributes column.
alter table public.fika_reviews add column if not exists attributes text[] default '{}';
create index if not exists fika_reviews_facility_idx on public.fika_reviews (facility_id, status);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.fika_facilities enable row level security;
alter table public.fika_reviews    enable row level security;

-- Facilities: world-readable; admins curate.
drop policy if exists fika_facilities_read      on public.fika_facilities;
drop policy if exists fika_facilities_admin_ins  on public.fika_facilities;
drop policy if exists fika_facilities_admin_upd  on public.fika_facilities;
drop policy if exists fika_facilities_admin_del  on public.fika_facilities;
create policy fika_facilities_read     on public.fika_facilities for select using (active = true);
create policy fika_facilities_admin_ins on public.fika_facilities for insert with check (public.is_admin());
create policy fika_facilities_admin_upd on public.fika_facilities for update using (public.is_admin());
create policy fika_facilities_admin_del on public.fika_facilities for delete using (public.is_admin());

-- Reviews: anyone may read PUBLISHED ones; anyone (anonymous youth) may submit a
-- PENDING review with the safe columns only; admins moderate.
drop policy if exists fika_reviews_read   on public.fika_reviews;
drop policy if exists fika_reviews_submit on public.fika_reviews;
drop policy if exists fika_reviews_admin_upd on public.fika_reviews;
drop policy if exists fika_reviews_admin_del on public.fika_reviews;
create policy fika_reviews_read   on public.fika_reviews for select using (status = 'published');
create policy fika_reviews_submit on public.fika_reviews for insert with check (
  status = 'pending' and rating between 1 and 5
);
create policy fika_reviews_admin_upd on public.fika_reviews for update using (public.is_admin());
create policy fika_reviews_admin_del on public.fika_reviews for delete using (public.is_admin());

-- ── SEED: real, publicly-known SRHR service points (starting list, no ratings) ─
insert into public.fika_facilities (id, name, county, area, kind, services, verified) values
  ('f-nbo-1','Kenyatta National Hospital — Youth Centre','Nairobi','Upper Hill','public', array['Family planning','HIV testing','Counselling','Antenatal care'], true),
  ('f-nbo-2','Marie Stopes Kenya — Nairobi','Nairobi','Multiple branches','ngo', array['Family planning','Safe care','HIV testing','GBV support'], true),
  ('f-nbo-3','NAYA Kenya (youth SRHR)','Nairobi','Nairobi','ngo', array['Information','Referrals','Peer support'], true),
  ('f-msa-1','Coast General Teaching & Referral Hospital','Mombasa','Mombasa Island','public', array['Family planning','HIV testing','Antenatal care','GBV care'], true),
  ('f-ksm-1','Jaramogi Oginga Odinga Teaching & Referral Hospital','Kisumu','Kisumu Central','public', array['Family planning','HIV testing','Counselling','GBV care'], true),
  ('f-nku-1','Nakuru Level 5 Hospital (PGH)','Nakuru','Nakuru Town','public', array['Family planning','HIV testing','Antenatal care'], true),
  ('f-ug-1','Moi Teaching & Referral Hospital — Rafiki Centre','Uasin Gishu','Eldoret','public', array['Youth-friendly services','HIV testing','Family planning','Counselling'], true),
  ('f-baringo-1','Kabarnet County Referral Hospital','Baringo','Kabarnet','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-bomet-1','Longisa County Referral Hospital','Bomet','Longisa','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-bungoma-1','Bungoma County Referral Hospital','Bungoma','Bungoma','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-busia-1','Busia County Referral Hospital','Busia','Busia','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-elgeyo-1','Iten County Referral Hospital','Elgeyo-Marakwet','Iten','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-embu-1','Embu Level 5 Hospital','Embu','Embu','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-garissa-1','Garissa County Referral Hospital','Garissa','Garissa','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-homabay-1','Homa Bay County Teaching & Referral Hospital','Homa Bay','Homa Bay','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-isiolo-1','Isiolo County Referral Hospital','Isiolo','Isiolo','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kajiado-1','Kajiado County Referral Hospital','Kajiado','Kajiado','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kakamega-1','Kakamega County General Teaching & Referral Hospital','Kakamega','Kakamega','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kericho-1','Kericho County Referral Hospital','Kericho','Kericho','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kiambu-1','Thika Level 5 Hospital','Kiambu','Thika','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kilifi-1','Kilifi County Referral Hospital','Kilifi','Kilifi','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kirinyaga-1','Kerugoya County Referral Hospital','Kirinyaga','Kerugoya','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kisii-1','Kisii Teaching & Referral Hospital','Kisii','Kisii','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kitui-1','Kitui County Referral Hospital','Kitui','Kitui','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-kwale-1','Kwale County Referral Hospital','Kwale','Kwale','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-laikipia-1','Nanyuki Teaching & Referral Hospital','Laikipia','Nanyuki','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-lamu-1','King Fahad County Referral Hospital','Lamu','Lamu','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-machakos-1','Machakos Level 5 Hospital','Machakos','Machakos','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-makueni-1','Makueni County Referral Hospital','Makueni','Wote','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-mandera-1','Mandera County Referral Hospital','Mandera','Mandera','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-marsabit-1','Marsabit County Referral Hospital','Marsabit','Marsabit','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-meru-1','Meru Teaching & Referral Hospital','Meru','Meru','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-migori-1','Migori County Referral Hospital','Migori','Migori','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-muranga-1','Murang’a County Referral Hospital','Murang’a','Murang’a','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-nandi-1','Kapsabet County Referral Hospital','Nandi','Kapsabet','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-narok-1','Narok County Referral Hospital','Narok','Narok','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-nyamira-1','Nyamira County Referral Hospital','Nyamira','Nyamira','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-nyandarua-1','J.M. Kariuki Memorial County Referral Hospital','Nyandarua','Ol Kalou','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-nyeri-1','Nyeri County Referral Hospital','Nyeri','Nyeri','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-samburu-1','Maralal County Referral Hospital','Samburu','Maralal','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-siaya-1','Siaya County Referral Hospital','Siaya','Siaya','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-taita-1','Moi County Referral Hospital, Voi','Taita-Taveta','Voi','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-tanariver-1','Hola County Referral Hospital','Tana River','Hola','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-tharaka-1','Chuka County Referral Hospital','Tharaka-Nithi','Chuka','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-transnzoia-1','Kitale County Referral Hospital','Trans Nzoia','Kitale','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-turkana-1','Lodwar County Referral Hospital','Turkana','Lodwar','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-vihiga-1','Vihiga County Referral Hospital','Vihiga','Vihiga','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-wajir-1','Wajir County Referral Hospital','Wajir','Wajir','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true),
  ('f-westpokot-1','Kapenguria County Referral Hospital','West Pokot','Kapenguria','public',array['Family planning','HIV testing','Counselling','Antenatal care'],true)
on conflict (id) do nothing;
