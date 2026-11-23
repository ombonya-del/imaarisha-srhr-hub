-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — "Quick answers" knowledge base (Nov 2026)
-- Vetted library the instant-answer panel searches alongside myth cards and
-- answered questions. Nothing is AI-generated; the health team writes/approves
-- every word. Shown under the Nurse Charity byline with an optional source.
-- Seeded ACTIVE = false; nothing shows to youth until reviewed and flipped on.
-- Re-running this UPDATES the answer text (upsert) but preserves each row's
-- active/sensitive review state. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ukweli_knowledge (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  topic       text,
  question    text not null,
  keywords    text[] not null default '{}',
  answer      text not null,
  byline      text not null default 'Nurse Charity',
  source      text,
  source_url  text,
  language    text not null default 'en',
  sort_order  int not null default 0,
  sensitive   boolean not null default false,
  active      boolean not null default false,
  reviewed_by text,
  created_at  timestamptz not null default now()
);
create index if not exists ukweli_knowledge_active_idx on public.ukweli_knowledge (active, language);
alter table public.ukweli_knowledge enable row level security;

drop policy if exists ukweli_knowledge_public_read on public.ukweli_knowledge;
create policy ukweli_knowledge_public_read on public.ukweli_knowledge for select to anon, authenticated
  using (active = true);
drop policy if exists ukweli_knowledge_admin_all on public.ukweli_knowledge;
create policy ukweli_knowledge_admin_all on public.ukweli_knowledge for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

insert into public.ukweli_knowledge (slug, topic, question, keywords, answer, source, source_url, sensitive, sort_order) values
('bodies-vary','body-image',$q$Is something wrong with how my private parts look?$q$,
 array['normal','labia','penis size','how it looks','down there','weird','ugly','small','big'],
 $q$There's no single "normal" — vulvas, labia, penises, breasts and skin tone come in a wide range of shapes, sizes and shades, and most of what looks "perfect" online is filtered, edited or surgically altered. Labia that hang lower or are uneven, one testicle lower than the other, a slightly curved penis, darker skin around the genitals, or breasts of different sizes are all common and healthy, and size when soft says little about erect size. What genuinely needs a check-up is a change you can feel or see — a new lump, sore, unusual discharge, a strong smell, itching or pain — because those can be easily-treated infections. WHAT TO DO: if something worries or changes, see a nurse at a youth-friendly clinic, ask right here on Ukweli, or call LVCT One2One free and anonymous on 1190. Looking different is not a defect — it's just a body, and almost everyone quietly fears theirs is strange when it isn't.$q$,
 'WHO','https://www.who.int/health-topics/sexual-health',false,10),

('masturbation-safe','masturbation',$q$Will masturbation harm me?$q$,
 array['masturbation','masturbate','touch myself','solo','self pleasure'],
 $q$No — masturbation is normal, common and medically harmless. It does not cause blindness, infertility, weakness, acne, "wasting energy" or any disease, carries zero risk of pregnancy or STIs, and can help you understand your own body, ease tension and sleep better. Doing it often is fine; there is no "too much" unless it's sore or crowding out school, friends or responsibilities, and privacy is about respect for others, not shame. WHAT TO DO: if it ever feels compulsive or like your only way to cope with stress, that's worth talking through — with a school counsellor, a trusted adult, or LVCT One2One (1190, free and anonymous). Whatever you were told to scare you, there is nothing dirty or damaging about it.$q$,
 'WHO','https://www.who.int/health-topics/sexual-health',false,20),

