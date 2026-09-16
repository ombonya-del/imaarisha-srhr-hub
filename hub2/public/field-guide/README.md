# ImaarishaSRHR — The Field Guide (PWA)

An interactive, offline-ready, installable web version of the Strategic Comms &
Reframing toolkit. Eight modules (7 strategy + a full Mother & Aunty curriculum),
each ending in a working tool. Built around the Achieng family. Desktop sidebar +
mobile bottom-nav. Placeholder illustrations — swap for the final character art later.

## Files
- `index.html` — the whole app (self-contained CSS + JS, inline QR codes)
- `manifest.webmanifest` — PWA manifest (name, icons, theme)
- `sw.js` — service worker (offline-first cache)
- `icons/` — placeholder lotus app icons (192/512, standard + maskable)

## QR codes & deep links
The print/two-track notes carry real scannable QR codes (embedded inline as SVG,
so they work offline). They point to `https://imaarishasrhr.org/field-guide/`
and use `#m<n>` to open a specific module — e.g. `#m7` opens the Mother & Aunty
curriculum. Change the base URL: edit the `BASE`-derived `QR` constant near the top
of the `<script>` in `index.html` (regenerate the QR SVGs if you change the URL).

## What's inside
- A **Facilitator tab** (in-app quick reference) and a clickable five-session M&A curriculum.
- `Facilitator_Manual.pdf` — the full print-ready Facilitator & Training-of-Trainers manual, linked from the Facilitator tab.

## Run locally
Serve the folder over http (a service worker won't run from file://):
    npx serve field-guide      # or: python3 -m http.server -d field-guide 8080
Then open the URL and, in Chrome, use "Install app".

## Deploy (standalone, Vercel)
Static site — deploy as its own project:
    cd field-guide && vercel        # or drag the folder into vercel.com/new
HTTPS gives installability on Android & desktop; on iOS, Safari → Share → Add to Home Screen.

## Or mount it inside the hub
Copy this folder to the hub's `public/` (e.g. `public/field-guide/`); it serves at
`/field-guide/`. Keep its own `sw.js` scope to that path.

## Swapping illustrations later
Replace the inline SVG hero (the `.scene` block) and the character `avatar()` function
with the final art. Search `Placeholder art` and `avatar(` in `index.html`.
