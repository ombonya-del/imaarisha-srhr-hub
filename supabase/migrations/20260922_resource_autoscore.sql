-- Resource auto-scoring & auto-publish
-- Scores each new resource submission on insert; if it clears the threshold AND
-- comes from a trusted source (named source_org + a real link/file), it is
-- published automatically. Everything else stays 'pending' for manual review.
-- Runs AFTER INSERT as SECURITY DEFINER so it can set status='approved' without
-- tripping the members' insert policy (which requires status='pending').

alter table public.resources add column if not exists auto_score    int;
alter table public.resources add column if not exists auto_approved  boolean not null default false;
alter table public.resources add column if not exists auto_reason    text;

create or replace function public.resources_autoscore()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  txt        text;
  score      int := 0;
  topic_hits int := 0;
  kw         text;
  has_link   boolean;
  trusted    boolean;
  is_junk    boolean;
  do_pub     boolean;
  core text[] := array[
    'reproductive','sexual health','sexual and reproductive','srhr','family planning',
    'contracept','maternal','abortion','hiv','hpv','sti','adolescent','teen pregnancy',
    'menstrual','gender-based violence','gbv','femicide','sexual violence','rape',
    'defilement','domestic violence','harassment','gender equality','women''s rights',
    'girl child','fgm','female genital','child marriage','early marriage','disinformation',
    'reproductive rights','bodily autonomy','sexuality education'];
  kenya text[] := array['kenya','kenyan','east africa','nairobi','mombasa','kisumu','nakuru','homa bay','homa-bay'];
  doc_types text[] := array['report','policy','research','guide','toolkit','data'];
  THRESHOLD constant int := 6;
begin
  txt := lower(coalesce(NEW.title,'')||' '||coalesce(NEW.description,'')||' '||coalesce(NEW.source_org,'')||' '||coalesce(NEW.type,''));

  -- topic relevance (up to +8)
  foreach kw in array core loop
    if position(kw in txt) > 0 then topic_hits := topic_hits + 1; end if;
  end loop;
  score := score + least(topic_hits, 4) * 2;

  -- geography (+1)
  foreach kw in array kenya loop
    if position(kw in txt) > 0 then score := score + 1; exit; end if;
  end loop;

  -- recognised document type (+1)
  if NEW.type = any(doc_types) then score := score + 1; end if;

  -- has a usable link or hosted file (+1)
  has_link := (coalesce(NEW.file_url,'') <> '') or (coalesce(NEW.file_path,'') <> '');
  if has_link then score := score + 1; end if;

  -- named source (+1) and focus tags (+1)
  if coalesce(NEW.source_org,'') <> '' then score := score + 1; end if;
  if NEW.focus_tags is not null and array_length(NEW.focus_tags,1) >= 1 then score := score + 1; end if;

  -- spam / off-topic penalty
  is_junk := txt ~ '(viagra|casino|payday|loan|crypto|bitcoin|forex|betting|gambling|porn|xxx|earn \$|click here|weight ?loss|essay writing|dating)';
  if is_junk then score := score - 10; end if;

  -- trusted source gate: a named source AND a real link/file
  trusted := (coalesce(NEW.source_org,'') <> '') and has_link;

  do_pub := (NEW.status = 'pending') and trusted and (not is_junk) and (score >= THRESHOLD);

  update public.resources
     set auto_score    = score,
         auto_approved = do_pub,
         auto_reason   = case when do_pub
                              then format('Auto-published: score %s (%s SRHR topics, trusted source).', score, topic_hits)
                              else format('Held for review: score %s (%s SRHR topics)%s.', score, topic_hits,
                                          case when not trusted then ' — no trusted source' when is_junk then ' — spam signal' else '' end)
                         end,
         status        = case when do_pub then 'approved' else status end
   where id = NEW.id;

  return null;
end;
$fn$;

drop trigger if exists trg_resources_autoscore on public.resources;
create trigger trg_resources_autoscore
  after insert on public.resources
  for each row execute function public.resources_autoscore();
