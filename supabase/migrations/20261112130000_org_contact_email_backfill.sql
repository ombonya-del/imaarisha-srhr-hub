-- Partner alerts (Match & Notify) email organizations.contact_email, but sign-up
-- never filled it, so every partner email was skipped ("no contact email").
-- Backfill it from the login email of the member who registered each
-- organisation. Only touches organisations that have no contact email yet;
-- admins can change any address in Admin → Members → Edit.

update public.organizations o
   set contact_email = u.email
  from auth.users u
 where u.id = o.submitted_by
   and coalesce(trim(o.contact_email), '') = ''
   and u.email is not null;

-- What's still missing (no registering member on record): fill these by hand.
select short_name, name
  from public.organizations
 where approved = true and coalesce(trim(contact_email), '') = ''
 order by short_name;
