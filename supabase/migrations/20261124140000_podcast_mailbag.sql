-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — Podcast mailbag (Nov 2026)
-- A bucket where the team drops interesting questions/voice notes from the
-- platform to seed future podcast episodes — a feedback + sustainability loop.
-- Admin-only. An entry can point back to the Uliza question that inspired it.
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.podcast_mailbag (
  id                 uuid primary key default gen_random_uuid(),
  source_question_id uuid references public.uliza_questions(id) on delete set null,
  title              text not null,
  note               text,                 -- the angle / why it's interesting
  theme              text,
  status             text not null default 'idea'
                       check (status in ('idea','shortlisted','planned','used','archived')),
  episode_ref        text,                 -- which episode it fed, once used
  added_by           uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists podcast_mailbag_status_idx on public.podcast_mailbag (status, created_at desc);
alter table public.podcast_mailbag enable row level security;

drop policy if exists podcast_mailbag_admin_all on public.podcast_mailbag;
create policy podcast_mailbag_admin_all on public.podcast_mailbag for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
