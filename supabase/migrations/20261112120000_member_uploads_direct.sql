-- Member resource uploads publish directly — no admin review queue.
--
-- 1. Members may insert a resource as 'approved' when it is an uploaded PDF or
--    Word file they own. (Pending inserts are still allowed for older clients.)
-- 2. Each member can add at most 10 resources per rolling 7 days. Admins are
--    exempt. Enforced here so it can't be bypassed from the browser.
-- 3. One-off: clears the old review queue (status = 'pending'), which was almost
--    entirely filled by the web resource-scanner that has now been switched off.
--    This DELETE cannot be undone.

-- ── 1. Insert policy ─────────────────────────────────────────────────────────
drop policy if exists resources_member_insert on public.resources;
create policy resources_member_insert on public.resources
  for insert to authenticated
  with check (
    public.is_approved()
    and submitted_by = auth.uid()
    and (
      status = 'pending'
      or (status = 'approved'
          and file_path is not null
          and lower(coalesce(file_type, '')) in ('pdf', 'doc', 'docx'))
    )
  );

-- ── 2. Weekly cap: 10 per member per 7 days ─────────────────────────────────
create or replace function public.resources_weekly_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare n int;
begin
  if NEW.submitted_by is null then return NEW; end if;
  if exists (select 1 from public.profiles where id = NEW.submitted_by and is_admin = true) then
    return NEW;
  end if;
  select count(*) into n
    from public.resources
   where submitted_by = NEW.submitted_by
     and created_at > now() - interval '7 days';
  if n >= 10 then
    raise exception 'Weekly limit reached: members can add up to 10 resources per 7 days.'
      using errcode = 'P0001';
  end if;
  return NEW;
end;
$fn$;

drop trigger if exists trg_resources_weekly_cap on public.resources;
create trigger trg_resources_weekly_cap
  before insert on public.resources
  for each row execute function public.resources_weekly_cap();

-- ── 3. Clear the old review queue ────────────────────────────────────────────
delete from public.resources where status = 'pending';
