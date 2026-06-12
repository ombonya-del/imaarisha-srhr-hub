-- ════════════════════════════════════════════════════════════════════════════
-- SRHR DISINFORMATION RADAR + UKWELI/ULIZA — schema
-- Run in Imaarisha project (uwxtqyqyrhhxqagaqelg) SQL editor or via `supabase db push`
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. RADAR: classified SRHR posts/articles ────────────────────────────────
create table if not exists public.radar_items (
  id            uuid primary key default gen_random_uuid(),
  source_name   text,
  title         text not null,
  snippet       text,
  url           text,
  platform      text,                 -- news | youtube | tiktok | x
  published_at  timestamptz,
  -- classification
  srhr_relevance  int default 0,      -- 0-10
  harm_score      int default 0,      -- 0-10 (how harmful/misleading)
  sentiment       text default 'neutral', -- alarming|negative|neutral|positive
  typology        text default 'none',    -- contraceptive_myth|fertility_abortion|anti_cse|faith_healing|none
  is_disinfo      boolean default false,
  languages       text[] default '{}',    -- en|sw|sheng
  scanned_at      timestamptz default now()
);
create index if not exists radar_items_scanned_idx on public.radar_items (scanned_at desc);
create index if not exists radar_items_typology_idx on public.radar_items (typology) where is_disinfo;

-- ── 2. RADAR INDEX: daily SRHR Narrative Index ──────────────────────────────
create table if not exists public.radar_index (
  date            date primary key,
  score           int default 0,      -- 0-100 narrative-harm index (higher = worse)
  prev_score      int default 0,
  item_count      int default 0,
  positive_share  numeric default 0,  -- % positive (the 3.6% benchmark)
  disinfo_count   int default 0,
  myth_signals    int default 0,
  fertility_signals int default 0,
  cse_signals     int default 0,
  faith_signals   int default 0,
  high_alert      boolean default false,
  updated_at      timestamptz default now()
);

-- ── 3. ULIZA: anonymous youth Q&A ───────────────────────────────────────────
create table if not exists public.uliza_questions (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  language     text default 'en',
  category     text,
  status       text default 'pending',  -- pending|answered|hidden
  answer       text,
  answered_by  text,                     -- verified professional display name
  answered_at  timestamptz,
  upvotes      int default 0,
  created_at   timestamptz default now()
);
create index if not exists uliza_status_idx on public.uliza_questions (status, created_at desc);

-- ── 4. UKWELI: myth-buster cards ────────────────────────────────────────────
create table if not exists public.ukweli_cards (
  id           uuid primary key default gen_random_uuid(),
  typology     text not null,
  claim        text not null,          -- the myth, as people say it
  why_it_feels_true text,              -- emotional resonance (research insists on this)
  truth        text not null,
  what_to_do   text,
  language     text default 'en',
  sort_order   int default 0,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.radar_items     enable row level security;
alter table public.radar_index     enable row level security;
alter table public.uliza_questions enable row level security;
alter table public.ukweli_cards    enable row level security;

-- Public can read radar + published Ukweli; writes are service-role only
drop policy if exists radar_items_read on public.radar_items;
create policy radar_items_read on public.radar_items for select using (true);

drop policy if exists radar_index_read on public.radar_index;
create policy radar_index_read on public.radar_index for select using (true);

drop policy if exists ukweli_read on public.ukweli_cards;
create policy ukweli_read on public.ukweli_cards for select using (active = true);

-- Uliza: anyone may READ answered questions, anyone may ASK (insert), but only
-- the safe columns. Answering/hiding is service-role/admin only.
drop policy if exists uliza_read   on public.uliza_questions;
drop policy if exists uliza_ask    on public.uliza_questions;
create policy uliza_read on public.uliza_questions for select using (status = 'answered');
create policy uliza_ask  on public.uliza_questions for insert with check (
  status = 'pending' and answer is null and answered_by is null
);
