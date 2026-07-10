-- RLS enforcement for vetted membership.
--
-- is_approved() returns true for admins and approved members. We then add a
-- RESTRICTIVE read policy on the hub's member tables: restrictive policies are
-- AND-ed with existing policies, so this ONLY narrows access to approved members
-- for authenticated users — it can't broaden anything or touch write/ownership
-- rules, so it's safe to apply blindly. It takes effect on tables where RLS is
-- already enabled; a follow-up will enable RLS on any that are still open (that
-- needs the current per-table state, so it's handled separately).
--
-- Note: this targets the `authenticated` role only, so it does NOT affect the
-- anon-facing Ukweli youth PWA (uliza/fika/ukweli_cards read by anon).

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (approved = true or is_admin = true)
  )
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'unado_posts','discussions','discussion_replies','resources','events','event_rsvps',
    'radar_items','radar_index','tracker_indicators','tracker_submissions',
    'disinformation_claims','marketplace_listings','organizations','activity_log'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('drop policy if exists require_approved_read on public.%I', t);
      execute format(
        'create policy require_approved_read on public.%I as restrictive '
        'for select to authenticated using (public.is_approved())', t);
    end if;
  end loop;
end $$;
