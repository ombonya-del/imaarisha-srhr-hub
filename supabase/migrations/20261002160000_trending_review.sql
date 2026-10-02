-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — Trending ("Spreading right now") review, 2 Oct 2026
-- Problems found in the 120 entries shown to young people:
--   • 18 snippets were just a broken "<a href=" fragment; most others merely
--     repeated the headline.
--   • ~40 were duplicates of the same story from two domains (nation.africa /
--     Daily Nation, etc.).
--   • Most were not misinformation at all (regulator warnings, investigations,
--     fact-checks), or were from Ghana, Uganda, the US, Europe or the Caribbean,
--     many published in the 2000s — yet all showed as "0m ago".
-- Fix: a youth_visible flag (the hub's Radar still sees everything), text clean-up,
-- and a reviewed short-list of genuine, relevant claims. Reversible: flip
-- youth_visible back in Admin → Ukweli → Trending. Run ONCE: running it again
-- later would also hide any news items the scanner has added since.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.radar_items add column if not exists youth_visible boolean not null default true;
alter table public.radar_items add column if not exists review_note   text;

-- ── 1. Clean text ────────────────────────────────────────────────────────────
create or replace function pg_temp.uk_clean(t text) returns text language plpgsql as $$
declare m text[]; i int; n int;
begin
  if t is null then return null; end if;
  for i in 1..2 loop
    t := replace(replace(replace(replace(replace(replace(replace(t,
           '&lt;','<'),'&gt;','>'),'&quot;','"'),'&#39;',''''),'&apos;',''''),'&nbsp;',' '),'&amp;','&');
    t := replace(replace(replace(replace(t,'&hellip;','…'),'&mdash;','—'),'&ndash;','–'),'&rsquo;','’');
    loop
      m := regexp_match(t, '&#([xX]?)([0-9a-fA-F]{1,6});');
      exit when m is null;
      n := case when m[1] <> '' then ('x' || lpad(m[2], 8, '0'))::bit(32)::int else m[2]::int end;
      t := replace(t, '&#' || m[1] || m[2] || ';', case when n between 1 and 1114111 then chr(n) else '' end);
    end loop;
    t := regexp_replace(t, '<!\[CDATA\[|\]\]>', '', 'g');
    t := regexp_replace(t, '<[^>]*>', ' ', 'g');
  end loop;
  t := regexp_replace(t, '<[^>]*$', '');                 -- tag cut off mid-way (truncated feeds)
  t := regexp_replace(t, 'submitted by\s+/?u/\S+', '', 'gi');
  t := regexp_replace(t, '\[(link|comments)\]', '', 'gi');
  t := regexp_replace(t, 'https?://\S+', '', 'g');
  t := regexp_replace(t, '[​-‍﻿]', '', 'g');
  t := regexp_replace(t, '\s+', ' ', 'g');
  return nullif(btrim(t), '');
end $$;

update public.radar_items
set title = coalesce(pg_temp.uk_clean(title), title),
    snippet = pg_temp.uk_clean(snippet),
    source_name = pg_temp.uk_clean(source_name)
where title ~ '[<>]|&[#a-zA-Z0-9]+;' or snippet ~ '[<>]|&[#a-zA-Z0-9]+;|submitted by|\[link\]|\[comments\]'
   or source_name ~ '[<>]|&[#a-zA-Z0-9]+;';

-- A Google News "snippet" is usually just the headline + outlet again: drop it.
update public.radar_items
set snippet = null
where snippet is not null
  and length(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')) > 10
  and lower(regexp_replace(snippet, '[^a-zA-Z0-9]', '', 'g'))
      like lower(regexp_replace(regexp_replace(title, '\s+[-|–]\s+[^-|–]+$', ''), '[^a-zA-Z0-9]', '', 'g')) || '%';

-- ── 2. Reviewed short-list for the youth app ────────────────────────────────
-- Every scanned news/Reddit item is hidden from young people, then these reviewed
-- entries are shown again. New items from the scanner are filtered automatically.
update public.radar_items set youth_visible = false,
  review_note = coalesce(review_note, 'Oct 2026 review: not shown — duplicate, not misinformation, off-topic, or not relevant to Kenya/now')
where youth_visible = true
  and coalesce(platform, 'news') in ('news', 'reddit');   -- hand-curated TikTok/YouTube/X posts stay as they are

update public.radar_items r set youth_visible = true, review_note = k.note
from (values
  ('867f90eb-c063-41bf-8399-205e12257ae3'::uuid, 'Kenya — faith-healing HIV claim'),
  ('3bfb88ef-70fb-4aee-b2c2-860281b89c34'::uuid, 'Kenya — faith-healing HIV claim (Owuor)'),
  ('600badc1-e37f-4e20-826b-c4de88b55523'::uuid, 'Kenya — doctors endorsing HIV "healings"'),
  ('1766f26b-5e69-427b-994e-72e1f207f47b'::uuid, 'Kenya-linked — HIV "oil cure"'),
  ('ccbf3009-3876-4b27-a431-527c5b6e0d9a'::uuid, 'Widely shared HIV "miracle" claim'),
  ('e910c89b-9ffc-4829-aa99-50c56858dea5'::uuid, 'Regional HIV "healing" claim'),
  ('d696614a-80ce-4254-ad67-41b505b678df'::uuid, 'Kenya — infertility myths'),
  ('768d74b2-aceb-46fe-9992-5039d63ae0ea'::uuid, 'Kenya — misleading claim that the morning-after pill causes ectopic pregnancy'),
  ('7b58bb90-db1c-488b-8985-36000edfe089'::uuid, 'Kenya — scare framing of emergency contraception'),
  ('93e69bee-55d5-4c5d-a4fd-990ced91ec45'::uuid, 'Kenya — scare framing of emergency contraception'),
  ('b13ec058-b8c4-4e2f-90bd-2ec145f6233b'::uuid, 'Kenya — anti-contraception messaging'),
  ('bb748997-1b03-4ddd-9901-a8aea0c69399'::uuid, 'Kenya — campaign against sexuality education'),
  ('cc9dbe46-0872-43c4-9009-d746ea98b44b'::uuid, 'Africa-wide "foreign agenda" narrative on sex education'),
  ('24454db3-88c8-4a5d-8403-5fcd86f38fb0'::uuid, 'Africa-wide narrative on abortion & aid')
) as k(id, note)
where r.id = k.id;

-- What young people will now see:
select left(title, 90) as title, typology, review_note
from public.radar_items
where youth_visible and (is_disinfo or harm_score >= 5)
order by scanned_at desc;
