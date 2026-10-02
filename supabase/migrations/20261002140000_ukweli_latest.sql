-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — "Catch the Latest" (Trending tab)
-- Plain-language breakdowns of recent SRHR developments: court rulings, laws,
-- bills, policies, new methods, guidance. Editors manage them in
-- Admin → Ukweli → Latest. English + Kiswahili rows share a group_key.
-- Safe to re-run (seed rows are keyed on group_key + language; existing ones are skipped).
-- Research checked 2 Oct 2026 — re-check items marked "check" before relying on them.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ukweli_updates (
  id             uuid primary key default gen_random_uuid(),
  group_key      text not null,                 -- same for EN/SW versions of one item
  language       text not null default 'en',    -- en | sw | sheng
  kind           text not null default 'policy',-- ruling | law | bill | policy | method | guidance | service
  title          text not null,
  happened_on    date,                          -- for sorting
  date_label     text,                          -- shown to readers, e.g. "20 May 2026"
  what_happened  text,
  what_it_means  text,
  status_note    text,                          -- "Where it stands now"
  care_note      text,                          -- helplines / content note
  sources        jsonb not null default '[]',   -- [{ "label": "...", "url": "https://..." }]
  pinned         boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  constraint ukweli_updates_kind_chk check (kind in ('ruling','law','bill','policy','method','guidance','service'))
);
create index if not exists ukweli_updates_order_idx on public.ukweli_updates (active, pinned desc, happened_on desc);
create unique index if not exists ukweli_updates_group_lang_uq on public.ukweli_updates (group_key, language);

alter table public.ukweli_updates enable row level security;
drop policy if exists ukweli_updates_read  on public.ukweli_updates;
drop policy if exists ukweli_updates_admin on public.ukweli_updates;
create policy ukweli_updates_read  on public.ukweli_updates for select using (active = true or public.is_admin());
create policy ukweli_updates_admin on public.ukweli_updates for all using (public.is_admin()) with check (public.is_admin());

-- ── Seed: first set of developments (EN + SW) ───────────────────────────────
insert into public.ukweli_updates
  (group_key, language, kind, title, happened_on, date_label, what_happened, what_it_means, status_note, care_note, sources, pinned)
values
-- 1. Teen peer relationships ruling
('teen-peer-ruling-2026', 'en', 'ruling',
 'High Court: teens shouldn’t be prosecuted for consensual relationships with peers',
 '2026-05-20', '20 May 2026',
 'In a case brought by three adolescents and the Network for Adolescent and Youth of Africa (NAYA), the High Court in Nairobi ruled that using the Sexual Offences Act to prosecute consensual, non-coercive relationships between adolescents of similar ages is unconstitutional. The court stopped the criminal cases against the petitioners, ordered the Director of Public Prosecutions to publish guidelines for these cases, told the police to change how they arrest and investigate, and directed government agencies to make sure young people can get SRH services without fear.',
 'The age of consent is still 18 — this ruling did not change it. It means two young people close in age, in a relationship where nobody was forced, pressured, paid or taken advantage of, should get support and guidance, not a criminal case. It does NOT protect any adult who has sex with someone under 18, or anyone who uses force, threats, money or power over another person — that is still a serious crime. You also have the right to get contraception, HIV testing and other SRH services.',
 'High Court judgment, May 2026. It can be appealed, and we will update this if it is. Check: whether the DPP has published the new guidelines.',
 'If someone is pressuring or hurting you, call Childline 116 or the GBV line 1195 — both free.',
 '[{"label":"Center for Reproductive Rights — case page","url":"https://reproductiverights.org/cases/decriminalizing-consensual-adolescent-relationships-kenya/"},{"label":"Citizen Digital","url":"https://citizen.digital/article/high-court-rules-sexual-offences-act-should-not-criminalise-consensual-sex-between-close-in-age-teens-n383131"}]',
 true),
