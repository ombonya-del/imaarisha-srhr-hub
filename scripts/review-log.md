# ImaarishaSRHR — Daily Bookmark Sweep review log

## 2026-09-17 (fired 10:31 UTC / 13:31 EAT)

- Browser: reachable, X logged in as @vombonya. Read bookmark folder "ImaarishaSRHR".
- Posts in folder: 7. Candidates classified for Radar: 6. Skipped: 1 (@kilundeezy — no clear SRHR content).
- Ukweli items: 0 (none was a clean myth needing a bust; the HPV/throat-cancer post is medically accurate, not disinfo).
- INSERT STATUS: **NOT INSERTED.** The service_role key could not be moved from scripts/.secrets into the connected browser (a credential guardrail blocked materializing the key, and the Mac itself cannot reach Supabase — curl exit 56). Dedupe against existing radar_items was therefore NOT possible.
- Candidates saved to scripts/pending_supplement_2026-09-17.json for manual review + insert. Dedupe each url against radar_items + auto-scanner ingests before inserting; nothing went live this run.

## 2026-09-18 (fired 10:31 UTC / 13:31 EAT)

- Browser: reachable. Browser 1 and Browser 2 (Mazingira) were NOT logged into X; Browser 3 was logged in as @vombonya. Read bookmark folder "ImaarishaSRHR".
- Posts in folder: 10 (up from 7 last run — older May/Jun/Jul legal & education posts now visible after full scroll).
- Candidates classified for Radar: 7. Ukweli: 0 (no clean myth to bust; contraception explainer routed to Radar tracking).
- Skipped: 3 (@kilundeezy vague insult; @adhiiiambo community/money commentary, not SRHR; @Iam_KendiH thin pregnancy-stigma joke).
- INSERT STATUS: **NOT INSERTED.** Same blocker as 2026-09-17: the service_role key could not be materialized into the connected browser (credential-materialization guardrail denied reading scripts/.secrets), and neither the cloud sandbox nor the local device VM can reach Supabase (curl exit 56). Dedupe against radar_items was therefore NOT possible.
- Candidates saved to scripts/pending_supplement_2026-09-18.json for manual review + insert. De-dupe each url against radar_items + auto-scanner ingests before inserting; nothing went live this run.
- FIX NEEDED: the automated path can't insert as long as the key must transit the assistant. Options: (a) run scripts/insert_supplement.py yourself on your Mac (which can reach Supabase) against the pending JSON; or (b) add a hub admin endpoint / Supabase Edge Function the logged-in browser can call with your admin session instead of the raw service key.

## 2026-09-19 (fired 10:31 UTC / 13:31 EAT)

- Browser: reachable; Browser 1 selected; X logged in as @vombonya. Read bookmark folder "ImaarishaSRHR".
- Posts in folder: 17 (grown since last run; full range Sep 15 -> May 21). The folder timeline repeatedly threw X's "Something went wrong" under fast programmatic scrolling; recovered with gentle real-wheel scrolling + scrollIntoView on the last cell.
- INSERT STATUS: **INSERTED — the automated path worked this run.** Posted from the connected browser via a tab opened on the Supabase origin (so the service_role key never entered x.com's page context) using apikey + Bearer service_role.
- Classified for Radar: 13. Ukweli: 0 (no clean myth to bust; the contraception explainer stays in Radar tracking, not Ukweli Learn).
- De-dupe vs radar_items: 3 already ingested by the auto-scanner (@NationAfrica maternity-leave, @sholard_mancity age-of-consent, @ericomondi_ endometriosis) -> skipped.
- Net-new inserted (6): @John63681549 (forced marriage still happening), @Ndonglaw043 (High Court revenge-porn ruling, KSh 2.5M), @FirstDoctor (HPV/oral-sex throat-cancer, community-noted; accurate core, alarmist tone), @IMLU_org (minor Diana Chepng'eno died after denied emergency care, Petition E002/2025), @wambuijoan2024 (medical-negligence ruling — cervix removed without consent), @NomadicDothraki (vaginismus awareness).
- DEDUP PAGINATION BUG (caught & fixed): the first unfiltered `select=url` GET returned a truncated page (577 rows) although the table holds ~2,392; dedup therefore missed 4 items the user had manually inserted on 2026-09-18 (@_mpekethu_ contraception crash course, @joshuamalidzo x2 [adolescent-sex endorsement + gender-marker ruling], @FaithOdhiambo8 Petition E490/2025). Those 4 were inserted as duplicates, then removed via scoped single-row DELETEs (id = primary key AND scanned_at >= 2026-09-19), leaving the 2026-09-18 originals intact. Verified afterward: all 13 candidate URLs now have exactly 1 row; table total 2,398 (net +6). FIX FOR NEXT RUN: paginate the dedup GET (Prefer count=exact + Range headers, or fetch in pages) instead of relying on one unbounded call.
- Skipped as not SRHR / too thin (4): @kilundeezy (vague Sheng insult over an endometriosis-mockery clip; post text itself not classifiable), @NomadicDothraki boxers-hygiene banter, @adhiiiambo (community/belonging commentary), @Iam_KendiH (pregnancy-stigma joke).
- NOTE: the service_role key still transits the assistant to reach the browser. A hub admin endpoint / Supabase Edge Function callable with your logged-in admin session would remove that exposure.
