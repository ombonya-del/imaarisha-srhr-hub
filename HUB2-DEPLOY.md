# ImaarishaSRHR Hub 2.0 — deploy & run guide

Everything built in this session lives in three places:
- `hub2/` — the CSO operations room (Pulse · Radar · Forum · Exchange) — desktop/mobile
- `ukweli/` — the youth-facing PWA (Ask anonymously · Myth-busters · Learn) — separate
  app, separate audience, quick-exit button, no accounts; same Supabase underneath.
  Deploy to its own subdomain, e.g. ukweli.imaarishasrhr.org (same Vite/Vercel steps as hub2).
- `supabase/` — the Radar backend (edge function, migrations) + RLS audit/fix

The current static hub (`public/index.html`) is untouched and still live. Hub 2.0
runs alongside it until you choose to switch the domain over.

---

## A. Database (run once, in the IMAARISHA project)

Project ref: `uwxtqyqyrhhxqagaqelg`

```bash
cd ~/Downloads/imaarisha-srhr-hub-main      # or your real clone
supabase link --project-ref uwxtqyqyrhhxqagaqelg
supabase db push
```

This applies three migrations:
- `20260611_radar.sql` — radar_items, radar_index, uliza_questions, ukweli_cards + RLS
- `20260611_ukweli_seed.sql` — the myth-buster cards (EN + SW)
- (plus the earlier RLS audit lives in `supabase/rls-audit.sql` — run section 1 first!)

If `db push` complains about migration history, run each file’s contents in the
SQL Editor instead.

> ⚠️ Still outstanding: run `supabase/rls-audit.sql` section 1 in THIS project and
> lock down the existing tables (discussions, resources, events…). The new radar
> tables are already locked (read-only public, service-role writes).

## B. Deploy the Radar edge function

```bash
supabase functions deploy radar-scanner --project-ref uwxtqyqyrhhxqagaqelg
# set the secret it needs (same Anthropic key family as FemSaidia):
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref uwxtqyqyrhhxqagaqelg
# first manual run:
curl -X POST https://uwxtqyqyrhhxqagaqelg.supabase.co/functions/v1/radar-scanner \
  -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" -d '{}'
```

The GitHub Actions workflow `.github/workflows/radar.yml` then scans every 3 hours.
Push the repo and run it once from the Actions tab to confirm.

## C. Run / build the PWA

```bash
cd hub2
npm install
npm run dev      # local preview at http://localhost:5173
npm run build    # production build → hub2/dist
```

(The build couldn’t be run in my sandbox — it ran out of memory — but all files
pass syntax + structure checks. Any error you hit locally will be a missing-dep
or env issue, not the code; send it to me.)

## D. Deploy the PWA to Vercel

Point a new Vercel project (or a preview subdomain like `hub2.imaarishasrhr.org`)
at the `hub2/` directory. Framework preset: Vite. Add the two env vars from
`hub2/.env`. When you’re happy, switch the main domain from the static site to hub2.

---

## What’s inside Hub 2.0

| Screen | What it does | Data source |
|--------|--------------|-------------|
| **Pulse** | Live home feed: Narrative Index headline + newest radar/forum/resource activity | radar_index, radar_items, discussions, resources |
| **Radar** | The flagship: SRHR Narrative Index dial, four-typology breakdown, live disinfo feed with filters | radar_index, radar_items |
| **Forum** | Existing discussions, read view (port full thread next) | discussions |
| **Exchange** | Marketplace listings + org directory | marketplace_listings, organizations |
| **Ukweli** | Uliza (anonymous Q&A), Myth-buster cards (EN/SW/Sheng), Learn (Phase 2 media home) | uliza_questions, ukweli_cards |

Language toggle (EN / SW / Sheng) in the top bar, persisted. Installable PWA with
offline shell caching. Dark + gold identity, bottom nav, mobile-first.

## Next build steps (when you’re ready)
1. Full forum thread view + posting (port from the static hub, with the esc() escaping).
2. Uliza answer flow in the admin app (verified-professional badge).
3. County Accountability Scorecard (grow tracker_indicators).
4. Jibu rapid-response push alerts when the radar spikes.
5. Bila Aibu judgment-free facility map.