('teen-peer-ruling-2026', 'sw', 'ruling',
 'Mahakama Kuu: vijana wasishtakiwe kwa mahusiano ya ridhaa na wenzao wa rika moja',
 '2026-05-20', '20 Mei 2026',
 'Katika kesi iliyofunguliwa na vijana watatu na Network for Adolescent and Youth of Africa (NAYA), Mahakama Kuu jijini Nairobi iliamua kwamba kutumia Sheria ya Makosa ya Ngono kuwashtaki vijana wa umri unaokaribiana walio katika uhusiano wa ridhaa, bila kulazimishwa, ni kinyume cha Katiba. Mahakama ilisimamisha kesi za jinai dhidi ya walalamishi, ikamwagiza Mkurugenzi wa Mashtaka ya Umma (DPP) kuchapisha miongozo ya kesi kama hizi, ikaiambia polisi ibadilishe jinsi wanavyokamata na kuchunguza, na ikaagiza idara za serikali kuhakikisha vijana wanapata huduma za afya ya uzazi bila hofu.',
 'Umri wa ridhaa bado ni miaka 18 — uamuzi huu haukuubadilisha. Unamaanisha kwamba vijana wawili wa umri unaokaribiana, katika uhusiano ambao hakuna aliyelazimishwa, kushinikizwa, kulipwa au kudhulumiwa, wanastahili msaada na mwongozo, si kesi ya jinai. HAUMLINDI mtu mzima anayefanya ngono na mtu aliye chini ya miaka 18, wala yeyote anayetumia nguvu, vitisho, pesa au mamlaka — hilo bado ni kosa kubwa. Pia una haki ya kupata uzazi wa mpango, kupima VVU na huduma nyingine za afya ya uzazi.',
 'Uamuzi wa Mahakama Kuu, Mei 2026. Unaweza kukatiwa rufaa, na tutasasisha hapa ikiwa hivyo.',
 'Mtu akikushinikiza au kukudhuru, piga Childline 116 au simu ya ukatili wa kijinsia 1195 — zote ni bure.',
 '[{"label":"Center for Reproductive Rights","url":"https://reproductiverights.org/cases/decriminalizing-consensual-adolescent-relationships-kenya/"}]',
 true),

-- 2. Age of consent
('age-of-consent', 'en', 'law',
 'The age of consent in Kenya is still 18',
 '2026-10-01', 'As of October 2026',
 'Under the Sexual Offences Act (2006), a person under 18 cannot legally agree to sex. Over the years some judges and commentators have called for a debate about the age, and there were proposals to lower it to 16, but Parliament has not changed the law.',
 'The legal age of consent is 18. The May 2026 court ruling changed how consensual relationships between close-in-age teens should be handled — it did not change the age. Only Parliament can do that.',
 'In force. No change has been passed.',
 null,
 '[{"label":"Kenya Law — POO (a minor) v DPP (2017)","url":"https://new.kenyalaw.org/akn/ke/judgment/kehc/2017/8341/eng@2017-08-17"}]',
 false),
('age-of-consent', 'sw', 'law',
 'Umri wa ridhaa nchini Kenya bado ni miaka 18',
 '2026-10-01', 'Hadi Oktoba 2026',
 'Chini ya Sheria ya Makosa ya Ngono (2006), mtu aliye chini ya miaka 18 hawezi kukubali ngono kisheria. Kwa miaka kadhaa baadhi ya majaji na wachambuzi wametaka mjadala kuhusu umri huu, na kulikuwa na mapendekezo ya kuushusha hadi 16, lakini Bunge halijabadilisha sheria.',
 'Umri wa ridhaa kisheria ni miaka 18. Uamuzi wa mahakama wa Mei 2026 ulibadilisha jinsi mahusiano ya ridhaa kati ya vijana wa umri unaokaribiana yanavyoshughulikiwa — haukubadilisha umri. Ni Bunge pekee linaloweza kufanya hivyo.',
 'Inatumika. Hakuna mabadiliko yaliyopitishwa.',
 null,
 '[{"label":"Kenya Law — POO v DPP (2017)","url":"https://new.kenyalaw.org/akn/ke/judgment/kehc/2017/8341/eng@2017-08-17"}]',
 false),

