-- Structured Amount + Eligibility for opportunities, to match the Mazingira
-- opportunity preview card exactly. Both nullable text: admins fill/edit them on
-- the review card, and the card shows them as their own labelled rows. When empty,
-- the hub falls back to values derived from the opportunity text.
-- RLS is unchanged — the existing opp_admin_write policy already covers all columns.

alter table public.opportunities add column if not exists amount      text;
alter table public.opportunities add column if not exists eligibility text;
