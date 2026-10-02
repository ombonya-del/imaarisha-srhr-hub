-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — youth test-run feedback (Oct 2026)
--   1. Private answer retrieval: each question gets a private code. Only a
--      SHA-256 hash of it is stored (the code itself never reaches the DB), and
--      `uliza_lookup()` returns a question's status/answer to whoever holds it.
--   2. "Just for me" questions: keep_private rows are never in the public feed.
--   3. Email alert on every new Uliza question (reuses notify_activity()).
--   4. Facility cost / hours / contact / age fields for Hebu Fika.
-- Safe to re-run. Run in the Supabase SQL editor (or `supabase db push`).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ── 1 & 2. Uliza: private code + private-answer option ──────────────────────
alter table public.uliza_questions add column if not exists ticket_hash  text;
alter table public.uliza_questions add column if not exists keep_private boolean not null default false;
create index if not exists uliza_ticket_idx on public.uliza_questions (ticket_hash) where ticket_hash is not null;

-- Public feed: answered AND shared. Private answers are only reachable by code.
drop policy if exists uliza_read on public.uliza_questions;
create policy uliza_read on public.uliza_questions
  for select using (status = 'answered' and keep_private = false);

-- Look up one or more of *your own* questions by their private codes.
-- Returns nothing for unknown codes; never exposes other rows or the hash.
create or replace function public.uliza_lookup(codes text[])
returns table (code text, question text, status text, answer text,
               answered_by text, answered_at timestamptz, created_at timestamptz, keep_private boolean)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.code, q.question,
         case when q.status = 'answered' then 'answered'
              when q.status = 'hidden'   then 'closed'
              else 'pending' end,
         case when q.status = 'answered' then q.answer end,
         case when q.status = 'answered' then q.answered_by end,
         case when q.status = 'answered' then q.answered_at end,
         q.created_at, q.keep_private
  from (select distinct upper(regexp_replace(x, '[^A-Za-z0-9]', '', 'g')) as code
          from unnest(codes[1:20]) as x) c
  join public.uliza_questions q
    on q.ticket_hash = encode(extensions.digest(c.code, 'sha256'), 'hex')
  where length(c.code) >= 10;
$$;
revoke all on function public.uliza_lookup(text[]) from public;
grant execute on function public.uliza_lookup(text[]) to anon, authenticated;

-- ── 3. Email the team on every new question ─────────────────────────────────
-- Uses public.notify_activity() from 20260613140000_activity_notify_triggers.sql
-- (which holds the webhook secret). If that function doesn't exist yet, run that
-- migration first.
drop trigger if exists trg_notify_uliza on public.uliza_questions;
create trigger trg_notify_uliza after insert on public.uliza_questions
  for each row execute function public.notify_activity();

-- ── 4. Hebu Fika: what it costs, when it's open, how to reach them ──────────
alter table public.fika_facilities add column if not exists cost_level    text;   -- free | subsidised | paid | varies
alter table public.fika_facilities add column if not exists cost_note     text;   -- e.g. "FP free; consultation KES 200"
alter table public.fika_facilities add column if not exists hours         text;   -- e.g. "Mon–Fri 8am–5pm; youth corner Sat 9–1"
alter table public.fika_facilities add column if not exists phone         text;
alter table public.fika_facilities add column if not exists age_note      text;   -- e.g. "Youth corner: 10–24 yrs"
alter table public.fika_facilities add column if not exists last_verified date;
do $$ begin
  alter table public.fika_facilities add constraint fika_cost_level_chk
    check (cost_level is null or cost_level in ('free','subsidised','paid','varies'));
exception when duplicate_object then null; end $$;
