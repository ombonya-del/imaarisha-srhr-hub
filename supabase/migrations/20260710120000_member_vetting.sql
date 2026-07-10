-- Vetted membership gate.
--
-- The hub now requires sign-in, and new sign-ups are PENDING until an admin
-- approves them (the front-end shows a "membership under review" screen and RLS
-- will enforce it). Every EXISTING member is grandfathered as approved so the
-- gate doesn't lock out current members.
--
-- APPLY THIS BEFORE deploying the new hub2 build — otherwise existing members
-- have no `approved` column, read as not-approved, and get the pending screen.

alter table public.profiles add column if not exists approved boolean not null default false;
alter table public.profiles add column if not exists reason   text;

-- Grandfather everyone already in the hub.
update public.profiles set approved = true where approved is distinct from true;