('sexual-feelings-normal','sexual-feelings',$q$Is it normal to feel turned on a lot?$q$,
 array['horny','aroused','urges','sexual feelings','turned on','desire'],
 $q$Feeling attraction, arousal, curiosity or strong urges — sometimes out of nowhere — is a normal part of puberty, driven by hormones and completely human. These feelings rise and fade, can be about people you'd never act on, and don't make you bad or dirty. The key thing is that feelings and actions are separate: you always choose what you do, when, and with whom — or to do nothing. WHAT TO DO: if the feelings ever feel overwhelming, confusing or hard to control, talk it through with a trusted adult, a school counsellor, or LVCT One2One (1190, free and anonymous), or ask here on Ukweli. There's no "right age" to feel this way and no shame in feeling it strongly or barely at all.$q$,
 null,null,false,30),

('same-sex-feelings','identity',$q$I have feelings for someone of the same sex — is something wrong with me?$q$,
 array['gay','lesbian','same sex','attracted to same','bisexual','queer','like girls','like boys'],
 $q$There is nothing wrong, broken or sinful about you — attraction to the same sex, to more than one sex, or being unsure is part of the natural range of human feeling that millions of people share. You don't have to label yourself, "prove" anything, come out, or decide anything right now; feelings can be clear or confusing and can shift over time, and that's okay. What you feel is real and valid even if people around you don't understand it. WHAT TO DO: choose carefully who you confide in, and for a private, non-judgmental space talk to a counsellor or call LVCT One2One (1190, free and anonymous). If anyone threatens, outs or harms you over it, that is not okay — reach Childline on 116 (free, 24/7, if you're under 18) or the GBV helpline on 1195. Whatever you feel, you are not alone and you deserve respect and safety.$q$,
 null,null,true,40),

('gender-identity','identity',$q$What if I don't feel fully like a boy or a girl?$q$,
 array['gender','trans','transgender','nonbinary','identity','boy or girl','who i am'],
 $q$Gender identity is your own inner sense of being a boy, a girl, both, neither, or somewhere in between — and for some people that doesn't match the sex they were assigned at birth, a real, long-recognised human experience, not a trend or an illness. You might feel it strongly or just be questioning, and either is okay; there's no timeline and nothing you must decide today, and it doesn't have to change how you live now unless you want it to. WHAT TO DO: because not everyone around you may understand, think about who is safe to talk to and go at your own pace; a youth-friendly counsellor — or LVCT One2One (1190, free and anonymous) — can give you a private, non-judgmental space to explore it. If you're being bullied or threatened, Childline 116 (under 18) and the GBV line 1195 can help. Your feelings are valid, whatever words you do or don't use.$q$,
 null,null,true,50),

('sharing-toys','safer-sex',$q$Is it safe to share sex toys or strap-ons?$q$,
 array['sex toy','strap on','strap-on','dildo','vibrator','sharing toys'],
 $q$Sharing sex toys can pass on STIs (herpes, HPV, gonorrhoea, chlamydia, hepatitis) and upset the balance that causes infections like bacterial vaginosis and thrush, because fluids stay on the toy. Safest is not to share; if you do, put a fresh condom on the toy and change it for each person, wash the toy with warm soapy water and let it dry between uses, and never move it from the anus to the vagina or mouth without cleaning it and changing the condom. Use plenty of water- or silicone-based lube to avoid tiny tears, and use body-safe (non-porous), undamaged toys. WHAT TO DO: if you've shared and are worried, get an STI check at a youth-friendly clinic, Marie Stopes Kenya (0800 720 005), or ask LVCT One2One (1190) — many STIs have no symptoms but are easily treated. The same rules — barriers, no shared fluids, cleaning in between — make every kind of sex safer.$q$,
 'WHO','https://www.who.int/health-topics/sexually-transmitted-infections',true,60),

