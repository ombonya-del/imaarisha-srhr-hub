-- Resource auto-scoring v2 — stricter "actual toolkits & reports" bar.
--
-- Supersedes 20260922_resource_autoscore.sql. Two changes vs v1:
--   1. Scoring logic is refactored into a reusable helper
--      public.resource_score(r public.resources) so it can be called both by
--      the INSERT trigger and by a one-off backfill / re-evaluation pass.
--   2. The auto-publish bar is tightened: a row now auto-publishes only when it
--      is a genuine report/toolkit-type document (has_doc) AND does NOT come
--      from a press/news outlet (not is_news). Press write-ups and bare links
--      that used to clear the old score are now held for manual review.
--
-- Everything that does not clear the stricter bar stays 'pending' for an admin.
-- The trigger runs AFTER INSERT as SECURITY DEFINER so it can set
-- status='approved' without tripping the members' insert policy.

alter table public.resources add column if not exists auto_score    int;
alter table public.resources add column if not exists auto_approved  boolean not null default false;
alter table public.resources add column if not exists auto_reason    text;

-- ── Scoring helper ───────────────────────────────────────────────────────────
-- Pure/stable: given a resource row, returns its score, whether it should
-- auto-publish, and a human-readable reason. No side effects.
create or replace function public.resource_score(r public.resources)
returns table(score int, approve boolean, reason text)
language plpgsql
stable
set search_path = public
as $fn$
declare
  txt        text;   -- title + description + source + type, lowercased
  body       text;   -- title + description only (for doc-signal match)
  src        text;   -- source_org, lowercased
  sc         int := 0;
  topic_hits int := 0;
  kw         text;
  has_link   boolean;
  trusted    boolean;
  is_junk    boolean;
  is_news    boolean := false;
  has_doc    boolean := false;
  THRESHOLD  constant int := 6;

  core text[] := array[
    'reproductive','sexual health','sexual and reproductive','srhr','family planning',
    'contracept','maternal','abortion','hiv','hpv','sti','adolescent','teen pregnancy',
    'menstrual','gender-based violence','gbv','femicide','sexual violence','rape',
    'defilement','domestic violence','harassment','gender equality','women''s rights',
    'girl child','fgm','female genital','child marriage','early marriage','disinformation',
    'reproductive rights','bodily autonomy','sexuality education'];
  kenya text[] := array['kenya','kenyan','east africa','nairobi','mombasa','kisumu','nakuru','homa bay','homa-bay'];
  doc_types text[] := array['report','policy','research','guide','toolkit','data'];

  -- Press / news outlets: if the SOURCE is one of these, hold for review even
  -- if the item scores well — these are write-ups, not primary documents.
  news_src text[] := array[
    'daily nation','nation.africa','standardmedia','the standard','the-star','the star',
    'vanguard','voanews','voa','facebook','twitter','health policy watch','allafrica',
    'reuters','bbc','cnn','aljazeera','al jazeera','citizen','capital fm','kbc',
    'kenya news agency','people daily','the eastleigh voice','africa.com','news',
    'guardian','taifa leo','ktn','ntv','tv47','pd online','businessdaily','business daily'];

  -- Document signals: a genuine report/toolkit/report-type title or description.
  doc_sig text[] := array[
    'report','review','strategy','framework','guideline','toolkit','policy brief',
    'manual','handbook','curriculum','factsheet','fact sheet','working paper','assessment',
    'evaluation','study','commission','analysis','dataset','white paper','baseline',
    'survey','guide','standards','brief','compendium','protocol','syllabus'];
