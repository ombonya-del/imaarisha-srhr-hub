-- Partner Match & Notify
-- Adds the fields the Exchange/Events previews and the partner match+notify flow
-- need, plus a notifications log. All columns are additive & nullable, so the
-- front-end keeps working before this runs (it inserts new fields defensively).

-- ── Opportunities: richer preview (funder already = org) ─────────────────────
alter table public.opportunities add column if not exists amount      text;      -- e.g. "KES 3.2M / 12 mo" or "$50,000"
alter table public.opportunities add column if not exists eligibility text;      -- "Who can apply"
alter table public.opportunities add column if not exists focus_tags  text[];    -- relevance tags (e.g. {contraception,youth,gbv})

-- ── Resources: relevance tags for matching (source_org already exists) ───────
alter table public.resources add column if not exists focus_tags text[];

-- ── Events: relevance tags for matching ─────────────────────────────────────
alter table public.events add column if not exists focus_tags text[];

-- ── Organizations (partners): contact + notify preferences ──────────────────
alter table public.organizations add column if not exists contact_email text;
alter table public.organizations add column if not exists notify_opt_in boolean not null default true;
alter table public.organizations add column if not exists focus_tags    text[];   -- optional extra tags beyond focus_area

-- ── Notification log — who was notified about what, on which channel ─────────
create table if not exists public.partner_notifications (
  id           uuid primary key default gen_random_uuid(),
  item_type    text not null,          -- opportunity | resource | event
  item_id      uuid,
  item_title   text,
  org_id       uuid references public.organizations(id) on delete set null,
  org_name     text,
  channel      text not null,          -- email | push
  status       text not null default 'sent',   -- sent | failed | skipped
  detail       text,
  sent_by      uuid references auth.users(id),
  created_at   timestamptz default now()
);

alter table public.partner_notifications enable row level security;

drop policy if exists pn_admin_all on public.partner_notifications;
create policy pn_admin_all on public.partner_notifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists partner_notifications_item_idx on public.partner_notifications(item_type, item_id);
