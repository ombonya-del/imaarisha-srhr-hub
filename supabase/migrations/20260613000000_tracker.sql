-- ════════════════════════════════════════════════════════════════════════════
-- SRHR TRACKER — County Accountability Scorecard schema + seed
-- Run in Imaarisha project (uwxtqyqyrhhxqagaqelg) SQL editor or via `supabase db push`
--
-- Non-destructive: uses `create table if not exists` and `on conflict do nothing`,
-- so it is safe to run against a project where these tables already hold live,
-- admin-curated values — existing rows are never overwritten.
-- Depends on public.is_admin() (defined in rls-fix.sql / admin_uliza migration).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. INDICATORS: the ten national SRHR indicators ─────────────────────────
create table if not exists public.tracker_indicators (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,            -- merge key with the app's static metadata
  subtitle        text,
  current_value   numeric default 0,
  target_value    numeric,
  unit            text default '',          -- '%' | 'counties' | 'claims' | '' (count)
  progress_pct    int,                      -- optional override; app computes if null
  higher_is_better boolean default true,    -- false for disinfo index & unsafe-abortion deaths
  sort_order      int default 0,
  updated_at      timestamptz default now()
);
-- Reconcile an older pre-existing table: add any columns it may be missing.
alter table public.tracker_indicators add column if not exists subtitle         text;
alter table public.tracker_indicators add column if not exists current_value    numeric default 0;
alter table public.tracker_indicators add column if not exists target_value     numeric;
alter table public.tracker_indicators add column if not exists unit             text default '';
alter table public.tracker_indicators add column if not exists progress_pct     int;
alter table public.tracker_indicators add column if not exists higher_is_better boolean default true;
alter table public.tracker_indicators add column if not exists sort_order       int default 0;
alter table public.tracker_indicators add column if not exists updated_at       timestamptz default now();

-- Unique name enables idempotent, non-destructive seeding below.
create unique index if not exists tracker_indicators_name_idx on public.tracker_indicators (name);

-- ── 2. SUBMISSIONS: member-contributed quarterly data points ────────────────
create table if not exists public.tracker_submissions (
  id            uuid primary key default gen_random_uuid(),
  indicator_id  uuid references public.tracker_indicators(id) on delete cascade,
  submitted_by  uuid references auth.users(id) on delete set null,
  value         numeric,
  quarter       text,
  notes         text,
  status        text default 'pending',     -- pending | accepted | rejected
  created_at    timestamptz default now()
);
-- Reconcile an older pre-existing table: add any columns it may be missing.
alter table public.tracker_submissions add column if not exists indicator_id uuid references public.tracker_indicators(id) on delete cascade;
alter table public.tracker_submissions add column if not exists submitted_by uuid references auth.users(id) on delete set null;
alter table public.tracker_submissions add column if not exists value        numeric;
alter table public.tracker_submissions add column if not exists quarter      text;
alter table public.tracker_submissions add column if not exists notes        text;
alter table public.tracker_submissions add column if not exists status       text default 'pending';
alter table public.tracker_submissions add column if not exists created_at   timestamptz default now();

create index if not exists tracker_submissions_indicator_idx
  on public.tracker_submissions (indicator_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.tracker_indicators  enable row level security;
alter table public.tracker_submissions enable row level security;

-- Indicators: world-readable; only admins write.
drop policy if exists tracker_indicators_read   on public.tracker_indicators;
drop policy if exists tracker_indicators_admin_ins on public.tracker_indicators;
drop policy if exists tracker_indicators_admin_upd on public.tracker_indicators;
drop policy if exists tracker_indicators_admin_del on public.tracker_indicators;
create policy tracker_indicators_read      on public.tracker_indicators for select using (true);
create policy tracker_indicators_admin_ins on public.tracker_indicators for insert with check (public.is_admin());
create policy tracker_indicators_admin_upd on public.tracker_indicators for update using (public.is_admin());
create policy tracker_indicators_admin_del on public.tracker_indicators for delete using (public.is_admin());

-- Submissions: readable by all (drives the "contributing orgs" view); any signed-in
-- member may submit a pending data point for themselves; admins moderate.
drop policy if exists tracker_submissions_read     on public.tracker_submissions;
drop policy if exists tracker_submissions_insert   on public.tracker_submissions;
drop policy if exists tracker_submissions_admin_upd on public.tracker_submissions;
drop policy if exists tracker_submissions_admin_del on public.tracker_submissions;
create policy tracker_submissions_read   on public.tracker_submissions for select using (true);
create policy tracker_submissions_insert on public.tracker_submissions for insert with check (
  auth.uid() is not null
  and status = 'pending'
  and (submitted_by is null or submitted_by = auth.uid())
);
create policy tracker_submissions_admin_upd on public.tracker_submissions for update using (public.is_admin());
create policy tracker_submissions_admin_del on public.tracker_submissions for delete using (public.is_admin());

-- ── SEED: baseline reference figures (matches the app's static fallback) ─────
-- on conflict (name) do nothing → never clobbers live admin-curated values.
insert into public.tracker_indicators
  (name, subtitle, current_value, target_value, unit, progress_pct, higher_is_better, sort_order)
values
  ('Family Planning Coverage',              'Modern contraceptive prevalence (mCPR), women 15-49',          53,  70,  '%',        76, true,  1),
  ('SRHR Disinformation Index',             'Active disinfo claims tracked (lower is better)',              12,  10,  'claims',   80, false, 2),
  ('Youth SRHR Services',                   'Operational youth-friendly facilities',                        312, 400, '',         78, true,  3),
  ('GBV Response Coverage',                 'Counties with functional GBV response',                        29,  47,  'counties', 62, true,  4),
  ('Access to SRHR Services',               'UHC service coverage index',                                   56,  80,  '%',        70, true,  5),
  ('Youth Friendliness of SRHR Facilities', 'Facilities meeting WHO youth-friendly standards',              38,  75,  '%',        51, true,  6),
  ('Young Girls Accessing Safe Abortion',   'Girls 10-19 accessing safe, legal services (Art. 26)',         23,  50,  '%',        46, true,  7),
  ('Women Accessing Safe Abortion',         'Women 20-49 accessing safe, legal services (Art. 26)',         31,  60,  '%',        52, true,  8),
  ('Deaths from Unsafe Abortion',           'Share of maternal deaths from unsafe abortion (lower is better)', 14, 5, '%',       70, false, 9),
  ('Access to Quality SRHR Information',    'Comprehensive SRHR/HIV knowledge',                             60,  85,  '%',        71, true,  10)
on conflict (name) do nothing;