-- 3. Abortion — Court of Appeal 2026
('abortion-coa-2026', 'en', 'ruling',
 'Court of Appeal overturns 2022 ruling that called abortion a right',
 '2026-04-24', '24 April 2026',
 'The Court of Appeal at Malindi set aside a March 2022 High Court judgment that had described abortion care as a fundamental right. The judges held that the Constitution protects life from conception and that abortion is allowed only in narrow situations: where, in the opinion of a trained health professional, emergency treatment is needed, or the life or health of the mother is in danger, or another written law allows it. The Center for Reproductive Rights has appealed to the Supreme Court.',
 'Abortion in Kenya is legal only in the limited situations set out in the Constitution. Treatment for complications after a miscarriage or abortion (post-abortion care) is emergency care, and you have the right to receive it. If you are pregnant and unsure what to do, a trained health worker at a youth-friendly clinic can give you confidential, accurate information.',
 'Court of Appeal judgment in force; appeal filed at the Supreme Court (June 2026).',
 'Feeling alone with a pregnancy? Call One2One on 1190 (free) to talk it through confidentially.',
 '[{"label":"JURIST — Kenya dispatch","url":"https://www.jurist.org/news/2026/04/kenya-dispatch-court-of-appeal-overturns-2022-high-court-abortion-ruling/"},{"label":"Center for Reproductive Rights — case timeline","url":"https://reproductiverights.org/cases/enforcing-kenya-constitutional-protections-abortion/"}]',
 false),
('abortion-coa-2026', 'sw', 'ruling',
 'Mahakama ya Rufaa yabatilisha uamuzi wa 2022 ulioita uavyaji mimba haki',
 '2026-04-24', '24 Aprili 2026',
 'Mahakama ya Rufaa mjini Malindi ilibatilisha uamuzi wa Mahakama Kuu wa Machi 2022 uliokuwa umeeleza huduma ya uavyaji mimba kuwa haki ya msingi. Majaji walisema Katiba inalinda uhai tangu kutungwa kwa mimba, na kwamba uavyaji mimba unaruhusiwa tu katika hali finyu: pale, kwa maoni ya mtaalamu wa afya aliyefunzwa, kuna haja ya matibabu ya dharura, au maisha au afya ya mama iko hatarini, au sheria nyingine iliyoandikwa inaruhusu. Center for Reproductive Rights imekata rufaa katika Mahakama ya Juu.',
 'Uavyaji mimba nchini Kenya ni halali tu katika hali chache zilizowekwa na Katiba. Matibabu ya matatizo baada ya mimba kuharibika au kutolewa ni huduma ya dharura, na una haki ya kuipata. Ikiwa una mimba na hujui la kufanya, mhudumu wa afya aliyefunzwa katika kliniki rafiki kwa vijana anaweza kukupa taarifa sahihi kwa siri.',
 'Uamuzi wa Mahakama ya Rufaa unatumika; rufaa imewasilishwa Mahakama ya Juu (Juni 2026).',
 'Unahisi uko peke yako na mimba? Piga One2One 1190 (bure) uzungumze kwa siri.',
 '[{"label":"Center for Reproductive Rights","url":"https://reproductiverights.org/cases/enforcing-kenya-constitutional-protections-abortion/"}]',
 false),

-- 4. Minimum sentences
('min-sentences-2024', 'en', 'ruling',
 'Supreme Court: minimum sentences for sexual offences still apply',
 '2024-07-12', '12 July 2024',
 'In Republic v Joshua Gichuki Mwangi, the Supreme Court set aside a 2022 Court of Appeal decision that had found the minimum prison terms in the Sexual Offences Act unconstitutional. The Supreme Court confirmed that the minimum sentences stand until Parliament changes them. A new challenge to the sentencing rules was filed at the High Court in 2026 and is still pending.',
 'Offences like rape and defilement still carry minimum prison terms set by law, and judges must apply them. Survivors can report and get justice — and get medical care first: PEP to prevent HIV and emergency contraception work best within 72 hours.',
 'In force (Supreme Court). A new High Court challenge (2026) is pending.',
 'After sexual violence: go to a clinic within 72 hours. Call 1195 (GBV) or 116 (Childline), free.',
 '[{"label":"KELIN — Supreme Court judgment","url":"https://www.kelinkenya.org/judgment-on-constitutionality-of-minimum-sentencing-for-sexual-offences-by-the-supreme-court-of-kenya/"}]',
 false),
