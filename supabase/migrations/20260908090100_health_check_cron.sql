-- ImaarishaSRHR health-check — every 6h, alert-only email to imaarishasrhr@gmail.com
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin if exists (select 1 from cron.job where jobname='health-check-6h') then perform cron.unschedule('health-check-6h'); end if; end $$;
select cron.schedule('health-check-6h', '0 */6 * * *', $$
  select net.http_post(
    url     := 'https://uwxtqyqyrhhxqagaqelg.supabase.co/functions/v1/health-check',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eHRxeXF5cmhoeHFhZ2FxZWxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTA3MTUsImV4cCI6MjA4OTIyNjcxNX0.dLa7RY6awZC4HXnyUtoIXPZ8KJV0EEpPQR8YdOQ3hdA'),
    body    := '{}'::jsonb);
$$);
