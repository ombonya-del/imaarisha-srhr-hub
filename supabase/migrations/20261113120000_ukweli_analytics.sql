-- UkweliSRHR anonymous usage analytics.
--
-- The app sends small events (visit / view / open / ask / share / fika_* /
-- county) through ukweli_track(). Nothing personal is stored: a random visitor
-- code that changes monthly, a per-tab session code, the section used, app
-- language, device type, the partner ref link, and a county only if the user
-- chose one. The table has RLS on and no policies, so it can't be read or
-- written directly; admins read it only through ukweli_report().

create table if not exists public.ukweli_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor    text not null,
  session    text,
  event      text not null,
  tab        text,
  item       text,
  lang       text,
  county     text,
  ref        text,
  device     text
);
create index if not exists ukweli_events_created_idx on public.ukweli_events (created_at);
alter table public.ukweli_events enable row level security;

-- ── Write path (anonymous) ──────────────────────────────────────────────────
create or replace function public.ukweli_track(events jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare e jsonb; r text;
begin
  if events is null or jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 50 then
    return;
  end if;
  for e in select value from jsonb_array_elements(events) loop
    continue when jsonb_typeof(e) <> 'object';
    continue when coalesce(e->>'event', '') not in
      ('visit', 'view', 'open', 'ask', 'share', 'fika_review', 'fika_suggest', 'county');
    continue when length(coalesce(e->>'visitor', '')) not between 8 and 40;
    r := nullif(lower(left(regexp_replace(coalesce(e->>'ref', ''), '[^a-zA-Z0-9_-]', '', 'g'), 40)), '');
    insert into public.ukweli_events (visitor, session, event, tab, item, lang, county, ref, device)
    values (
      left(e->>'visitor', 40),
      left(e->>'session', 40),
      e->>'event',
      left(e->>'tab', 20),
      left(e->>'item', 80),
      left(e->>'lang', 8),
      left(e->>'county', 40),
      r,
      left(e->>'device', 10)
    );
  end loop;
end;
$fn$;
revoke all on function public.ukweli_track(jsonb) from public;
grant execute on function public.ukweli_track(jsonb) to anon, authenticated;

-- ── Read path (admins only): one JSON report for a date range ───────────────
create or replace function public.ukweli_report(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  t0 timestamptz := p_from::timestamptz;
  t1 timestamptz := (p_to + 1)::timestamptz;
  result jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Admins only';
  end if;

  with ev as (
    select * from public.ukweli_events where created_at >= t0 and created_at < t1
  ),
  -- one row per visitor: their county (if ever given), partner link, language, device
  vis as (
    select visitor,
           max(county) filter (where county is not null) as county,
           max(ref)    filter (where ref is not null)    as ref,
           mode() within group (order by lang)            as lang,
           mode() within group (order by device)          as device
      from ev group by visitor
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to),
    'totals', jsonb_build_object(
      'visitors',      (select count(distinct visitor) from ev),
      'sessions',      (select count(distinct session) from ev),
      'section_views', (select count(*) from ev where event = 'view'),
      'items_opened',  (select count(*) from ev where event = 'open'),
      'questions',     (select count(*) from public.uliza_questions where created_at >= t0 and created_at < t1),
      'fika_reviews',  (select count(*) from public.fika_reviews where created_at >= t0 and created_at < t1),
      'shares',        (select count(*) from public.ukweli_submissions where created_at >= t0 and created_at < t1),
      'county_given',  (select count(*) from vis where county is not null)
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d, 'visitors', v, 'sessions', s) order by d)
        from (select created_at::date d, count(distinct visitor) v, count(distinct session) s
                from ev group by 1) x), '[]'::jsonb),
    'counties', coalesce((
      select jsonb_agg(jsonb_build_object('county', c, 'visitors', n) order by n desc, c)
        from (select coalesce(county, 'Not given') c, count(*) n from vis group by 1) x), '[]'::jsonb),
    'partners', coalesce((
      select jsonb_agg(jsonb_build_object('ref', ref, 'partner', partner, 'visitors', n) order by n desc)
        from (select coalesce(v.ref, '(direct)') ref,
                     coalesce(o.short_name, o.name, case when v.ref is null then 'No partner link' else v.ref end) partner,
                     count(*) n
                from vis v left join public.organizations o on o.slug = v.ref
               group by 1, 2) x), '[]'::jsonb),
    'languages', coalesce((
      select jsonb_agg(jsonb_build_object('lang', l, 'visitors', n) order by n desc)
        from (select coalesce(lang, '?') l, count(*) n from vis group by 1) x), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', d, 'visitors', n) order by n desc)
        from (select coalesce(device, '?') d, count(*) n from vis group by 1) x), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object('tab', tab, 'views', v, 'visitors', u) order by v desc)
        from (select tab, count(*) v, count(distinct visitor) u
                from ev where event = 'view' and tab is not null group by 1) x), '[]'::jsonb),
    'top_items', coalesce((
      select jsonb_agg(jsonb_build_object('tab', tab, 'item', label, 'opens', n, 'visitors', u) order by n desc)
        from (select e.tab,
                     coalesce(c.claim, r.title, e.item) as label,
                     count(*) n, count(distinct e.visitor) u
                from ev e
                left join public.ukweli_cards c on e.tab = 'myths'   and c.id::text = e.item
                left join public.radar_items  r on e.tab = 'disinfo' and r.id::text = e.item
               where e.event = 'open' and e.tab in ('myths', 'disinfo', 'learn', 'fika')
               group by 1, 2
               order by n desc
               limit 40) x), '[]'::jsonb),
    'question_topics', coalesce((
      select jsonb_agg(jsonb_build_object('category', c, 'questions', n) order by n desc)
        from (select coalesce(nullif(trim(category), ''), 'Not yet categorised') c, count(*) n
                from public.uliza_questions where created_at >= t0 and created_at < t1 group by 1) x), '[]'::jsonb),
    'fika_by_county', coalesce((
      select jsonb_agg(jsonb_build_object('county', county, 'reviews', n) order by n desc)
        from (select f.county, count(*) n
                from public.fika_reviews rv join public.fika_facilities f on f.id = rv.facility_id
               where rv.created_at >= t0 and rv.created_at < t1 group by 1) x), '[]'::jsonb)
  ) into result;

  return result;
end;
$fn$;
revoke all on function public.ukweli_report(date, date) from public;
grant execute on function public.ukweli_report(date, date) to authenticated;