('min-sentences-2024', 'sw', 'ruling',
 'Mahakama ya Juu: vifungo vya chini kwa makosa ya ngono bado vinatumika',
 '2024-07-12', '12 Julai 2024',
 'Katika kesi ya Republic v Joshua Gichuki Mwangi, Mahakama ya Juu ilibatilisha uamuzi wa Mahakama ya Rufaa wa 2022 uliosema vifungo vya chini katika Sheria ya Makosa ya Ngono ni kinyume cha Katiba. Mahakama ya Juu ilithibitisha kwamba vifungo hivyo vinabaki hadi Bunge livibadilishe. Changamoto mpya ilifunguliwa Mahakama Kuu mwaka 2026 na bado inasubiriwa.',
 'Makosa kama ubakaji na unajisi bado yana vifungo vya chini vilivyowekwa na sheria, na majaji lazima wavitumie. Waathiriwa wanaweza kuripoti na kupata haki — na kupata matibabu kwanza: PEP ya kuzuia VVU na vidonge vya dharura hufanya kazi vizuri zaidi ndani ya saa 72.',
 'Inatumika (Mahakama ya Juu). Changamoto mpya Mahakama Kuu (2026) inasubiriwa.',
 'Baada ya ukatili wa kingono: nenda kliniki ndani ya saa 72. Piga 1195 au 116, bure.',
 '[{"label":"KELIN","url":"https://www.kelinkenya.org/judgment-on-constitutionality-of-minimum-sentencing-for-sexual-offences-by-the-supreme-court-of-kenya/"}]',
 false),

-- 5. Lenacapavir
('lenacapavir-2026', 'en', 'method',
 'New: an HIV prevention injection you get just twice a year',
 '2026-02-26', '26 February 2026',
 'Kenya began rolling out lenacapavir, an injectable PrEP given once every six months, on 26 February 2026 in 15 high-burden counties, with two more phases planned to reach all 47 counties. The World Health Organization recommended it in July 2025.',
 'It is another way to prevent HIV if you don’t want to take a pill every day. You need a negative HIV test first. It prevents HIV only — not pregnancy or other STIs — so condoms still matter. Ask at a public health facility or youth-friendly clinic whether it is available in your county and who is eligible.',
 'Being rolled out in phases from February 2026. Check: cost and minimum age with your clinic.',
 null,
 '[{"label":"Citizen Digital — rollout","url":"https://www.citizen.digital/article/kenya-expands-hiv-prevention-options-as-lenacapavir-rollout-begins-thursday-n377958"},{"label":"WHO recommendation (July 2025)","url":"https://who.int/news/item/14-07-2025-who-recommends-injectable-lenacapavir-for-hiv-prevention"}]',
 true),
('lenacapavir-2026', 'sw', 'method',
 'Mpya: sindano ya kuzuia VVU unayopata mara mbili tu kwa mwaka',
 '2026-02-26', '26 Februari 2026',
 'Kenya ilianza kutoa lenacapavir, PrEP ya sindano inayotolewa mara moja kila miezi sita, tarehe 26 Februari 2026 katika kaunti 15 zenye maambukizi mengi, na awamu mbili zaidi zimepangwa kufikia kaunti zote 47. Shirika la Afya Duniani (WHO) liliipendekeza Julai 2025.',
 'Ni njia nyingine ya kuzuia VVU ikiwa hutaki kumeza kidonge kila siku. Lazima upime na uwe huna VVU kwanza. Inazuia VVU pekee — si mimba wala magonjwa mengine ya zinaa — kwa hivyo kondomu bado ni muhimu. Uliza katika kituo cha afya cha umma au kliniki rafiki kwa vijana kama inapatikana katika kaunti yako na nani anastahili.',
 'Inatolewa kwa awamu tangu Februari 2026.',
 null,
 '[{"label":"WHO","url":"https://who.int/news/item/14-07-2025-who-recommends-injectable-lenacapavir-for-hiv-prevention"}]',
 true),

