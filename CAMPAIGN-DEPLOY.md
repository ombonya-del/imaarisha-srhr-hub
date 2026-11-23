# Digital campaign: deploy & run

The campaign runs through the existing apps; there is no new app.

| Where | What |
|---|---|
| **Hub → 📢 Campaign tab** (every member) | Campaign pulse, myth of the month, the **Campaign Kit** (released media and ready-to-post cut-downs, with WhatsApp / copy-link buttons that carry the member's code). If the member is linked to a voice, they also see **their own tracked links** and the monthly **report form**: platform numbers + screenshots for influencers and stations, a check-in for partner organisations. |
| **Admin console → 📢 Campaign** | **Dashboard** (IA2.1, knowledge change, reach, share of voice, rapid response, partners; CSV for ME3) · **Library** (masters and cut-downs, upload, review → approve → test run / public) · **Voices & links** (influencers, partners, stations; hub logins; create & copy `/go/` links; clicks per link) · **Reports** (verify platform numbers, partner check-ins, A/B message tests) · **Rapid response** (log surges from Radar flags, time each step, build and copy the WhatsApp brief) |
| **UkweliSRHR → Learn** | **Watch & listen**: public videos, Conversations episodes, clips and guides, measured at started / 25 / 50 / 75 / 100 %, plus WhatsApp share. A **Quick check** knowledge quiz at the bottom, anonymous and adults only. The first answer on a device counts as "before" and later ones as "after". |
| **`hub.imaarishasrhr.org/go/<code>`** | Tracked links. A click is logged (no IP stored), then the visitor is redirected. Ukweli pages get `?ref=<code>`, the same partner parameter Ukweli already records. |

## 1. Database (Supabase SQL editor, project `uwxtqyqyrhhxqagaqelg`)

Already run: `20261123120000`, `…120100`, `…120200`.
**Run now:** `supabase/migrations/20261123130000_campaign_integration.sql`. It:
- makes hub admins campaign staff and reviewers
- switches the myth categories to the Radar's names
- calculates share of voice from the Radar's existing `sentiment` / `positive_share`, and removes the three unused columns the earlier file added to `radar_items`
- links partner voices to `organizations` and creates a voice for every approved partner
- lets members see the Campaign Kit and lets partners edit their own check-in

## 2. Tracked-link function

```bash
cd ~/imaarisha-srhr-hub
supabase secrets set CLICK_SALT_SECRET="$(openssl rand -hex 32)" --project-ref uwxtqyqyrhhxqagaqelg
supabase functions deploy go --no-verify-jwt --project-ref uwxtqyqyrhhxqagaqelg
```
`hub2/vercel.json` already sends `/go/*` to the function, and `/go/` is excluded from the hub's offline cache.

## 3. Deploy the apps

Commit and push. Vercel rebuilds `hub2` (hub + admin) and `ukweli` as usual. Both were built and tested in a browser before this commit.

## 4. First steps in the console

1. **Library**: fill in each master as it's finished (YouTube link uploaded as *Unlisted*, podcast link, toolkit PDF), tag its myths, *Send for review* → *Approve* → **Test run** for the partner-led test, then **Public** at launch.
2. **Voices & links**: add the influencers, set each one's stage, and assign hub logins to anyone who will report. Partners are already there. Create links and paste them to each voice.
3. **Quiz**: in SQL, review the 7 draft items (wording, Kiswahili/Sheng versions, the `[REVIEW]` notes), then
   `update campaign_quiz_items set review_status='approved', active=true where code in (…);`
   The Quick check appears on Ukweli once at least one item is active.
4. **Myth of the month**: `update campaign_myths set myth_of_month = '2026-12-01' where slug = '…';`

Nothing shows on Ukweli or in the Campaign Kit until it is approved and released, so all of this is safe to deploy before the media is ready.
