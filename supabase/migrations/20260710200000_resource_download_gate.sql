-- Download gate for ALL resources (not just restricted ones): before opening or
-- downloading a resource, the member states who they are, why they want it and
-- what they'll use it for. For a normal resource this is logged and the download
-- proceeds immediately (status 'approved'); for a 🔐 restricted resource it stays
-- 'pending' until an admin approves. Reuses resource_requests as the intent log.

alter table public.resource_requests add column if not exists intended_use text;