-- 6. HPV single dose
('hpv-single-dose-2025', 'en', 'policy',
 'One free HPV jab now protects girls aged 10–14',
 '2025-10-22', '22 October 2025',
 'The Ministry of Health moved from two doses to a single dose of the HPV vaccine, following WHO advice that one dose gives strong protection. The vaccine protects against the virus that causes most cervical cancer and is free in public facilities for girls aged 10 to 14.',
 'If you are a girl aged 10–14, one free jab is enough. The HPV vaccine is safe and does not cause infertility — that is a myth. If you are older, ask a health worker about your options, and remember that regular cervical screening matters later in life.',
 'In force.',
 null,
 '[{"label":"The Star","url":"https://www.the-star.co.ke/news/2025-10-22-kenya-switches-to-single-dose-hpv-vaccine-to-boost-uptake"},{"label":"WHO Africa","url":"https://www.afro.who.int/photo-story/cervical-cancer-elimination-kenya-transitions-single-dose-hpv-vaccination-schedule"}]',
 false),
('hpv-single-dose-2025', 'sw', 'policy',
 'Sindano moja ya bure ya HPV sasa inawalinda wasichana wa miaka 10–14',
 '2025-10-22', '22 Oktoba 2025',
 'Wizara ya Afya ilibadilisha kutoka dozi mbili hadi dozi moja ya chanjo ya HPV, kufuatia ushauri wa WHO kwamba dozi moja inatoa kinga imara. Chanjo hii inakinga dhidi ya virusi vinavyosababisha saratani nyingi za shingo ya kizazi, na ni bure katika vituo vya umma kwa wasichana wa miaka 10 hadi 14.',
 'Ikiwa wewe ni msichana wa miaka 10–14, sindano moja ya bure inatosha. Chanjo ya HPV ni salama na haisababishi utasa — huo ni uongo. Ikiwa umezidi umri huo, muulize mhudumu wa afya kuhusu chaguo zako, na kumbuka kwamba uchunguzi wa shingo ya kizazi ni muhimu baadaye maishani.',
 'Inatumika.',
 null,
 '[{"label":"WHO Africa","url":"https://www.afro.who.int/photo-story/cervical-cancer-elimination-kenya-transitions-single-dose-hpv-vaccination-schedule"}]',
 false),

-- 7. GBV & femicide working group
('gbv-femicide-report', 'en', 'policy',
 'Government report on GBV and femicide: what it found',
 '2026-01-27', 'Released January 2026',
 'After the #EndFemicideKE protests, the President set up a Technical Working Group on Gender-Based Violence including Femicide, chaired by former Deputy Chief Justice Nancy Baraza. Its report found that most women killed were killed by someone they knew, often a partner. It recommended declaring femicide a national crisis, making femicide its own crime in the Penal Code, and funding GBV services properly.',
 'Violence by a partner is the biggest danger the report found. Controlling behaviour, threats and violence in a relationship are warning signs — you deserve to be safe. Most of the recommendations are not yet law, but help is available now.',
 'Report released; most recommendations not yet implemented. Femicide is not yet a separate offence.',
 'In danger? Call 1195 (GBV, free, 24h) or 116 (Childline), or go to a police gender desk.',
 '[{"label":"Report (Ministry of Gender)","url":"https://gender.go.ke/sites/default/files/publications/REPORT%20OF%20THE%20TECHNICAL%20WORKING%20GROUP%20ON%20GENDER-BASED%20VIOLENCE%20(GBV)%20INCLUDING%20FEMICIDE.pdf"},{"label":"The Star","url":"https://www.the-star.co.ke/news/2026-02-27-amnesty-kenya-urges-gender-ministry-to-act-on-gbv-taskforce-report"}]',
 false),
