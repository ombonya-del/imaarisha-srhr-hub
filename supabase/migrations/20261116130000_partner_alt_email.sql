-- Partner alerts: a main and an alternate contact email per organisation.
-- Match & Notify sends one email with both addresses on "To", so an alert
-- still lands if the main inbox isn't checked regularly.
--
-- Contacts: the signed MoU list is used as the main address where it has one;
-- hub members who registered with that organisation fill the alternate.

alter table public.organizations add column if not exists alt_contact_email text;

update public.organizations o
   set contact_email     = v.main,
       alt_contact_email = v.alt
  from (values
    ('Activate Action',   'rogers@activateaction.org',               'biko@activateaction.org'),
    ('AfyAfrika',         'afyafrika@gmail.com',                     'janetmwende01@gmail.com'),
    ('Beyond Initiative', 'beyondinitiativesocialconcern@gmail.com', null),
    ('CYAN',              'davine@cyankenya.org',                    null),
    ('FiK',               'njahira@feministsinkenya.org',            null),
    ('Men Engage Kenya',  'kemeacoordinator@gmail.com',              null),
    ('NAYA',              'nelson.akoth@nayakenya.org',              'leonard.ochaka@nayakenya.org'),
    ('SRHR Alliance',     'aminaj@srhralliance.or.ke',               'ruthouma7@gmail.com'),
    ('This Ability',      'joan@this-ability.org',                   null),
    ('Zamara',            'r.akeyo@zamarafoundation.org',            'bettymtuweta@gmail.com')
  ) as v(short_name, main, alt)
 where o.short_name = v.short_name;

-- Check: every approved partner and what it now has.
select short_name, contact_email, alt_contact_email
  from public.organizations
 where approved = true
 order by short_name;
