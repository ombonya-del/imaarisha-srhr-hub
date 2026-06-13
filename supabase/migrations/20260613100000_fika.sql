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
  comment      text,
  language     text default 'en',
  status       text default 'pending',          -- pending | published | hidden
  created_at   timestamptz default now()
);
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
  ('f-ug-1','Moi Teaching & Referral Hospital — Rafiki Centre','Uasin Gishu','Eldoret','public', array['Youth-friendly services','HIV testing','Family planning','Counselling'], true)
on conflict (id) do nothing;