('gbv-femicide-report', 'sw', 'policy',
 'Ripoti ya serikali kuhusu ukatili wa kijinsia na mauaji ya wanawake: ilichogundua',
 '2026-01-27', 'Ilitolewa Januari 2026',
 'Baada ya maandamano ya #EndFemicideKE, Rais aliunda Kikundi Kazi cha Kiufundi kuhusu Ukatili wa Kijinsia ikiwemo Mauaji ya Wanawake, kikiongozwa na aliyekuwa Naibu Jaji Mkuu Nancy Baraza. Ripoti yake ilibaini kwamba wanawake wengi waliouawa waliuawa na mtu waliyemjua, mara nyingi mpenzi. Ilipendekeza mauaji ya wanawake yatangazwe kuwa janga la kitaifa, yawe kosa la pekee katika Kanuni ya Adhabu, na huduma za ukatili wa kijinsia zipewe fedha za kutosha.',
 'Ukatili kutoka kwa mpenzi ndio hatari kubwa zaidi iliyogunduliwa. Tabia ya kudhibiti, vitisho na ukatili katika uhusiano ni dalili za hatari — unastahili kuwa salama. Mapendekezo mengi bado si sheria, lakini msaada upo sasa.',
 'Ripoti imetolewa; mapendekezo mengi bado hayajatekelezwa.',
 'Uko hatarini? Piga 1195 (bure, saa 24) au 116, au nenda dawati la jinsia katika kituo cha polisi.',
 '[{"label":"Ripoti (Wizara ya Jinsia)","url":"https://gender.go.ke/sites/default/files/publications/REPORT%20OF%20THE%20TECHNICAL%20WORKING%20GROUP%20ON%20GENDER-BASED%20VIOLENCE%20(GBV)%20INCLUDING%20FEMICIDE.pdf"}]',
 false),

-- 8. School re-entry
('school-reentry', 'en', 'policy',
 'Pregnant or a young parent? You have the right to stay in school',
 '2020-01-01', 'Guidelines from 2020 — still current',
 'The Ministry of Education’s National Guidelines for School Re-entry (2020) say learners who become pregnant must be allowed to stay in or return to school, and can move to another school with help from the head teacher and the sub-county education office. Reporting in 2026 found many schools still don’t follow them well.',
 'A school should not send you away because you are pregnant or have a baby — and that applies to young fathers too. If a school refuses, the sub-county education office can help you go back or move schools.',
 'In force (2020 guidelines). No newer national policy found.',
 null,
 '[{"label":"Ministry of Education — re-entry guidelines (PDF)","url":"https://www.education.go.ke/sites/default/files/2022-05/2020RH_NationalSchoolReEntryGuidelines.pdf"}]',
 false),
('school-reentry', 'sw', 'policy',
 'Una mimba au ni mzazi kijana? Una haki ya kuendelea na shule',
 '2020-01-01', 'Miongozo ya 2020 — bado inatumika',
 'Miongozo ya Kitaifa ya Kurejea Shuleni ya Wizara ya Elimu (2020) inasema wanafunzi wanaopata mimba lazima waruhusiwe kubaki au kurudi shuleni, na wanaweza kuhamia shule nyingine kwa msaada wa mwalimu mkuu na ofisi ya elimu ya kaunti ndogo. Ripoti za 2026 zilionyesha shule nyingi bado hazifuati miongozo hii ipasavyo.',
 'Shule haipaswi kukufukuza kwa sababu una mimba au mtoto — na hilo linawahusu pia akina baba vijana. Shule ikikataa, ofisi ya elimu ya kaunti ndogo inaweza kukusaidia kurudi au kuhamia shule nyingine.',
 'Inatumika (miongozo ya 2020).',
 null,
 '[{"label":"Wizara ya Elimu (PDF)","url":"https://www.education.go.ke/sites/default/files/2022-05/2020RH_NationalSchoolReEntryGuidelines.pdf"}]',
 false),

