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

### 4. Create the Database Webhook(s)
Supabase Dashboard → **Database → Webhooks → Create a new hook**. For each table
below, create one hook (all identical except the table):
- Table: `public.activity_log` — general hub activity
- Table: `public.fika_reviews` — new Hebu Fika facility reviews
- Table: `public.fika_suggestions` — new suggested services
- *(optional)* Table: `public.uliza_questions` — new anonymous youth questions

For every hook use:
- Events: **Insert**
- Type: **HTTP Request**, method **POST**
- URL: the function URL above
- HTTP Header: `x-webhook-secret` = the same `WEBHOOK_SECRET` you set above

The one function formats a fitting email per table, so all hooks point at it.
Save. From now on, each new row emails the team.

## Test
Insert a test row in the SQL editor:
```sql
insert into public.activity_log (activity_type, description, dot_color)
values ('test', 'Email alert test from the SQL editor', 'gold');
```
You should receive an email within a few seconds. (Check the function logs in the
dashboard if not — most issues are an unset `RESEND_API_KEY` or an unverified
`ALERT_FROM` domain.)

## Verifying your domain in Resend (so mail is from imaarishasrhr.org)

Until this is done, the function sends from Resend's shared test address
(`onboarding@resend.dev`), which works but looks generic and can land in spam.
To send from your own domain:

1. **Resend → Domains → Add Domain** → enter `imaarishasrhr.org` → choose a region
   (e.g. `us-east-1`). Resend shows a list of DNS records to add — usually:
   - an **MX** record on a `send` subdomain → `feedback-smtp.<region>.amazonses.com` (priority 10)
   - an **SPF** TXT record on `send` → `v=spf1 include:amazonses.com ~all`
   - a **DKIM** record named `resend._domainkey` (a TXT, or CNAME) with a long key value
   - *(recommended)* a **DMARC** TXT on `_dmarc` → `v=DMARC1; p=none;`

   Copy the exact records Resend displays — the host/value strings are generated per domain.

2. **Namecheap → Domain List → imaarishasrhr.org → Manage → Advanced DNS → Add New Record.**
   Add each record from step 1. Notes for Namecheap:
   - For Host, enter just the subdomain part (e.g. `send`, `resend._domainkey`, `_dmarc`) —
     Namecheap appends `.imaarishasrhr.org` automatically. Use `@` for the root.
   - For the MX record, choose type **MX Record** and put the priority in its own field.
   - Strip any trailing dot Resend shows on values; set TTL to **Automatic**.

3. Back in **Resend → Domains**, click **Verify**. DNS propagation is usually
   15–60 minutes (can be longer). The domain flips to **Verified** when ready.

4. Once verified, point the function at it:
   ```bash
   supabase secrets set ALERT_FROM="Imaarisha Hub <alerts@imaarishasrhr.org>"
   supabase functions deploy activity-notify --no-verify-jwt
   ```
   (No code change needed — the function reads `ALERT_FROM`.)

Tip: the `to` address (`imaarishasrhr@gmail.com`) needs no verification — only the
**from** domain does.

## Turning it off
Disable or delete the webhook in Database → Webhooks. The function can stay deployed.
