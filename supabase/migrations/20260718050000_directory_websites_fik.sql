-- Directory: member websites become clickable + add Feminists in Kenya (FiK).
alter table public.organizations add column if not exists website text;

-- New member: Feminists in Kenya
insert into public.organizations (name, short_name, slug, focus_area, website, approved)
select 'Feminists in Kenya', 'FiK', 'feminists-in-kenya', 'Feminist movement & gender justice', 'https://feministsinkenya.org', true
where not exists (
  select 1 from public.organizations
  where slug = 'feminists-in-kenya' or lower(name) = 'feminists in kenya'
);

-- Populate researched member websites (only where currently blank)
update public.organizations o set website = v.url
from (values
  ('zamara-foundation',  'https://zamarafoundation.org'),
  ('naya-kenya',         'https://www.nayakenya.org'),
  ('zana-africa',        'https://zanaafrica.org'),
  ('this-ability-trust', 'https://www.this-ability.org'),
  ('cyan',               'https://www.cyankenya.org'),
  ('srhr-alliance',      'https://www.srhralliance.or.ke'),
  ('men-engage-kenya',   'https://menken.or.ke'),
  ('afyafrika',          'https://afyafrika.org'),
  ('activate-action',    'https://activateaction.org/'),
  ('mmaak',              'https://mmaak.org/'),
  ('beyond-initiative',  'https://www.facebook.com/BeyondInitiatives/'),
  ('secny-cbo',          'https://www.facebook.com/sencycbo/')
) as v(slug, url)
where o.slug = v.slug and (o.website is null or o.website = '');