-- 9. Children Act 2022
('children-act-2022', 'en', 'law',
 'Children Act 2022: stronger protection for everyone under 18',
 '2022-07-26', '26 July 2022',
 'The Children Act 2022 replaced the 2001 law. It raised the minimum age of criminal responsibility from 8 to 12, encourages keeping children out of court for minor offences, and strengthens protection from abuse, child marriage, FGM and other harmful practices.',
 'Everyone under 18 is a child under the law, with the right to be protected from abuse and exploitation and to be treated in a child-friendly way by police and courts.',
 'In force.',
 'Being abused or forced into marriage? Call Childline 116 (free, 24h).',
 '[{"label":"The Star","url":"https://www.the-star.co.ke/news/2022-07-26-children-act-2022-takes-effect-today"}]',
 false),
('children-act-2022', 'sw', 'law',
 'Sheria ya Watoto 2022: ulinzi zaidi kwa kila aliye chini ya miaka 18',
 '2022-07-26', '26 Julai 2022',
 'Sheria ya Watoto 2022 ilichukua nafasi ya sheria ya 2001. Iliongeza umri wa chini wa kuwajibika kijinai kutoka miaka 8 hadi 12, inahimiza watoto wasipelekwe mahakamani kwa makosa madogo, na inaimarisha ulinzi dhidi ya unyanyasaji, ndoa za utotoni, ukeketaji na mila nyingine zenye madhara.',
 'Kila aliye chini ya miaka 18 ni mtoto kisheria, mwenye haki ya kulindwa dhidi ya unyanyasaji na unyonyaji na kuhudumiwa kwa njia rafiki kwa mtoto na polisi na mahakama.',
 'Inatumika.',
 'Unanyanyaswa au kulazimishwa kuolewa? Piga Childline 116 (bure, saa 24).',
 '[{"label":"The Star","url":"https://www.the-star.co.ke/news/2022-07-26-children-act-2022-takes-effect-today"}]',
 false),

-- 10. Post-rape care / JMM
('jmm-ruling-2019', 'en', 'ruling',
 'Survivors of sexual violence have a right to urgent medical care',
 '2019-06-12', '12 June 2019 (appeal still pending)',
 'In the JMM case — about a 14-year-old survivor of sexual violence who died after an unsafe abortion — the High Court ruled that the Ministry of Health’s withdrawal of national guidelines and training on reducing deaths from unsafe abortion was unlawful. The ruling was appealed to the Court of Appeal, which has not yet given its decision.',
 'After rape or defilement, go to a clinic as soon as possible: PEP to prevent HIV and emergency contraception work best within 72 hours, and you can also get treatment, counselling and a P3/PRC form for reporting. Care should be confidential and free at public facilities and specialist clinics.',
 'High Court ruling stands while the appeal is undecided.',
 'Content note: mentions sexual violence. Help: 1195 (GBV), 116 (Childline), MSF Lavender House 0800 721 100 — all free.',
 '[{"label":"Kenya Law — 2019 judgment","url":"https://new.kenyalaw.org/akn/ke/judgment/kehc/2019/6928/eng@2019-06-12"},{"label":"FIDA Kenya — appeal brief","url":"https://fidakenya.org/2025/02/18/media-brief-the-court-of-appeal-case-no-594-of-2019-kenya-christian-professional-forum-v-federation-of/"}]',
 false),
