-- ============================================================================
-- ImaarishaSRHR — Digital Campaign Ecosystem
-- One registry for the campaign's media, plus the tracking, reporting and
-- KPI layer shared by hub.imaarishasrhr.org (partners/influencers/staff) and
-- ukweli.imaarishasrhr.org (public library).
--
-- Safe to run once on the existing Supabase project. Everything is prefixed
-- campaign_ so nothing collides with existing hub / radar tables.
-- Privacy: no names, phone numbers, emails or IP addresses of audience
-- members are stored anywhere in this schema.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Staff roles (who can manage the campaign)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'editor'
             check (role in ('admin','reviewer','editor','mel')),
  created_at timestamptz not null default now()
);

create or replace function public.campaign_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.campaign_staff where user_id = auth.uid());
$$;

-- reviewers (and admins) are the only people who can approve content
create or replace function public.campaign_is_reviewer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.campaign_staff
                 where user_id = auth.uid() and role in ('admin','reviewer'));
$$;

create or replace function public.campaign_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- 1. Myth taxonomy (shared with the Radar's four disinformation typologies)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_myths (
  slug           text primary key,
  label          text not null,
  typology       text not null check (typology in
                   ('contraceptive_safety','fertility_abortion','anti_cse','hiv_faith_healing','other')),
  false_claim    text,          -- the myth as it circulates
  verified_fact  text,          -- the counter, for briefs and cards
  sources        text[] not null default '{}',   -- WHO / MoH Kenya / NASCOP only
  myth_of_month  date,          -- first day of the month it is featured
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. Asset registry — masters (toolkit, 5 videos, 15 podcast episodes)
--    and every derivative cut from them (clips, voice notes, cards, inserts)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_assets (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  parent_id        uuid references public.campaign_assets(id) on delete set null,
  is_master        boolean generated always as (parent_id is null) stored,
  kind             text not null check (kind in
                    ('toolkit','toolkit_section','video','podcast_episode','clip','voice_note',
                     'radio_insert','card','graphic','message_card','audiogram','other')),
  series           text,            -- e.g. 'Imaarisha Conversations (Sheng)'
  episode_no       int,
  title            text not null,
  summary          text,
  language         text not null default 'en'
                    check (language in ('en','sw','sheng','maa','luo','multi')),
  audiences        text[] not null default '{}'
                    check (audiences <@ array['youth','mothers','men','practitioners','partners','faith']::text[]),
  myth_slugs       text[] not null default '{}',
  audience_facing  text not null default 'public' check (audience_facing in ('public','partners')),
  host             text not null default 'web'
                    check (host in ('youtube','podcast_host','supabase_storage','web','external')),
  external_id      text,            -- YouTube video id, podcast episode id, etc.
  url              text,            -- canonical play/view URL
  storage_path     text,            -- path in the campaign-media bucket (PDFs, cards, audio cuts)
  duration_seconds int,
  thumbnail_url    text,
  sources          text[] not null default '{}',
  winning_frame    text,            -- filled from a decided message test
  -- review workflow: nothing leaves 'private' until a reviewer approves it
  review_status    text not null default 'draft'
                    check (review_status in ('draft','in_review','changes_requested','approved')),
  review_notes     text,
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,
  -- visibility: private (staff), test (test-run cohort), public (everyone)
  visibility       text not null default 'private' check (visibility in ('private','test','public')),
  published_at     timestamptz,
  created_by       uuid default auth.uid() references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint campaign_assets_review_before_release
    check (visibility = 'private' or review_status = 'approved')
);
create index if not exists campaign_assets_parent_idx on public.campaign_assets(parent_id);
create index if not exists campaign_assets_myths_idx  on public.campaign_assets using gin(myth_slugs);

drop trigger if exists campaign_assets_touch on public.campaign_assets;
create trigger campaign_assets_touch before update on public.campaign_assets
  for each row execute function public.campaign_touch_updated_at();

-- Only reviewers can approve; approval is stamped; editing approved content
-- sends it back to review (so changes are re-checked for accuracy).
create or replace function public.campaign_assets_review_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_service boolean := auth.uid() is null;   -- SQL editor / service role
begin
  if new.review_status = 'approved'
     and (tg_op = 'INSERT' or old.review_status is distinct from 'approved') then
    if not is_service and not public.campaign_is_reviewer() then
      raise exception 'Only campaign reviewers can approve content';
    end if;
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    new.reviewed_at := now();
  end if;

  if tg_op = 'UPDATE' and old.review_status = 'approved' and new.review_status = 'approved'
     and not is_service and not public.campaign_is_reviewer()
     and (new.title, new.summary, new.url, new.external_id, new.storage_path, new.sources)
         is distinct from (old.title, old.summary, old.url, old.external_id, old.storage_path, old.sources) then
    new.review_status := 'in_review';
    new.visibility    := 'private';
  end if;

  if new.visibility = 'public' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists campaign_assets_review on public.campaign_assets;
create trigger campaign_assets_review before insert or update on public.campaign_assets
  for each row execute function public.campaign_assets_review_guard();

-- ---------------------------------------------------------------------------
-- 3. Voices — influencers, partner orgs, radio stations, champions
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_voices (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null check (code ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  display_name      text not null,
  voice_type        text not null check (voice_type in
                     ('nano','micro','macro','partner_org','radio_station','healthcare_worker',
                      'faith_leader','male_champion','mother_champion','internal')),
  primary_platforms text[] not null default '{}',
  county            text,
  onboarding_stage  text not null default 'identified' check (onboarding_stage in
                     ('identified','briefed','message_tested','co_creating','active','paused','exited')),
  onboarded_at      date,
  contact_user_id   uuid references auth.users(id),  -- their hub login, for self-reporting
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
drop trigger if exists campaign_voices_touch on public.campaign_voices;
create trigger campaign_voices_touch before update on public.campaign_voices
  for each row execute function public.campaign_touch_updated_at();

create or replace function public.campaign_my_voice_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from public.campaign_voices where contact_user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 4. Message tests (A/B arms, n=30–50 per arm, 7 days)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_message_tests (
  id              uuid primary key default gen_random_uuid(),
  theme           text not null,
  dimension       text not null check (dimension in ('language','frame','voice','format','faith_framing','other')),
  decision_metric text not null,     -- e.g. 'forward rate + saves'
  start_date      date,
  end_date        date,
  status          text not null default 'planned' check (status in ('planned','running','decided','abandoned')),
  winning_arm     text check (winning_arm in ('A','B')),
  decision_notes  text,
  created_at      timestamptz not null default now()
);

create table if not exists public.campaign_message_test_arms (
  id            uuid primary key default gen_random_uuid(),
  test_id       uuid not null references public.campaign_message_tests(id) on delete cascade,
  arm           text not null check (arm in ('A','B')),
  description   text not null,
  asset_id      uuid references public.campaign_assets(id),
  group_size    int,
  reached       int,
  forwards      int,
  saves         int,
  shares        int,
  completions   int,
  responses     int,
  trust_rating  numeric(3,1),        -- mean follow-up rating, 1–5
  unique (test_id, arm)
);

-- ---------------------------------------------------------------------------
-- 5. Tracked links (one per voice × asset × channel) and clicks
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_links (
  code            text primary key check (code ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  destination_url text not null check (destination_url ~ '^https://'),
  asset_id        uuid references public.campaign_assets(id) on delete set null,
  voice_id        uuid references public.campaign_voices(id) on delete set null,
  channel         text not null default 'other' check (channel in
                   ('tiktok','whatsapp','facebook','instagram','youtube','x','radio','sms','print','email','other')),
  test_arm_id     uuid references public.campaign_message_test_arms(id) on delete set null,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.campaign_link_clicks (
  id            bigint generated always as identity primary key,
  code          text not null references public.campaign_links(code) on delete cascade,
  clicked_at    timestamptz not null default now(),
  visitor_hash  text,      -- sha256(daily secret salt + ip + user agent); not reversible, resets daily
  referrer_host text,
  device        text check (device in ('mobile','desktop','tablet','bot','unknown')),
  country       text
);
create index if not exists campaign_link_clicks_code_idx on public.campaign_link_clicks(code, clicked_at);

-- ---------------------------------------------------------------------------
-- 6. First-party events from hub + Ukweli (anonymous browser session id)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  session_id  uuid not null,          -- random id generated in the browser
  asset_id    uuid references public.campaign_assets(id) on delete set null,
  event       text not null check (event in
               ('page_view','asset_view','play_start','progress_25','progress_50','progress_75',
                'complete','download','share','quiz_start','quiz_complete','link_out')),
  surface     text not null default 'other' check (surface in ('hub','ukweli','other')),
  via_code    text,                   -- tracked-link code that brought the visitor (?r=)
  share_target text,                  -- whatsapp / copy / facebook … for share events
  path        text
);
create index if not exists campaign_events_session_idx on public.campaign_events(session_id);
create index if not exists campaign_events_asset_idx   on public.campaign_events(asset_id, event);
create index if not exists campaign_events_time_idx    on public.campaign_events(occurred_at);

-- The only way in for anonymous visitors: validates and writes one event.
create or replace function public.log_campaign_event(
  p_session uuid, p_event text, p_asset_slug text default null,
  p_surface text default 'other', p_via text default null,
  p_share_target text default null, p_path text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_asset uuid;
begin
  if p_session is null then return; end if;
  if p_asset_slug is not null then
    select id into v_asset from public.campaign_assets
     where slug = p_asset_slug and visibility in ('test','public');
  end if;
  insert into public.campaign_events(session_id, asset_id, event, surface, via_code, share_target, path)
  values (p_session, v_asset, p_event,
          case when p_surface in ('hub','ukweli') then p_surface else 'other' end,
          case when p_via ~ '^[a-z0-9-]{2,64}$' then p_via end,
          left(p_share_target, 20),
          left(p_path, 200));
exception when check_violation then
  return;   -- unknown event names are dropped silently
end $$;

-- ---------------------------------------------------------------------------
-- 7. Platform numbers: own channels (weekly) + influencer / radio reports (monthly)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_channel_metrics (
  id               uuid primary key default gen_random_uuid(),
  period_start     date not null,
  period_end       date not null check (period_end >= period_start),
  source           text not null check (source in ('own_channel','influencer_report','radio_report')),
  voice_id         uuid references public.campaign_voices(id),
  platform         text not null check (platform in
                    ('tiktok','whatsapp','whatsapp_channel','facebook','instagram','youtube','x','radio','podcast','other')),
  asset_id         uuid references public.campaign_assets(id),
  impressions      bigint check (impressions >= 0),
  views            bigint check (views >= 0),
  unique_reach     bigint check (unique_reach >= 0),
  engagements      bigint check (engagements >= 0),
  shares           bigint check (shares >= 0),
  saves            bigint check (saves >= 0),
  comments         bigint check (comments >= 0),
  forwards         bigint check (forwards >= 0),
  followers        bigint check (followers >= 0),
  listeners        bigint check (listeners >= 0),   -- radio estimate / podcast downloads
  completion_rate  numeric(5,2) check (completion_rate between 0 and 100),
  posts_count      int,
  screenshot_paths text[] not null default '{}',     -- campaign-reports bucket
  notes            text,
  verified         boolean not null default false,  -- MEL officer checks screenshots
  verified_by      uuid references auth.users(id),
  submitted_by     uuid default auth.uid() references auth.users(id),
  created_at       timestamptz not null default now()
);
create index if not exists campaign_metrics_period_idx on public.campaign_channel_metrics(period_start);

-- ---------------------------------------------------------------------------
-- 8. Partner monthly check-in
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_partner_checkins (
  id                 uuid primary key default gen_random_uuid(),
  voice_id           uuid not null references public.campaign_voices(id),
  month              date not null check (extract(day from month) = 1),
  distributed        boolean not null,
  items_distributed  int check (items_distributed >= 0),
  people_reached_est int check (people_reached_est >= 0),
  service_referrals  int check (service_referrals >= 0),
  evidence_used_in   text,     -- advocacy use of the evidence (MB1.1a)
  observations       text,     -- what frontline staff are hearing
  testimonials       text,     -- anonymised only
  submitted_by       uuid default auth.uid() references auth.users(id),
  created_at         timestamptz not null default now(),
  unique (voice_id, month)
);

-- ---------------------------------------------------------------------------
-- 9. Disinformation surge log (rapid response timing)
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_surges (
  id                    uuid primary key default gen_random_uuid(),
  myth_slug             text references public.campaign_myths(slug),
  claim_summary         text not null,
  platform              text,
  detected_by           text not null default 'radar' check (detected_by in ('radar','partner','influencer','staff')),
  radar_item_ref        text,          -- id of the radar_items row, if any
  detected_at           timestamptz not null default now(),
  verified_at           timestamptz,
  briefed_at            timestamptz,
  first_counter_post_at timestamptz,
  counter_asset_ids     uuid[] not null default '{}',
  counter_posts         int,
  monitoring_ended_at   timestamptz,
  status                text not null default 'detected' check (status in
                         ('detected','verified','briefed','amplified','closed','dismissed')),
  outcome_notes         text,
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. Knowledge check (pre/post) — serves IA2.1 and the +15% accuracy KPI
-- ---------------------------------------------------------------------------
create table if not exists public.campaign_quiz_items (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  topic         text not null check (topic in ('contraception','hiv','cse','claiming_rights')),
  language      text not null default 'en' check (language in ('en','sw','sheng')),
  prompt        text not null,
  options       jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_index int not null check (correct_index >= 0),
  explanation   text,
  sources       text[] not null default '{}',
  review_status text not null default 'draft' check (review_status in ('draft','in_review','approved')),
  active        boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  constraint campaign_quiz_active_needs_review check (not active or review_status = 'approved')
);

create table if not exists public.campaign_quiz_responses (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid,                 -- online: browser session; paper: null
  wave               text not null check (wave in ('baseline','post','endline')),
  mode               text not null default 'online' check (mode in ('online','paper','listening_session')),
  asset_id           uuid references public.campaign_assets(id),
  via_code           text,
  county             text check (county in ('nairobi','narok','homa_bay','other_kenya')),
  age_band           text check (age_band in ('18-24','25-34','35-54','55+')),
  gender             text check (gender in ('woman','man','other','prefer_not')),
  answers            jsonb not null,       -- {"item_code": chosen_index}
  n_items            int not null,
  n_correct          int not null,
  topic_scores       jsonb not null,       -- {"contraception":[correct,total],…}
  knows_how_to_claim boolean not null,     -- all claiming_rights items correct
  entered_by         uuid default auth.uid() references auth.users(id),
  created_at         timestamptz not null default now()
);

-- public question list without the answer key
create or replace view public.campaign_quiz_public
with (security_barrier = true) as
  select code, topic, language, prompt, options, sort_order
  from public.campaign_quiz_items where active;

-- Grades server-side; returns score + explanations. Used online and for paper entry.
create or replace function public.submit_campaign_quiz(
  p_session uuid, p_wave text, p_answers jsonb,
  p_language text default 'en', p_asset_slug text default null, p_via text default null,
  p_county text default null, p_age_band text default null, p_gender text default null,
  p_mode text default 'online')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record; v_scores jsonb := '{}'::jsonb; v_feedback jsonb := '[]'::jsonb;
  v_n int := 0; v_ok int := 0; v_claim_total int := 0; v_claim_ok int := 0;
  v_choice int; v_correct boolean; v_asset uuid; v_pair jsonb;
begin
  if p_mode <> 'online' and not public.campaign_is_staff() then
    raise exception 'Only staff can enter paper / session responses';
  end if;
  if p_age_band is not null and p_age_band not in ('18-24','25-34','35-54','55+') then
    raise exception 'Adults (18+) only';
  end if;
  for r in select * from public.campaign_quiz_items
           where active and language = coalesce(p_language,'en') order by sort_order loop
    v_n := v_n + 1;
    v_choice  := nullif(p_answers ->> r.code, '')::int;
    v_correct := v_choice is not null and v_choice = r.correct_index;
    if v_correct then v_ok := v_ok + 1; end if;
    if r.topic = 'claiming_rights' then
      v_claim_total := v_claim_total + 1;
      if v_correct then v_claim_ok := v_claim_ok + 1; end if;
    end if;
    v_pair := coalesce(v_scores -> r.topic, '[0,0]'::jsonb);
    v_scores := jsonb_set(v_scores, array[r.topic],
      jsonb_build_array((v_pair->>0)::int + case when v_correct then 1 else 0 end, (v_pair->>1)::int + 1));
    v_feedback := v_feedback || jsonb_build_object(
      'code', r.code, 'correct', v_correct, 'correct_index', r.correct_index, 'explanation', r.explanation);
  end loop;
  if v_n = 0 then raise exception 'No active quiz items for language %', p_language; end if;

  if p_asset_slug is not null then
    select id into v_asset from public.campaign_assets where slug = p_asset_slug;
  end if;

  insert into public.campaign_quiz_responses(session_id, wave, mode, asset_id, via_code, county, age_band,
         gender, answers, n_items, n_correct, topic_scores, knows_how_to_claim)
  values (p_session, p_wave, p_mode, v_asset,
          case when p_via ~ '^[a-z0-9-]{2,64}$' then p_via end,
          p_county, p_age_band, p_gender, p_answers, v_n, v_ok, v_scores,
          v_claim_total > 0 and v_claim_ok = v_claim_total);

  if p_mode = 'online' and p_session is not null then
    perform public.log_campaign_event(p_session, 'quiz_complete', p_asset_slug, 'ukweli', p_via);
  end if;

  return jsonb_build_object('score', v_ok, 'out_of', v_n, 'feedback', v_feedback);
end $$;

-- ---------------------------------------------------------------------------
-- 11. KPI views (security_invoker: only staff can read, via RLS)
-- ---------------------------------------------------------------------------

-- Interactions, per the agreed definition: a unique browser session that
-- watched/listened ≥50%, downloaded, completed the quiz, or shared.
create or replace view public.campaign_kpi_interactions with (security_invoker = true) as
with qualifying as (
  select session_id, min(occurred_at) as first_at
  from public.campaign_events
  where event in ('progress_50','progress_75','complete','download','quiz_complete','share')
  group by session_id
),
offsite as (   -- link clicks that go straight off-site (YouTube, podcast apps), unique per visitor per day
  select count(distinct (c.visitor_hash, c.clicked_at::date)) as n
  from public.campaign_link_clicks c
  join public.campaign_links l using (code)
  where c.device <> 'bot' and c.visitor_hash is not null
    and l.destination_url !~ '^https://([a-z0-9-]+\.)?imaarishasrhr\.org'
)
select
  (select count(*) from qualifying)                         as engaged_sessions_onsite,
  (select n from offsite)                                   as offsite_link_visitors,
  (select count(*) from qualifying) + (select n from offsite) as interactions_estimate,
  3000                                                      as target_ia21;

create or replace view public.campaign_kpi_interactions_monthly with (security_invoker = true) as
select date_trunc('month', first_at)::date as month, count(*) as new_engaged_sessions
from (
  select session_id, min(occurred_at) first_at from public.campaign_events
  where event in ('progress_50','progress_75','complete','download','quiz_complete','share')
  group by session_id
) q group by 1 order by 1;

-- Platform reach and engagement by month, platform and source
create or replace view public.campaign_kpi_reach_monthly with (security_invoker = true) as
select date_trunc('month', period_start)::date as month, platform, source,
       sum(impressions) impressions, sum(views) views, sum(unique_reach) unique_reach,
       sum(engagements) engagements, sum(shares) shares, sum(forwards) forwards,
       sum(listeners) listeners,
       round(100.0 * sum(engagements) / nullif(sum(impressions),0), 2) as engagement_rate_pct,
       bool_and(verified) as all_verified
from public.campaign_channel_metrics
group by 1,2,3 order by 1,2,3;

-- Campaign totals vs agreed targets
create or replace view public.campaign_kpi_totals with (security_invoker = true) as
select
  coalesce(sum(impressions),0)  as impressions,       500000 as target_impressions,
  coalesce(sum(unique_reach),0) as reported_unique_reach, 50000 as target_unique_reach,
  coalesce(sum(views) filter (where platform='tiktok'),0)  as tiktok_views,  250000 as target_tiktok_views,
  coalesce(sum(views) filter (where platform='youtube'),0) as youtube_views, 50000  as target_youtube_views,
  (select max(followers) from public.campaign_channel_metrics where platform = 'whatsapp_channel') as whatsapp_channel_followers,
  1000 as target_whatsapp_subscribers,
  (select count(*) from public.campaign_voices
    where onboarding_stage = 'active' and voice_type not in ('partner_org','radio_station','internal')) as active_voices,
  15 as target_active_voices
from public.campaign_channel_metrics;

-- Knowledge change by wave (and the 15% "knows how to claim" share)
create or replace view public.campaign_kpi_knowledge with (security_invoker = true) as
select wave, county, count(*) as respondents,
       round(100.0 * avg(n_correct::numeric / nullif(n_items,0)), 1) as pct_correct,
       round(100.0 * avg(((topic_scores->'contraception'->>0)::numeric) / nullif((topic_scores->'contraception'->>1)::numeric,0)), 1) as pct_contraception,
       round(100.0 * avg(((topic_scores->'hiv'->>0)::numeric) / nullif((topic_scores->'hiv'->>1)::numeric,0)), 1)           as pct_hiv,
       round(100.0 * avg(((topic_scores->'cse'->>0)::numeric) / nullif((topic_scores->'cse'->>1)::numeric,0)), 1)           as pct_cse,
       round(100.0 * avg(case when knows_how_to_claim then 1 else 0 end), 1) as pct_knows_how_to_claim
from public.campaign_quiz_responses
group by grouping sets ((wave), (wave, county))
order by wave, county nulls first;

-- Rapid response timing
create or replace view public.campaign_kpi_rapid_response with (security_invoker = true) as
select s.*,
       round(extract(epoch from (briefed_at - detected_at))/3600.0, 1)            as hours_to_brief,
       round(extract(epoch from (first_counter_post_at - detected_at))/3600.0, 1) as hours_to_counter,
       (first_counter_post_at - detected_at) <= interval '48 hours'              as within_48h,
       (first_counter_post_at - detected_at) <= interval '2 hours'               as within_2h
from public.campaign_surges s
where status <> 'dismissed';

-- Partner activity per month (target: 8 of 10+ distributing)
create or replace view public.campaign_kpi_partners_monthly with (security_invoker = true) as
select month,
       count(*) filter (where distributed) as partners_distributing,
       count(*)                            as partners_reporting,
       8                                   as target_distributing,
       sum(service_referrals)              as service_referrals
from public.campaign_partner_checkins group by month order by month;

-- Per-asset performance (masters roll up their derivatives)
create or replace view public.campaign_kpi_assets with (security_invoker = true) as
select coalesce(a.parent_id, a.id) as master_id, m.title as master_title, a.id as asset_id, a.slug, a.kind, a.language,
       count(*) filter (where e.event = 'asset_view')  as views,
       count(*) filter (where e.event = 'play_start')  as plays,
       count(*) filter (where e.event in ('progress_50','progress_75','complete')) as half_or_more,
       count(*) filter (where e.event = 'complete')    as completes,
       count(*) filter (where e.event = 'download')    as downloads,
       count(*) filter (where e.event = 'share')       as shares,
       count(distinct e.session_id)                    as sessions
from public.campaign_assets a
join public.campaign_assets m on m.id = coalesce(a.parent_id, a.id)
left join public.campaign_events e on e.asset_id = a.id
group by 1,2,3,4,5,6;

-- Clicks per voice / channel (influencer and partner attribution)
create or replace view public.campaign_kpi_links with (security_invoker = true) as
select l.code, v.display_name as voice, v.voice_type, l.channel, a.slug as asset,
       count(c.id) filter (where c.device <> 'bot')                           as clicks,
       count(distinct (c.visitor_hash, c.clicked_at::date)) filter (where c.device <> 'bot') as unique_daily_visitors,
       (select count(distinct e.session_id) from public.campaign_events e where e.via_code = l.code) as sessions_landed,
       max(c.clicked_at) as last_click
from public.campaign_links l
left join public.campaign_voices v on v.id = l.voice_id
left join public.campaign_assets a on a.id = l.asset_id
left join public.campaign_link_clicks c on c.code = l.code
group by l.code, v.display_name, v.voice_type, l.channel, a.slug;

-- Public "campaign pulse": headline aggregates only, safe for anyone
create or replace function public.campaign_public_pulse()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'people_engaged',   (select interactions_estimate from public.campaign_kpi_interactions),
    'impressions',      (select coalesce(sum(impressions),0) from public.campaign_channel_metrics where verified),
    'active_voices',    (select count(*) from public.campaign_voices where onboarding_stage = 'active'
                           and voice_type not in ('partner_org','radio_station','internal')),
    'myths_countered',  (select count(*) from public.campaign_surges where status in ('amplified','closed')),
    'resources_public', (select count(*) from public.campaign_assets where visibility = 'public'),
    'updated_at',       now());
$$;

-- ---------------------------------------------------------------------------
-- 12. Row Level Security
-- ---------------------------------------------------------------------------
alter table public.campaign_staff            enable row level security;
alter table public.campaign_myths            enable row level security;
alter table public.campaign_assets           enable row level security;
alter table public.campaign_voices           enable row level security;
alter table public.campaign_message_tests    enable row level security;
alter table public.campaign_message_test_arms enable row level security;
alter table public.campaign_links            enable row level security;
alter table public.campaign_link_clicks      enable row level security;
alter table public.campaign_events           enable row level security;
alter table public.campaign_channel_metrics  enable row level security;
alter table public.campaign_partner_checkins enable row level security;
alter table public.campaign_surges           enable row level security;
alter table public.campaign_quiz_items       enable row level security;
alter table public.campaign_quiz_responses   enable row level security;

-- helper to (re)create a policy idempotently
create or replace function pg_temp.policy(p_table text, p_name text, p_sql text)
returns void language plpgsql as $$
begin
  execute format('drop policy if exists %I on public.%I', p_name, p_table);
  execute p_sql;
end $$;

-- staff: full access everywhere
do $$
declare t text;
begin
  foreach t in array array['campaign_myths','campaign_assets','campaign_voices','campaign_message_tests',
    'campaign_message_test_arms','campaign_links','campaign_link_clicks','campaign_events',
    'campaign_channel_metrics','campaign_partner_checkins','campaign_surges','campaign_quiz_items',
    'campaign_quiz_responses'] loop
    perform pg_temp.policy(t, 'staff_all',
      format('create policy staff_all on public.%I for all to authenticated
              using (public.campaign_is_staff()) with check (public.campaign_is_staff())', t));
  end loop;
end $$;

-- staff table: staff can see who else is staff; only admins (or SQL editor) change it
select pg_temp.policy('campaign_staff','staff_read',
  'create policy staff_read on public.campaign_staff for select to authenticated using (public.campaign_is_staff())');
select pg_temp.policy('campaign_staff','admin_write',
  $p$create policy admin_write on public.campaign_staff for all to authenticated
     using (exists (select 1 from public.campaign_staff s where s.user_id = auth.uid() and s.role = 'admin'))
     with check (exists (select 1 from public.campaign_staff s where s.user_id = auth.uid() and s.role = 'admin'))$p$);

-- public library: anyone reads released assets; test-cohort sees 'test' via signed-in hub accounts
select pg_temp.policy('campaign_assets','public_read',
  $p$create policy public_read on public.campaign_assets for select to anon, authenticated
     using (visibility = 'public' and audience_facing = 'public')$p$);
select pg_temp.policy('campaign_assets','members_read',
  $p$create policy members_read on public.campaign_assets for select to authenticated
     using (visibility in ('test','public'))$p$);
select pg_temp.policy('campaign_myths','public_read',
  'create policy public_read on public.campaign_myths for select to anon, authenticated using (true)');

-- voices: each influencer / partner sees their own row and own links
select pg_temp.policy('campaign_voices','own_read',
  'create policy own_read on public.campaign_voices for select to authenticated using (contact_user_id = auth.uid())');
select pg_temp.policy('campaign_links','own_read',
  'create policy own_read on public.campaign_links for select to authenticated using (voice_id in (select public.campaign_my_voice_ids()))');

-- self-reporting: influencers submit metrics, partners submit check-ins, for their own voice only
select pg_temp.policy('campaign_channel_metrics','own_insert',
  $p$create policy own_insert on public.campaign_channel_metrics for insert to authenticated
     with check (source in ('influencer_report','radio_report') and verified = false
                 and voice_id in (select public.campaign_my_voice_ids()))$p$);
select pg_temp.policy('campaign_channel_metrics','own_read',
  'create policy own_read on public.campaign_channel_metrics for select to authenticated using (voice_id in (select public.campaign_my_voice_ids()))');
select pg_temp.policy('campaign_partner_checkins','own_insert',
  $p$create policy own_insert on public.campaign_partner_checkins for insert to authenticated
     with check (voice_id in (select public.campaign_my_voice_ids()))$p$);
select pg_temp.policy('campaign_partner_checkins','own_read',
  'create policy own_read on public.campaign_partner_checkins for select to authenticated using (voice_id in (select public.campaign_my_voice_ids()))');

-- events, clicks, quiz responses: no direct public access at all.
-- Visitors write only through log_campaign_event() / submit_campaign_quiz(); clicks only via the /go function.

-- grants for the RPCs and public views
grant execute on function public.log_campaign_event(uuid,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.submit_campaign_quiz(uuid,text,jsonb,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.campaign_public_pulse() to anon, authenticated;
grant select on public.campaign_quiz_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 13. Storage buckets (skipped automatically outside Supabase)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('campaign-media','campaign-media', true)
      on conflict (id) do nothing;      -- toolkit PDFs, cards, audio cuts (approved, public files only)
    insert into storage.buckets (id, name, public) values ('campaign-reports','campaign-reports', false)
      on conflict (id) do nothing;      -- influencer analytics screenshots

    execute 'drop policy if exists campaign_media_staff_write on storage.objects';
    execute $p$create policy campaign_media_staff_write on storage.objects for all to authenticated
             using (bucket_id = 'campaign-media' and public.campaign_is_staff())
             with check (bucket_id = 'campaign-media' and public.campaign_is_staff())$p$;

    execute 'drop policy if exists campaign_reports_own_upload on storage.objects';
    execute $p$create policy campaign_reports_own_upload on storage.objects for insert to authenticated
             with check (bucket_id = 'campaign-reports' and (storage.foldername(name))[1] = auth.uid()::text)$p$;

    execute 'drop policy if exists campaign_reports_read on storage.objects';
    execute $p$create policy campaign_reports_read on storage.objects for select to authenticated
             using (bucket_id = 'campaign-reports'
                    and ((storage.foldername(name))[1] = auth.uid()::text or public.campaign_is_staff()))$p$;
  end if;
end $$;
