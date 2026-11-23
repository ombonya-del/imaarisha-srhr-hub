-- ============================================================================
-- ImaarishaSRHR campaign — Radar share of voice
-- Adds a stance label to the existing radar_items table and a monthly view
-- for the KPI "positive / affirming SRHR content: 3.6% → 8%".
--
-- The Radar's table structure was not available while this was written, so
-- this file checks what exists and skips anything that doesn't match.
-- Check the NOTICE messages after running it.
-- ============================================================================

do $$
declare
  v_time_col text;
begin
  if to_regclass('public.radar_items') is null then
    raise notice 'radar_items not found — share-of-voice layer skipped';
    return;
  end if;

  -- stance assigned by the scanners (or by the reviewer in the Radar UI)
  execute $s$alter table public.radar_items
            add column if not exists campaign_stance text
            check (campaign_stance in ('affirming','neutral','misinformation','unclear'))$s$;
  execute 'alter table public.radar_items add column if not exists campaign_myth_slug text';
  execute 'alter table public.radar_items add column if not exists campaign_keyword_match boolean';

  -- find the timestamp column the Radar uses
  select column_name into v_time_col
  from information_schema.columns
  where table_schema = 'public' and table_name = 'radar_items'
    and column_name in ('posted_at','published_at','created_at','captured_at','detected_at')
  order by array_position(array['posted_at','published_at','created_at','captured_at','detected_at'], column_name::text)
  limit 1;

  if v_time_col is null then
    raise notice 'No timestamp column found on radar_items — view not created; set it by hand';
    return;
  end if;

  execute format($v$
    create or replace view public.campaign_kpi_share_of_voice with (security_invoker = true) as
    select date_trunc('month', %1$I)::date as month,
           count(*) filter (where campaign_stance is not null)            as classified_items,
           count(*) filter (where campaign_stance = 'affirming')          as affirming,
           count(*) filter (where campaign_stance = 'misinformation')     as misinformation,
           round(100.0 * count(*) filter (where campaign_stance = 'affirming')
                 / nullif(count(*) filter (where campaign_stance is not null), 0), 1) as pct_affirming,
           3.6 as baseline_pct, 8.0 as target_pct
    from public.radar_items
    group by 1 order by 1$v$, v_time_col);

  raise notice 'campaign_kpi_share_of_voice created on radar_items.%', v_time_col;
end $$;