('drugs-and-sex','harm-reduction',$q$Is it risky to mix alcohol or drugs with sex?$q$,
 array['drunk','high','drugs','alcohol','weed','chemsex','party'],
 $q$Mixing alcohol or drugs with sex raises real risks: being drunk or high blurs judgment, so people skip condoms, misread situations and regret things — and crucially, someone very drunk or high cannot give real consent, so sex with them is not okay, and that same rule protects you. Some combinations are physically dangerous (alcohol or certain drugs with erection pills, or mixing sedatives), and substances can make erection, orgasm or lubrication harder. HARM REDUCTION: if you drink or use, keep condoms on you, watch your own drink, stay with people you trust, agree limits beforehand, and remember you can stop or leave anytime. WHAT TO DO: if something happened while you were impaired — unprotected sex, or sex you didn't agree to — a clinic can give emergency contraception and PEP (within 72 hours); for assault call GBV 1195 or police 999, and to talk things through call One2One on 1190. You never owe anyone sex for buying you drinks or getting high with you.$q$,
 null,null,false,70),

('anal-sex-safety','safer-sex',$q$Is anal sex safe?$q$,
 array['anal','anal sex','backdoor'],
 $q$Anal sex can be made safer, but it carries the highest HIV and STI risk of the common types of sex, because the lining is thin and tears easily. To lower risk: always use a condom with plenty of water- or silicone-based lube (the area makes none of its own), go slowly, and stop if there's pain or bleeding; never go from anus to vagina without changing the condom, and don't douche — it irritates the lining and raises risk. A condom still matters because semen reaching the vagina later can cause pregnancy. WHAT TO DO: if you have anal sex, ask a youth-friendly clinic, VCT or NASCOP about PrEP and routine STI testing, or call One2One on 1190 — and if a condom broke, PEP within 72 hours can still prevent HIV. Going slow, lube and a condom are the three things that matter most.$q$,
 'NASCOP','https://www.nascop.or.ke',true,80),

('what-is-consent','consent',$q$What actually counts as consent?$q$,
 array['consent','pressure','force','yes','no means no','rape','defilement'],
 $q$Consent is a clear, freely given, enthusiastic "yes" — and it only counts when the person is sober enough, awake, old enough, and free from pressure, threats or fear. It's specific (yes to one thing isn't yes to all), ongoing (you can change your mind anytime, even midway), and needed every time, including with a partner or spouse. Silence, going along with it, or a "yes" squeezed out by guilt-tripping or "if you loved me" is not consent. YOUR RIGHTS: sex without consent is a crime in Kenya under the Sexual Offences Act 2006, and sex with anyone under 18 is defilement, regardless of "agreement". WHAT TO DO: if this has happened to you, it is not your fault — go to a clinic or hospital quickly (within 72 hours they can give PEP and emergency contraception and complete the medical/PRC and P3 forms used as evidence), call the GBV helpline 1195, Childline 116 if you're under 18, or the police on 999/112. Help and recourse exist, and reporting is your choice.$q$,
 null,null,false,90),

('after-unprotected-sex','emergency',$q$I had unprotected sex — what can I do now?$q$,
 array['unprotected','condom broke','morning after','emergency','pep','plan b','prevent pregnancy','p2','postinor'],
 $q$Act quickly — your options work best within hours. TO PREVENT PREGNANCY: emergency contraception (sold over the counter at any Kenyan pharmacy as P2, Postinor-2 or Ecee-2, no prescription) works best within 72 hours; some types and the copper IUD (fitted at a clinic) work up to 120 hours (5 days) — sooner is better. TO PREVENT HIV: PEP is a short course of pills that must start within 72 hours — go to a hospital, health centre or VCT and ask for it by name. WHERE TO GO: any pharmacy for EC; a VCT, hospital or Marie Stopes Kenya (0800 720 005) for PEP, EC and STI checks; or call LVCT One2One (1190) or NASCOP Ushauri (0800 724 848) to talk it through. If your period is later than usual, take a pregnancy test from about three weeks after. You don't need a parent's permission to ask, and youth-friendly clinics handle this daily without judgment.$q$,
 'NASCOP','https://www.nascop.or.ke',false,100),