('jmm-ruling-2019', 'sw', 'ruling',
 'Waathiriwa wa ukatili wa kingono wana haki ya matibabu ya haraka',
 '2019-06-12', '12 Juni 2019 (rufaa bado inasubiriwa)',
 'Katika kesi ya JMM — kuhusu msichana wa miaka 14 aliyenusurika ukatili wa kingono na kufariki baada ya uavyaji mimba usio salama — Mahakama Kuu iliamua kwamba hatua ya Wizara ya Afya kuondoa miongozo na mafunzo ya kitaifa ya kupunguza vifo vinavyotokana na uavyaji mimba usio salama haikuwa halali. Uamuzi huo ulikatiwa rufaa, na Mahakama ya Rufaa bado haijatoa uamuzi.',
 'Baada ya ubakaji au unajisi, nenda kliniki haraka iwezekanavyo: PEP ya kuzuia VVU na vidonge vya dharura hufanya kazi vizuri zaidi ndani ya saa 72, na unaweza pia kupata matibabu, ushauri nasaha na fomu ya P3/PRC ya kuripoti. Huduma inapaswa kuwa ya siri na bure katika vituo vya umma na kliniki maalum.',
 'Uamuzi wa Mahakama Kuu unasimama wakati rufaa inasubiriwa.',
 'Tahadhari: inataja ukatili wa kingono. Msaada: 1195, 116, MSF Lavender House 0800 721 100 — bure.',
 '[{"label":"Kenya Law — uamuzi wa 2019","url":"https://new.kenyalaw.org/akn/ke/judgment/kehc/2019/6928/eng@2019-06-12"}]',
 false),

-- 11. LGBTQ — where the law stands
('lgbtq-law-status', 'en', 'ruling',
 'LGBTQ rights in Kenya: where the law stands',
 '2023-09-12', '2023 rulings — still current',
 'In February 2023 the Supreme Court ruled that refusing to register the National Gay and Lesbian Human Rights Commission was unconstitutional, because the right to form associations cannot be limited because of sexual orientation; it rejected a request to review that ruling in September 2023. Separately, the Family Protection Bill proposed in 2023 has not been passed by Parliament.',
 'The ruling protects the right to form and register organisations. It did not change the Penal Code sections that criminalise same-sex sexual acts, which are still being challenged in court. The Family Protection Bill is a proposal, not a law. Everyone has the right to health care without discrimination.',
 'Supreme Court ruling final. Penal Code sections still in force. Family Protection Bill not passed (as of September 2026).',
 null,
 '[{"label":"Nation — Supreme Court reaffirms ruling","url":"https://nation.africa/kenya/news/supreme-court-reaffirms-lgbtq-right-to-associate-4366506"},{"label":"Human Dignity Trust — Kenya","url":"https://www.humandignitytrust.org/country-profile/kenya/"}]',
 false),
('lgbtq-law-status', 'sw', 'ruling',
 'Haki za LGBTQ nchini Kenya: msimamo wa sheria',
 '2023-09-12', 'Maamuzi ya 2023 — bado yanatumika',
 'Februari 2023 Mahakama ya Juu iliamua kwamba kukataa kusajili National Gay and Lesbian Human Rights Commission kulikuwa kinyume cha Katiba, kwa sababu haki ya kuunda vyama haiwezi kuzuiwa kwa misingi ya mwelekeo wa kimapenzi; ilikataa ombi la kupitia upya uamuzi huo Septemba 2023. Kando na hilo, Mswada wa Ulinzi wa Familia uliopendekezwa 2023 haujapitishwa na Bunge.',
 'Uamuzi huo unalinda haki ya kuunda na kusajili mashirika. Haukubadilisha vifungu vya Kanuni ya Adhabu vinavyoharamisha vitendo vya ngono vya jinsia moja, ambavyo bado vinapingwa mahakamani. Mswada wa Ulinzi wa Familia ni pendekezo, si sheria. Kila mtu ana haki ya huduma za afya bila ubaguzi.',
 'Uamuzi wa Mahakama ya Juu ni wa mwisho. Vifungu vya Kanuni ya Adhabu bado vinatumika. Mswada haujapitishwa (hadi Septemba 2026).',
 null,
 '[{"label":"Human Dignity Trust","url":"https://www.humandignitytrust.org/country-profile/kenya/"}]',
 false)
on conflict (group_key, language) do nothing;
