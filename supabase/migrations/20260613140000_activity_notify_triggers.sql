-- ════════════════════════════════════════════════════════════════════════════
-- Activity email alerts — DB triggers (alternative to the Webhooks UI)
-- Calls the `activity-notify` edge function via pg_net whenever a row is inserted
-- into activity_log / fika_reviews / fika_suggestions. The function formats and
-- sends the email (to imaarishasrhr@gmail.com).
--
-- ▶ BEFORE RUNNING: replace REPLACE_WITH_YOUR_WEBHOOK_SECRET below with the same
--   value you set as the function's WEBHOOK_SECRET secret.
--   (If you did NOT set WEBHOOK_SECRET on the function, you can leave the header
--    out — but keeping a secret is recommended since the endpoint has no JWT.)
-- Run this in the Supabase SQL editor. The edge function must be deployed first.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;

create or replace function public.notify_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://uwxtqyqyrhhxqagaqelg.supabase.co/functions/v1/activity-notify',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', 'REPLACE_WITH_YOUR_WEBHOOK_SECRET'
               ),
    body    := jsonb_build_object(
                 'type',   'INSERT',
                 'table',  TG_TABLE_NAME,
                 'schema', TG_TABLE_SCHEMA,
                 'record', to_jsonb(NEW)
               )
  );
  return NEW;
exception when others then
  -- never let a failed notification block the actual insert
  return NEW;
end;
$$;

-- One trigger per source table
drop trigger if exists trg_notify_activity_log  on public.activity_log;
create trigger trg_notify_activity_log  after insert on public.activity_log
  for each row execute function public.notify_activity();

drop trigger if exists trg_notify_fika_reviews on public.fika_reviews;
create trigger trg_notify_fika_reviews after insert on public.fika_reviews
  for each row execute function public.notify_activity();

drop trigger if exists trg_notify_fika_suggestions on public.fika_suggestions;
create trigger trg_notify_fika_suggestions after insert on public.fika_suggestions
  for each row execute function public.notify_activity();

-- Optional — uncomment to also alert on new anonymous youth questions:
-- drop trigger if exists trg_notify_uliza on public.uliza_questions;
-- create trigger trg_notify_uliza after insert on public.uliza_questions
--   for each row execute function public.notify_activity();
