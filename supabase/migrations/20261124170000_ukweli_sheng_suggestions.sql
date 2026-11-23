-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — "My Sheng": young users suggest better Sheng wording (Nov 2026)
-- Anonymous, rate-limited. Writes go only through ukweli_sheng_suggest();
-- only admins can read, triage or delete. A feedback + co-creation loop.
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ukweli_sheng_suggestions (
  id            bigint generated always as identity primary key,
  entry_slug    text,                       -- optional: the quick-answer it refers to
  lang          text not null default 'sheng',
  original_text text,                        -- the phrase that felt off (optional)
  suggestion    text not null,              -- the user's better version
  note          text,                        -- why / where (optional)
  status        text not null default 'new' check (status in ('new','applied','declined')),
  visitor       text,
  created_at    timestamptz not null default now()
);
create index if not exists ukweli_sheng_created_idx on public.ukweli_sheng_suggestions (status, created_at desc);
alter table public.ukweli_sheng_suggestions enable row level security;

drop policy if exists ukweli_sheng_admin_all on public.ukweli_sheng_suggestions;
create policy ukweli_sheng_admin_all on public.ukweli_sheng_suggestions for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Anonymous submit, validated + rate-limited. Returns 'ok', 'empty' or 'limit'.
create or replace function public.ukweli_sheng_suggest(p jsonb)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  v_visitor text := left(coalesce(p->>'visitor',''), 40);
  v_sug  text := nullif(left(trim(coalesce(p->>'suggestion','')), 1000), '');
  v_orig text := nullif(left(trim(coalesce(p->>'original_text','')), 1000), '');
  v_note text := nullif(left(trim(coalesce(p->>'note','')), 500), '');
begin
  if v_sug is null then return 'empty'; end if;
  if length(v_visitor) >= 8 and (select count(*) from public.ukweli_sheng_suggestions
        where visitor = v_visitor and created_at > now() - interval '1 day') >= 10 then
    return 'limit';
  end if;
  if (select count(*) from public.ukweli_sheng_suggestions where created_at > now() - interval '1 day') >= 2000 then
    return 'limit';
  end if;
  insert into public.ukweli_sheng_suggestions (entry_slug, lang, original_text, suggestion, note, visitor)
  values (nullif(left(p->>'entry_slug',80),''), left(coalesce(p->>'lang','sheng'),8), v_orig, v_sug, v_note, nullif(v_visitor,''));
  return 'ok';
end;
$fn$;
revoke all on function public.ukweli_sheng_suggest(jsonb) from public;
grant execute on function public.ukweli_sheng_suggest(jsonb) to anon, authenticated;
