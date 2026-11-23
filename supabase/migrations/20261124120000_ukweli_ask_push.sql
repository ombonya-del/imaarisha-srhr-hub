-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — notify an anonymous asker when their Uliza question is answered.
--
-- No account and no personal data. A question is owned by a random code the
-- asker keeps; the DB only ever sees its SHA-256 hash (ticket_hash). This adds
-- an opt-in phone/web-push subscription keyed to that same hash, and fires a
-- privacy-safe nudge ("your answer is ready") when the question flips to
-- answered. The push carries no question text and no code — the asker opens
-- "My questions" on their own device to read the answer.
--
-- Safe to re-run. Run in the Supabase SQL editor (or `supabase db push`).
-- Needs pg_net (for the trigger) and pgcrypto (already enabled by the
-- 2026-10-02 youth-feedback migration). Deploy the `notify-asker` edge
-- function and set ASK_PUSH_WEBHOOK_SECRET before the trigger will do anything.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;

create table if not exists public.ukweli_ask_push (
  id          uuid primary key default gen_random_uuid(),
  ticket_hash text not null,                 -- sha256(code), matches uliza_questions.ticket_hash
  endpoint    text unique not null,          -- the browser's own web-push endpoint
  p256dh      text not null,
  auth        text not null,
  lang        text default 'en',
  created_at  timestamptz not null default now(),
  notified_at timestamptz
);
create index if not exists ukweli_ask_push_hash_idx on public.ukweli_ask_push (ticket_hash);
alter table public.ukweli_ask_push enable row level security;

-- No anon read/update/delete. The edge function reads it with the service role;
-- admins may inspect it. Writes go only through ukweli_ask_subscribe().
drop policy if exists ukweli_ask_push_admin_read on public.ukweli_ask_push;
create policy ukweli_ask_push_admin_read on public.ukweli_ask_push for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ── Opt in: store a push subscription against a question you hold ────────────
-- The client sends the hash (computed on-device, exactly like turnstile-verify),
-- never the plaintext code. Returns 'ok', 'badticket' or 'limit'.
create or replace function public.ukweli_ask_subscribe(p jsonb)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  v_hash text := lower(coalesce(p->>'ticket_hash',''));
  v_ep   text := left(coalesce(p->>'endpoint',''), 600);
begin
  if v_hash !~ '^[0-9a-f]{64}$' or v_ep = ''
     or (p->>'p256dh') is null or (p->>'auth') is null then
    return 'badticket';
  end if;
  -- the hash must match a real question
  if not exists (select 1 from public.uliza_questions where ticket_hash = v_hash) then
    return 'badticket';
  end if;
  -- ceiling against scripted floods
  if (select count(*) from public.ukweli_ask_push where created_at > now() - interval '1 day') >= 5000 then
    return 'limit';
  end if;
  insert into public.ukweli_ask_push (ticket_hash, endpoint, p256dh, auth, lang)
  values (v_hash, v_ep, left(p->>'p256dh',120), left(p->>'auth',60), left(coalesce(p->>'lang','en'),8))
  on conflict (endpoint) do update
    set ticket_hash = excluded.ticket_hash, p256dh = excluded.p256dh,
        auth = excluded.auth, lang = excluded.lang, notified_at = null;
  return 'ok';
end;
$fn$;
revoke all on function public.ukweli_ask_subscribe(jsonb) from public;
grant execute on function public.ukweli_ask_subscribe(jsonb) to anon, authenticated;

-- ── Fire a nudge when a question is answered ────────────────────────────────
-- Mirrors public.notify_activity(): posts to an edge function with a shared
-- secret. Only fires on the pending→answered transition, and only when someone
-- actually asked to be notified. A failed post never blocks the answer.
create or replace function public.ukweli_notify_asker()
returns trigger language plpgsql security definer set search_path = public, extensions as $fn$
begin
  if NEW.status = 'answered' and coalesce(OLD.status,'') <> 'answered'
     and NEW.ticket_hash is not null
     and exists (select 1 from public.ukweli_ask_push
                   where ticket_hash = NEW.ticket_hash and notified_at is null) then
    perform net.http_post(
      url     := 'https://uwxtqyqyrhhxqagaqelg.supabase.co/functions/v1/notify-asker',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-webhook-secret', 'REPLACE_WITH_YOUR_ASK_PUSH_WEBHOOK_SECRET'
                 ),
      body    := jsonb_build_object('ticket_hash', NEW.ticket_hash)
    );
  end if;
  return NEW;
exception when others then
  return NEW;
end;
$fn$;

drop trigger if exists trg_ukweli_notify_asker on public.uliza_questions;
create trigger trg_ukweli_notify_asker after update on public.uliza_questions
  for each row execute function public.ukweli_notify_asker();
