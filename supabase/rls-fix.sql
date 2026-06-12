-- ════════════════════════════════════════════════════════════════════════════
-- RLS FIX — based on the audit of 11 Jun 2026
-- Run in: Imaarisha project (uwxtqyqyrhhxqagaqelg) → SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- 1. CRITICAL: RLS was disabled on these two tables (policies were being ignored)
alter table public.organizations     enable row level security;
alter table public.tracker_indicators enable row level security;

-- 2. Server-side admin flag (replaces the client-side email check)
alter table public.profiles add column if not exists is_admin boolean default false;
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'ombonya@gmail.com');
-- ^ verify this says "1 row updated". If 0 rows: your profile row's id may not match
-- your auth user id — run:  select id from auth.users where email = 'ombonya@gmail.com';
-- then: select * from public.profiles limit 5;  and tell me what columns you see.

create or replace function public.is_admin() returns boolean
language sql stable security definer as
$$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

-- 3. Tighten destructive policies: currently ANY signed-up user can delete/update
--    anything. Replace with admin-only (matches how the hub UI actually works).
do $$
declare
  tbl text;
begin
  foreach tbl in array array['discussions','discussion_replies','events','resources',
    'marketplace_listings','campaigns','campaign_toolkit','disinformation_claims']
  loop
    execute format('drop policy if exists "Auth delete %s" on public.%I',
      case tbl when 'marketplace_listings' then 'marketplace'
               when 'disinformation_claims' then 'disinfo'
               when 'discussion_replies' then 'replies'
               when 'campaign_toolkit' then 'toolkit'
               else tbl end, tbl);
    execute format('drop policy if exists "Auth update %s" on public.%I',
      case tbl when 'marketplace_listings' then 'marketplace'
               when 'disinformation_claims' then 'disinfo'
               when 'discussion_replies' then 'replies'
               else tbl end, tbl);
    execute format('create policy "admin_delete_%s" on public.%I for delete using (public.is_admin())', tbl, tbl);
    execute format('create policy "admin_update_%s" on public.%I for update using (public.is_admin())', tbl, tbl);
  end loop;
end $$;

-- organizations update was "Auth update organizations" — admin-gate it too
drop policy if exists "Auth update organizations" on public.organizations;
create policy "admin_update_organizations" on public.organizations for update using (public.is_admin());

-- 4. Re-run the audit (rls-audit.sql section 1) — every table should now show
--    rls_enabled = true, and no bare "Auth delete/update" policies remain.
