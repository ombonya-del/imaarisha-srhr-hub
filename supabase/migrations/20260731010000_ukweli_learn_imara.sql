-- Imara TV in Learn. Videos are EMBEDDED from Imara TV's public YouTube channel
-- (youtube.com/@ImaraTV, channel UCF59RXwMCGxqH-aEMOseJhg) with credit — we never
-- download or rehost. media_type 'embed' renders the YouTube player in the card.
--
-- ext_id gives the auto-scanner a stable dedupe key so re-runs don't duplicate.

alter table public.ukweli_learn add column if not exists ext_id text;
create unique index if not exists ukweli_learn_ext_id_uidx
  on public.ukweli_learn (ext_id) where ext_id is not null;

-- Curated highlights — hand-placed into the matching themes. Idempotent on ext_id.
insert into public.ukweli_learn (ext_id, sort_order, color, emoji, language, title, intro, points, media_url, media_type)
select * from (values
  ('imara-VoctdS4vVw0', 40, '#FF4D6D', '▶', 'en',
   'Watch: buying condoms with confidence',
   'A light, real-talk guide to walking into a shop and buying condoms without the awkwardness. Video: Imara TV.',
   '[]'::jsonb, 'https://www.youtube.com/watch?v=VoctdS4vVw0', 'embed'),
  ('imara-MPc90Ve05go', 41, '#7B5CFF', '▶', 'en',
   'Watch: #CampusMeToo — sexual harassment toolkit',
   'Know your rights and where to turn if you face sexual harassment on campus. Video: Imara TV.',
   '[]'::jsonb, 'https://www.youtube.com/watch?v=MPc90Ve05go', 'embed')
) as v(ext_id, sort_order, color, emoji, language, title, intro, points, media_url, media_type)
where not exists (select 1 from public.ukweli_learn u where u.ext_id = v.ext_id);
