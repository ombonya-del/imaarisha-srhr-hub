# Design & Build House Style

House rules for building and reviewing UI in this repo (and its sibling apps). Read
before starting UI work. The goal: work that looks intentional and bespoke, not
generic "AI default," and that is genuinely mobile-first, accessible, and secure.

## Typography
- **Never** use overused AI-default fonts (Inter, and similar). Use each app's
  established pairing and keep it consistent — a serif for display/headlines
  (e.g. Lora / Cormorant Garamond) paired with a clean humanist sans for body
  (e.g. Nunito Sans). Don't introduce a new font family without a reason.
- Establish a clear type hierarchy: distinct sizes/weights for kicker → title →
  body → caption, so the eye is guided. Avoid everything-the-same-size.

## Colour
- Restrained palette: one or two purposeful accents per app, not a rainbow.
  Reuse the app's existing tokens (the `C`/palette objects) — don't hand-pick new
  hex values ad hoc.
- Meet contrast (WCAG AA): body text ≥ 4.5:1, large text ≥ 3:1.

## Layout & mobile
- **Mobile-first, actually** — design for the phone, don't just shrink desktop.
  Prefer patterns that fit small screens: bottom nav, accordions/collapsibles for
  long stacked content (see the Voices lanes — one item per lane on mobile,
  expandable), horizontal cards over wide empty media boxes.
- Respect safe areas: `env(safe-area-inset-*)` on fixed bars.
- Long/unbreakable strings (URLs, handles) must wrap: `overflow-wrap:anywhere`.

## Motion
- Animation is intentional, subtle, and performant — never decorative jitter.
- Honour `prefers-reduced-motion`.

## Copy
- Restrained and specific. Real, human sentences; no generic filler or hype.
  Say the concrete thing.

## PWA / service worker
- Static pages that must bypass the SPA shell (e.g. `privacy.html`, PDFs, viewers)
  belong in `navigateFallbackDenylist` — otherwise the SW serves the app instead.
- Registered with `autoUpdate`; keep the controllerchange auto-reload so new builds
  propagate.

## Security & privacy (baked in, not bolted on)
- Only the **public anon key** ships to the client — never a service-role key or
  API secret. Secrets live in edge-function env only.
- Rely on RLS: anon may INSERT to public forms but must NOT SELECT PII tables.
- Ship security headers (HSTS, nosniff, X-Frame-Options, Referrer-Policy) via
  `vercel.json`.
- Every app links a **Privacy Policy** (Kenya DPA 2019 + GDPR aligned) from a
  visible footer.
- Guard paid/public edge functions (admin auth or a shared secret) so they can't be
  hammered.

## Process (how we build well)
- **Reference-driven:** start from a concrete visual reference, not a blank prompt.
- **Ask first:** clarify audience, tone, sections, animation level before building.
- **Two review passes:** (1) scroll it yourself, list everything off, fix in one
  batch; (2) structured check — typography, colour, hierarchy, motion, mobile, copy.
- Verify builds and, for live changes, load the deployed page and confirm before
  calling it done.

## Optional tooling worth installing (Cowork/Claude Code)
- **Frontend Design** skill (Anthropic) — blocks default fonts, pushes bolder layouts.
- **UI/UX Pro Max** plugin — interface styles, palettes, font pairings on demand.