('protect-from-hiv','hiv',$q$How do I protect myself from HIV?$q$,
 array['hiv','prep','protect','aids','prevent hiv','u=u','testing'],
 $q$You have several strong tools, and combining them works best. Condoms used correctly every time are very effective and also prevent other STIs and pregnancy. PrEP — a daily pill given free through NASCOP-supported clinics — can stop HIV before exposure if you're at higher risk (a partner living with HIV, or more than one partner). If you're exposed, PEP started within 72 hours can still prevent infection. And U=U: someone on HIV treatment with an undetectable viral load cannot pass it on sexually. WHERE TO GO: get free, confidential testing (or a self-test kit from a pharmacy) and ask about PrEP at any youth-friendly clinic or VCT; for questions call LVCT One2One (1190) or NASCOP Ushauri (0800 724 848). Knowing your status is quick and free, and it puts you in control.$q$,
 'NASCOP','https://www.nascop.or.ke',false,110),

('am-i-pregnant','pregnancy',$q$How do I know if I'm pregnant?$q$,
 array['pregnant','missed period','pregnancy test','late period'],
 $q$The commonest first sign is a missed or very late period, sometimes with tender breasts, nausea, tiredness, needing to pee more, or light spotting — but stress, illness and hormones cause these too, so symptoms alone don't confirm anything. The only reliable way to know is a test: urine kits are cheap at any Kenyan pharmacy and most accurate from the day your period is due (about three weeks after unprotected sex); use first-morning urine and, if negative but your period still doesn't come, test again in a week. WHAT TO DO: whatever the result, a youth-friendly clinic or Marie Stopes Kenya (0800 720 005) can talk you through your options privately and without judgment, and LVCT One2One (1190) is there to listen. You don't have to face it alone or decide anything on the spot.$q$,
 null,null,false,120),

('porn-vs-reality','media',$q$Is real sex like what I see in porn?$q$,
 array['porn','pornography','realistic','xvideos','is sex like','how to','real info'],
 $q$No — porn is produced entertainment, not a documentary. Performers are cast for looks, scenes are scripted, lit and edited, bodies are often surgically altered, and the "stamina" is really cuts, breaks and sometimes medication. Real sex is slower, more awkward, quieter and more varied — ordinary bodies, not everyone finishes, erection and lubrication aren't on demand, and the consent and communication porn skips are what actually make it good. Treating it as a how-to guide fuels needless anxiety about size, performance and timing, and can push people to pressure partners. WHERE TO GET THE REAL THING: for accurate, shame-free information about bodies, sex, consent and relationships, ask here on Ukweli, talk to a nurse or counsellor at a youth-friendly clinic, or call LVCT One2One free and anonymous on 1190; trusted written sources include the WHO sexual-health pages. Be wary of random social-media "experts" — a real clinic or helpline won't judge you and won't lie to you.$q$,
 null,null,false,130),

('pressured-for-nudes','safety',$q$Someone keeps pressuring me to send nudes.$q$,
 array['nudes','nude','sexting','send pics','pictures','sextortion','report','blackmail'],
 $q$You never owe anyone a photo — not a partner, not someone older, not someone promising love, money or secrecy — and real respect means hearing "no" the first time. Once an image leaves your phone you lose all control of it, including on "disappearing" apps. IT IS A CRIME: pressuring, threatening or sharing someone's intimate images in Kenya is an offence under the Computer Misuse and Cybercrimes Act 2018, and where a child is involved it also falls under the Sexual Offences Act 2006 and the Children Act — the person doing it is in the wrong, not you, even if you sent something earlier. WHAT TO DO: don't send more and don't pay (paying only brings more demands); instead save screenshots as evidence, block them, and report — call Childline 116 (free, 24/7, if you're under 18), or report at any police station or to the DCI (Directorate of Criminal Investigations) cybercrime unit; for support call the GBV helpline 1195. You have the right to say no and the right to get help.$q$,
 null,null,false,140)
on conflict (slug) do update set
  answer = excluded.answer, keywords = excluded.keywords,
  question = excluded.question, source = excluded.source, source_url = excluded.source_url;