begin
  txt  := lower(coalesce(r.title,'')||' '||coalesce(r.description,'')||' '||coalesce(r.source_org,'')||' '||coalesce(r.type,''));
  body := lower(coalesce(r.title,'')||' '||coalesce(r.description,''));
  src  := lower(coalesce(r.source_org,''));

  -- topic relevance (up to +8)
  foreach kw in array core loop
    if position(kw in txt) > 0 then topic_hits := topic_hits + 1; end if;
  end loop;
  sc := sc + least(topic_hits, 4) * 2;

  -- geography (+1)
  foreach kw in array kenya loop
    if position(kw in txt) > 0 then sc := sc + 1; exit; end if;
  end loop;

  -- recognised document type (+1)
  if r.type = any(doc_types) then sc := sc + 1; end if;

  -- has a usable link or hosted file (+1)
  has_link := (coalesce(r.file_url,'') <> '') or (coalesce(r.file_path,'') <> '');
  if has_link then sc := sc + 1; end if;

  -- named source (+1) and focus tags (+1)
  if coalesce(r.source_org,'') <> '' then sc := sc + 1; end if;
  if r.focus_tags is not null and array_length(r.focus_tags,1) >= 1 then sc := sc + 1; end if;

  -- spam / off-topic penalty
  is_junk := txt ~ '(viagra|casino|payday|loan|crypto|bitcoin|forex|betting|gambling|porn|xxx|earn \$|click here|weight ?loss|essay writing|dating)';
  if is_junk then sc := sc - 10; end if;

  -- press/news source?  (match on source_org)
  foreach kw in array news_src loop
    if position(kw in src) > 0 then is_news := true; exit; end if;
  end loop;

  -- genuine document signal?  (match on title + description)
  foreach kw in array doc_sig loop
    if position(kw in body) > 0 then has_doc := true; exit; end if;
  end loop;

  -- trusted source gate: a named source AND a real link/file
  trusted := (coalesce(r.source_org,'') <> '') and has_link;

  -- STRICTER auto-publish bar: trusted, not spam, NOT a news outlet,
  -- carries a document signal, and clears the threshold.
  approve := trusted and (not is_junk) and (not is_news) and has_doc and (sc >= THRESHOLD);

  score  := sc;
  reason := case
    when approve then format('Auto-published: score %s (%s SRHR topics, trusted report/toolkit).', sc, topic_hits)
    when is_junk then format('Held for review: score %s (%s SRHR topics) — spam signal.', sc, topic_hits)
    when not trusted then format('Held for review: score %s (%s SRHR topics) — no trusted source.', sc, topic_hits)
    when is_news then format('Held for review: score %s (%s SRHR topics) — press/news source.', sc, topic_hits)
    when not has_doc then format('Held for review: score %s (%s SRHR topics) — not a report/toolkit.', sc, topic_hits)
    else format('Held for review: score %s (%s SRHR topics).', sc, topic_hits)
  end;
  return next;
end;
$fn$;

-- ── Thin INSERT trigger ──────────────────────────────────────────────────────
create or replace function public.resources_autoscore()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare s record;
begin
  select * into s from public.resource_score(NEW);
  update public.resources
     set auto_score    = s.score,
         auto_approved = (NEW.status = 'pending') and s.approve,
         auto_reason   = s.reason,
         status        = case when (NEW.status = 'pending') and s.approve then 'approved' else status end
   where id = NEW.id;
  return null;
end;
$fn$;

drop trigger if exists trg_resources_autoscore on public.resources;
create trigger trg_resources_autoscore
  after insert on public.resources
  for each row execute function public.resources_autoscore();

-- ── One-time re-evaluation of already-auto-published rows ────────────────────
-- Re-screen everything that was auto-published under the looser v1 bar and pull
-- press/news and non-document items back to 'pending'. Safe to run once; it only
-- touches rows that auto_approved=true and no longer clear the stricter bar.
with scored as (
  select r.id, s.score, s.approve, s.reason
    from public.resources r,
         lateral public.resource_score(r) s
   where r.auto_approved = true
)
update public.resources r
   set auto_score    = scored.score,
       auto_reason   = scored.reason,
       auto_approved = scored.approve,
       status        = case when scored.approve then r.status else 'pending' end
  from scored
 where r.id = scored.id
   and scored.approve = false;
