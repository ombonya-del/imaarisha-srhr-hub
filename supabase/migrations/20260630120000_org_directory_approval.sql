-- ── Member-organization Directory: approval gate + self-registration ──────────
-- New members' organizations are added as PENDING on sign-up; an admin approves
-- them before they appear in the public Directory. Existing orgs are grandfathered
-- in as approved so the current list keeps showing.

alter table public.organizations add column if not exists approved     boolean      default false;
alter table public.organizations add column if not exists submitted_by uuid         references auth.users(id);
alter table public.organizations add column if not exists created_at    timestamptz  default now();

-- Grandfather everything already in the table (keep the existing Directory intact)
update public.organizations set approved = true where approved is distinct from true;

-- Seed the known network member organizations (idempotent — skips any already there)
insert into public.organizations (name, short_name, slug, focus_area, approved)
select v.name, v.short_name, v.slug, v.focus_area, true
from (values
  ('AfyAfrika',          'AfyAfrika',          'afyafrika',          'SRHR service delivery'),
  ('NAYA Kenya',         'NAYA',               'naya-kenya',         'Youth advocacy'),
  ('CYAN',               'CYAN',               'cyan',               'Youth network'),
  ('Zamara Foundation',  'Zamara',             'zamara-foundation',  'Women & girls'),
  ('Men Engage Kenya',   'Men Engage Kenya',   'men-engage-kenya',   'Positive masculinity'),
  ('Activate Action',    'Activate Action',    'activate-action',    'Youth-led advocacy'),
  ('Zana Africa',        'Zana Africa',        'zana-africa',        'Menstrual health & education'),
  ('This Ability Trust', 'This Ability Trust', 'this-ability-trust', 'Disability & SRHR'),
  ('MMAAK',              'MMAAK',              'mmaak',              'Male action'),
  ('Beyond Initiative',  'Beyond Initiative',  'beyond-initiative',  'Community SRHR'),
  ('Secny CBO',          'Secny CBO',          'secny-cbo',          'Community-based org'),
  ('SRHR Alliance',      'SRHR Alliance',      'srhr-alliance',      'Coalition')
) as v(name, short_name, slug, focus_area)
where not exists (
  select 1 from public.organizations o
  where lower(o.name) = lower(v.name) or o.slug = v.slug
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;

-- A signed-in member may submit their OWN organization, and only as pending
-- (approved is forced false; an admin flips it later). Remove any older open
-- insert policy first so members can't self-approve.
drop policy if exists "Auth insert organizations"   on public.organizations;
drop policy if exists "member submit organization"  on public.organizations;
create policy "member submit organization" on public.organizations
  for insert
  with check ( auth.uid() is not null and submitted_by = auth.uid() and approved = false );

-- Admin approves / edits / removes
drop policy if exists "admin_update_organizations" on public.organizations;
create policy "admin_update_organizations" on public.organizations
  for update using ( public.is_admin() );
drop policy if exists "admin_delete_organizations" on public.organizations;
create policy "admin_delete_organizations" on public.organizations
  for delete using ( public.is_admin() );

-- NOTE: SELECT stays open (org names aren't sensitive on a community hub); the
-- public Directory query filters approved = true, so pending orgs never show
-- publicly. If you'd rather hide pending rows at the API level too, replace the
-- read policy with:
--   using ( approved or public.is_admin() or submitted_by = auth.uid() )
