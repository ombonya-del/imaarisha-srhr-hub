# Activity email alerts

Emails the Imaarisha team whenever new activity is logged on the hub (new
discussion, resource, campaign, tracker submission, etc.). Recipient defaults to
**imaarishasrhr@gmail.com**.

It works by: every meaningful action already writes a row to `public.activity_log`
→ a Supabase **Database Webhook** fires on INSERT → calls the `activity-notify`
edge function → which sends the email via [Resend](https://resend.com).

## One-time setup

### 1. Get a Resend API key
Create a free account at resend.com → API Keys → create one (`re_...`).
For real sending from your own domain, add & verify `imaarishasrhr.org` in Resend
and set `ALERT_FROM` accordingly. Until then the function falls back to
`onboarding@resend.dev`, which Resend allows for testing.

### 2. Set the function secrets
```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxxxxx \
  ALERT_TO=imaarishasrhr@gmail.com \
  ALERT_FROM="Imaarisha Hub <onboarding@resend.dev>" \
  HUB_URL=https://hub.imaarishasrhr.org \
  WEBHOOK_SECRET=choose-a-long-random-string
```

### 3. Deploy the function
```bash
supabase functions deploy activity-notify --no-verify-jwt
```
The URL will be:
`https://uwxtqyqyrhhxqagaqelg.functions.supabase.co/activity-notify`

### 4. Create the Database Webhook
Supabase Dashboard → **Database → Webhooks → Create a new hook**
- Table: `public.activity_log`
- Events: **Insert**
- Type: **HTTP Request**, method **POST**
- URL: the function URL above
- HTTP Header: `x-webhook-secret` = the same `WEBHOOK_SECRET` you set above

Save. From now on, every new activity row emails the team.

## Test
Insert a test row in the SQL editor:
```sql
insert into public.activity_log (activity_type, description, dot_color)
values ('test', 'Email alert test from the SQL editor', 'gold');
```
You should receive an email within a few seconds. (Check the function logs in the
dashboard if not — most issues are an unset `RESEND_API_KEY` or an unverified
`ALERT_FROM` domain.)

## Turning it off
Disable or delete the webhook in Database → Webhooks. The function can stay deployed.
