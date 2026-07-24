-- Trending curated responses: vetted counter-responses to each disinfo typology,
-- shown as "The truth" on flagged Trending items in Ukweli (so the platform, not
-- users, supplies the correction). Seeded from the hub's Disinfo Watch library.
-- Public read (active); admin-only write. Sheng falls back to EN in the app.

create table if not exists public.disinfo_responses (
  id          uuid primary key default gen_random_uuid(),
  typology    text not null,          -- contraceptive_myth | fertility_abortion | anti_cse | faith_healing
  language    text default 'en',      -- 'en' | 'sw' | 'sheng'
  response    text not null,
  sources     jsonb default '[]'::jsonb,  -- array of { label, url }
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now()
);

alter table public.disinfo_responses enable row level security;

drop policy if exists disinfo_responses_read on public.disinfo_responses;
create policy disinfo_responses_read on public.disinfo_responses
  for select using (active = true);

drop policy if exists disinfo_responses_admin_write on public.disinfo_responses;
create policy disinfo_responses_admin_write on public.disinfo_responses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Seed (idempotent per typology+language) ──────────────────────────────────
insert into public.disinfo_responses (typology, language, response, sources)
select * from (values
  ('contraceptive_myth','en',
   'FACT: Modern contraceptives do NOT cause permanent infertility. According to WHO and Kenya''s Ministry of Health, fertility returns within weeks to months after stopping most methods. Millions of Kenyan women use contraceptives safely every year. For accurate information, speak to a trained health worker.',
   '[{"label":"WHO — Contraception & fertility","url":"https://www.who.int/news-room/fact-sheets/detail/family-planning-contraception"},{"label":"Kenya Ministry of Health","url":"https://www.health.go.ke/"},{"label":"UNFPA — Contraception","url":"https://www.unfpa.org/contraception"}]'::jsonb),
  ('contraceptive_myth','sw',
   'UKWELI: Njia za kisasa za uzazi wa mpango HAZISABABISHI ugumba wa kudumu. Kulingana na WHO na Wizara ya Afya Kenya, uwezo wa kuzaa hurudi ndani ya wiki hadi miezi baada ya kuacha njia nyingi. Mamilioni ya wanawake Kenya hutumia salama kila mwaka. Uliza mhudumu wa afya aliyefunzwa.',
   '[{"label":"WHO — Contraception & fertility","url":"https://www.who.int/news-room/fact-sheets/detail/family-planning-contraception"},{"label":"Wizara ya Afya Kenya","url":"https://www.health.go.ke/"}]'::jsonb),
  ('fertility_abortion','en',
   'FACT: Safe abortion is NOT illegal in all circumstances in Kenya. Article 26(4) of the Constitution permits it when, in the opinion of a trained health professional, the life or health of the mother is in danger. Unsafe, hidden procedures are what cause lasting harm.',
   '[{"label":"Constitution of Kenya, Art. 26(4)","url":"http://kenyalaw.org/"},{"label":"WHO — Abortion care guideline","url":"https://www.who.int/publications/i/item/9789240039483"}]'::jsonb),
  ('fertility_abortion','sw',
   'UKWELI: Utoaji mimba salama SI haramu katika kila hali nchini Kenya. Kifungu cha 26(4) cha Katiba huruhusu pale mtaalamu wa afya anapoona uhai au afya ya mama iko hatarini. Njia za siri zisizo salama ndizo huleta madhara ya kudumu.',
   '[{"label":"Katiba ya Kenya, Kifungu 26(4)","url":"http://kenyalaw.org/"},{"label":"WHO — Huduma za utoaji salama","url":"https://www.who.int/publications/i/item/9789240039483"}]'::jsonb),
  ('anti_cse','en',
   'FACT: Evidence from UNESCO and WHO shows age-appropriate sexuality education delays sexual debut and reduces teen pregnancy and STIs. It equips children to recognise and report abuse. It protects — it does not corrupt.',
   '[{"label":"UNESCO — Sexuality education","url":"https://www.unesco.org/en/health-education/cse"},{"label":"WHO — Adolescent SRH","url":"https://www.who.int/teams/sexual-and-reproductive-health-and-research"}]'::jsonb),
  ('anti_cse','sw',
   'UKWELI: Ushahidi kutoka UNESCO na WHO unaonyesha elimu ya ngono inayolingana na umri huchelewesha kuanza ngono na hupunguza mimba za utotoni na magonjwa ya zinaa. Huwapa watoto uwezo wa kutambua na kuripoti unyanyasaji. Hulinda — haupotoshi.',
   '[{"label":"UNESCO — Elimu ya ngono","url":"https://www.unesco.org/en/health-education/cse"},{"label":"WHO — Afya ya vijana","url":"https://www.who.int/"}]'::jsonb),
  ('faith_healing','en',
   'FACT: There is no faith or herbal cure for HIV. Stopping ARVs after a "healing" claim is life-threatening. With consistent treatment, people living with HIV live full lives and cannot transmit the virus once virally suppressed (U=U). Always confirm any status change with a clinic test — never a testimony.',
   '[{"label":"NASCOP Kenya","url":"https://www.nascop.or.ke/"},{"label":"UNAIDS — Undetectable = Untransmittable","url":"https://www.unaids.org/en/resources/presscentre/featurestories/2018/july/undetectable-untransmittable"}]'::jsonb),
  ('faith_healing','sw',
   'UKWELI: Hakuna tiba ya imani au mitishamba ya VVU. Kuacha ARV baada ya dai la "kuponywa" ni hatari kwa maisha. Kwa matibabu ya kawaida, watu wanaoishi na VVU huishi maisha kamili na hawawezi kueneza virusi mara tu wanapofikia kiwango kisichoonekana (U=U). Thibitisha mabadiliko yoyote kliniki — si kwa ushuhuda.',
   '[{"label":"NASCOP Kenya","url":"https://www.nascop.or.ke/"},{"label":"UNAIDS — U=U","url":"https://www.unaids.org/"}]'::jsonb)
) as v(typology, language, response, sources)
where not exists (
  select 1 from public.disinfo_responses d
  where d.typology = v.typology and d.language = v.language
);
