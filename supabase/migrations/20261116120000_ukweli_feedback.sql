-- UkweliSRHR in-app feedback ("Tell us what you think").
--
-- Young people can leave an optional 1–5 rating and three optional short
-- answers (what they liked / what was confusing / what's missing). Stored with
-- the same anonymous context as the usage counts: section they were on, app
-- language, device type, partner ref link, and county only if they shared it.
--
-- Writes go only through ukweli_feedback_submit() (validated, rate-limited);
-- only admins can read, mark as read, or delete.

create table if not exists public.ukweli_feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor    text,
  rating     smallint check (rating between 1 and 5),
  liked      text,
  confusing  text,
  missing    text,
  tab        text,
  lang       text,
  county     text,
  ref        text,
  device     text,
  status     text not null default 'new' check (status in ('new', 'read'))
);
create index if not exists ukweli_feedback_created_idx on public.ukweli_feedback (created_at);
alter table public.ukweli_feedback enable row level security;

drop policy if exists ukweli_feedback_admin_select on public.ukweli_feedback;
create policy ukweli_feedback_admin_select on public.ukweli_feedback for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
drop policy if exists ukweli_feedback_admin_update on public.ukweli_feedback;
create policy ukweli_feedback_admin_update on public.ukweli_feedback for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
drop policy if exists ukweli_feedback_admin_delete on public.ukweli_feedback;
create policy ukweli_feedback_admin_delete on public.ukweli_feedback for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
grant select, update, delete on public.ukweli_feedback to authenticated;

-- Returns 'ok', 'empty' (nothing filled in) or 'limit' (too many from this device today).
create or replace function public.ukweli_feedback_submit(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_visitor text := left(coalesce(p->>'visitor', ''), 40);
  v_rating  smallint;
  v_liked   text := nullif(left(trim(coalesce(p->>'liked', '')), 1000), '');
  v_conf    text := nullif(left(trim(coalesce(p->>'confusing', '')), 1000), '');
  v_miss    text := nullif(left(trim(coalesce(p->>'missing', '')), 1000), '');
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'empty'; end if;
  if (p->>'rating') ~ '^[1-5]$' then v_rating := (p->>'rating')::smallint; end if;
  if v_rating is null and v_liked is null and v_conf is null and v_miss is null then
    return 'empty';
  end if;
  -- at most 3 per device per day, and a hub-wide ceiling against scripted floods
  if length(v_visitor) >= 8 and (select count(*) from public.ukweli_feedback
        where visitor = v_visitor and created_at > now() - interval '1 day') >= 3 then
    return 'limit';
  end if;
  if (select count(*) from public.ukweli_feedback where created_at > now() - interval '1 day') >= 1000 then
    return 'limit';
  end if;
  insert into public.ukweli_feedback (visitor, rating, liked, confusing, missing, tab, lang, county, ref, device)
  values (
    nullif(v_visitor, ''), v_rating, v_liked, v_conf, v_miss,
    left(p->>'tab', 20), left(p->>'lang', 8), left(p->>'county', 40),
    nullif(lower(left(regexp_replace(coalesce(p->>'ref', ''), '[^a-zA-Z0-9_-]', '', 'g'), 40)), ''),
    left(p->>'device', 10)
  );
  return 'ok';
end;
$fn$;
revoke all on function public.ukweli_feedback_submit(jsonb) from public;
grant execute on function public.ukweli_feedback_submit(jsonb) to anon, authenticated;
