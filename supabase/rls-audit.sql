-- ════════════════════════════════════════════════════════════════════════════
-- IMAARISHA SRHR HUB — RLS AUDIT
-- Why: the hub's admin check (_isAdmin) is client-side JavaScript. Anyone can
-- flip it in DevTools. The ONLY real protection for your data is row-level
-- security in this database. Run section 1 to see where you stand.
-- Run in: Supabase Dashboard → SQL Editor (project uwxtqyqyrhhxqagaqelg)
-- ════════════════════════════════════════════════════════════════════════════

-- 1. AUDIT — run this first. Every app table should show rowsecurity = true
--    and at least one policy. Tables with rowsecurity = false are wide open.
select t.tablename,
       t.rowsecurity as rls_enabled,
       count(p.policyname) as policy_count,
       coalesce(string_agg(p.policyname || ' (' || p.cmd || ')', ', '), '— NONE —') as policies
from pg_tables t
left join pg_policies p on p.tablename = t.tablename and p.schemaname = 'public'
where t.schemaname = 'public'
  and t.tablename in ('discussions','discussion_replies','events','event_rsvps',
    'resources','organizations','profiles','marketplace_listings','activity_log',
    'disinformation_claims','tracker_indicators','tracker_submissions',
    'campaigns','campaign_toolkit')
group by t.tablename, t.rowsecurity
order by t.rowsecurity, t.tablename;

-- 2. WHAT GOOD LOOKS LIKE (apply per table after reviewing the audit)
--    Principles:
--    • SELECT: open (it's a community hub) — except profiles/activity_log if sensitive
--    • INSERT: authenticated users only, and only as themselves
--    • UPDATE/DELETE: row owner or admin — NEVER anon-wide
--    • Admin = a profiles.is_admin flag checked in the policy, not an email in JS

-- Example: lock down discussions properly
-- alter table public.discussions enable row level security;
-- drop policy if exists "disc_read"   on public.discussions;
-- drop policy if exists "disc_insert" on public.discussions;
-- drop policy if exists "disc_update" on public.discussions;
-- drop policy if exists "disc_delete" on public.discussions;
-- create policy "disc_read"   on public.discussions for select using (true);
-- create policy "disc_insert" on public.discussions for insert
--   with check (auth.uid() is not null and author_id = auth.uid());
-- create policy "disc_update" on public.discussions for update
--   using (author_id = auth.uid() or public.is_admin());
-- create policy "disc_delete" on public.discussions for delete
--   using (author_id = auth.uid() or public.is_admin());

-- 3. SERVER-SIDE ADMIN FLAG (replaces the client-side email check)
-- alter table public.profiles add column if not exists is_admin boolean default false;
-- update public.profiles set is_admin = true where email = 'ombonya@gmail.com';
-- create or replace function public.is_admin() returns boolean
-- language sql stable security definer as $$
--   select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
-- $$;

-- 4. QUICK SMOKE TEST (run as anon from any browser console on the live site):
--    await sb.from('discussions').delete().neq('id','00000000-0000-0000-0000-000000000000')
--    If that succeeds, anyone on the internet can wipe your forum. Fix before launch.
