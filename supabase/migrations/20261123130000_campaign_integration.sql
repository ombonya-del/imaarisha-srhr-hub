-- ============================================================================
-- ImaarishaSRHR campaign — fit the campaign layer to the existing hub
-- Run after the three 20261123120x files.
--
-- 1. Hub admins (profiles.is_admin) are campaign staff and reviewers.
-- 2. Myth typologies use the Radar's own vocabulary.
-- 3. Share of voice reads the Radar's existing sentiment / positive_share,
--    instead of a new stance label (those unused columns are removed).
-- 4. Partner voices link to the organisations directory; their code = org slug,
--    the same ?ref= value UkweliSRHR already records.
-- 5. Members see partner-facing campaign assets; anyone can read public ones.
-- ============================================================================

-- 1. Admins ------------------------------------------------------------------
create or replace function public.campaign_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
      or exists (select 1 from public.campaign_staff where user_id = auth.uid());
$$;

create or replace function public.campaign_is_reviewer()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
      or exists (select 1 from public.campaign_staff
                 where user_id = auth.uid() and role in ('admin','reviewer'));
$$;

-- 2. Radar typologies ----------------------------------------------------------
alter table public.campaign_myths drop constraint if exists campaign_myths_typology_check;
update public.campaign_myths set typology = 'contraceptive_myth' where typology = 'contraceptive_safety';
update public.campaign_myths set typology = 'faith_healing'      where typology = 'hiv_faith_healing';
alter table public.campaign_myths add constraint campaign_myths_typology_check
  check (typology in ('contraceptive_myth','fertility_abortion','anti_cse','faith_healing','other'));

-- 3. Share of voice from the Radar's own numbers -----------------------------
drop view if exists public.campaign_kpi_share_of_voice;
alter table public.radar_items drop column if exists campaign_stance;
alter table public.radar_items drop column if exists campaign_myth_slug;
alter table public.radar_items drop column if exists campaign_keyword_match;

create or replace view public.campaign_kpi_share_of_voice with (security_invoker = true) as
with items as (
  select date_trunc('month', coalesce(published_at, scanned_at))::date as month,
         sentiment, is_disinfo
  from public.radar_items
  where coalesce(srhr_relevance, 0) >= 5
),
idx as (
  select date_trunc('month', date)::date as month,
         round(avg(positive_share)::numeric, 1) as radar_index_positive_share
  from public.radar_index group by 1
)
select coalesce(i.month, x.month) as month,
       count(*) filter (where i.sentiment is not null)                  as srhr_items,
       count(*) filter (where i.sentiment = 'positive')                 as positive_items,
       count(*) filter (where i.is_disinfo)                             as disinfo_items,
       round(100.0 * count(*) filter (where i.sentiment = 'positive')
             / nullif(count(*) filter (where i.sentiment is not null), 0), 1) as pct_positive,
       max(x.radar_index_positive_share)                                as radar_index_positive_share,
       3.6 as baseline_pct, 8.0 as target_pct
from items i
full join idx x on x.month = i.month
group by 1 order by 1;

-- Radar data is public-read, so the share-of-voice view can be shown to members too
grant select on public.campaign_kpi_share_of_voice to authenticated;

-- 4. Voices ↔ organisations ------------------------------------------------------
alter table public.campaign_voices
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
create unique index if not exists campaign_voices_org_uidx
  on public.campaign_voices(organization_id) where organization_id is not null;

-- Allow hyphen/underscore slugs as in organizations.slug
alter table public.campaign_voices drop constraint if exists campaign_voices_code_check;
alter table public.campaign_voices add constraint campaign_voices_code_check
  check (code ~ '^[a-z0-9][a-z0-9_-]{1,59}$');

-- Event attribution accepts the same characters Ukweli uses for ?ref=
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
          case when lower(p_via) ~ '^[a-z0-9_-]{2,64}$' then lower(p_via) end,
          left(p_share_target, 20),
          left(p_path, 200));
exception when check_violation then
  return;
end $$;

-- 5. Members (approved hub accounts) see the partner Campaign Kit --------------
drop policy if exists members_read on public.campaign_assets;
create policy members_read on public.campaign_assets for select to authenticated
  using (visibility in ('test','public'));

-- Partner organisations: create a voice for every approved directory org that
-- doesn't have one yet (code = slug). Staff assign the hub login later.
insert into public.campaign_voices (code, display_name, voice_type, organization_id, onboarding_stage)
select lower(o.slug), coalesce(o.short_name, o.name), 'partner_org', o.id, 'identified'
from public.organizations o
where o.approved and o.slug is not null
  and lower(o.slug) ~ '^[a-z0-9][a-z0-9_-]{1,59}$'
  and not exists (select 1 from public.campaign_voices v where v.organization_id = o.id or v.code = lower(o.slug));

-- Staff list for the admin UI (names only, for assigning hub logins to voices)
create or replace function public.campaign_member_directory()
returns table (id uuid, full_name text, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, u.email::text
  from public.profiles p join auth.users u on u.id = p.id
  where public.campaign_is_staff()
  order by p.full_name nulls last;
$$;
grant execute on function public.campaign_member_directory() to authenticated;

alter table public.campaign_links drop constraint if exists campaign_links_code_check;
alter table public.campaign_links add constraint campaign_links_code_check
  check (code ~ '^[a-z0-9][a-z0-9_-]{1,63}$');

-- Partners can correct this month's check-in
drop policy if exists own_update on public.campaign_partner_checkins;
create policy own_update on public.campaign_partner_checkins for update to authenticated
  using (voice_id in (select public.campaign_my_voice_ids()))
  with check (voice_id in (select public.campaign_my_voice_ids()));
