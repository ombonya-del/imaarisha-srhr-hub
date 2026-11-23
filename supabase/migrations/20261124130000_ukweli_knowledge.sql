-- ════════════════════════════════════════════════════════════════════════════
-- UkweliSRHR — "Quick answers" knowledge base (Nov 2026)
-- A vetted library the instant-answer panel searches alongside myth cards and
-- already-answered questions. Nothing here is generated: every entry is written
-- or approved by the health team and shown under the Nurse Charity byline, with
-- an optional external source (WHO / NASCOP / MoH) and link.
-- Everything is seeded ACTIVE = false — nothing shows to youth until the health
-- (and where relevant, legal) lead flips it on after review.
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.ukweli_knowledge (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  topic       text,
  question    text not null,
  keywords    text[] not null default '{}',
  answer      text not null,
  byline      text not null default 'Nurse Charity',
  source      text,                 -- e.g. 'WHO', 'NASCOP', 'Kenya MoH'
  source_url  text,
  language    text not null default 'en',
  sort_order  int not null default 0,
  sensitive   boolean not null default false,  -- needs legal sign-off too
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
 array['normal','labia','penis size','how it looks','down there','weird','ugly'],
 $q$Bodies vary a lot — there's a huge normal range in how vulvas, labia and penises look, and no single "right" way. What you see in porn or ads is often filtered, edited or even surgically changed. If something is painful, itchy, smells off or changes suddenly, that's worth a check-up — but simply looking "different" is not a problem.$q$,
 'WHO','https://www.who.int/health-topics/sexual-health',false,10),

('masturbation-safe','masturbation',$q$Will masturbation harm me?$q$,
 array['masturbation','masturbate','touch myself','solo','self pleasure'],
 $q$No. Masturbation is common and safe — it doesn't cause blindness, infertility, weakness, acne or any physical harm, and most people do it at some point. It's one way to learn what feels good for your own body. The only reason to ease off is if it starts getting in the way of your day or feels out of your control.$q$,
 'WHO','https://www.who.int/health-topics/sexual-health',false,20),

('sexual-feelings-normal','sexual-feelings',$q$Is it normal to feel turned on a lot?$q$,
 array['horny','aroused','urges','sexual feelings','turned on','desire'],
 $q$Yes — strong sexual feelings are a normal part of growing up, and they come and go. Feelings are not actions: you are always in charge of what you choose to do with them. There is nothing dirty or shameful about noticing attraction or arousal.$q$,
 null,null,false,30),

('same-sex-feelings','identity',$q$I have feelings for someone of the same sex — is something wrong with me?$q$,
 array['gay','lesbian','same sex','attracted to same','bisexual','queer','like girls','like boys'],
 $q$No — there is nothing wrong with you. Feeling attraction to the same sex, to more than one sex, or being unsure is part of the natural range of human feelings, and you are far from alone. You don't have to label yourself or decide anything right now. Whatever you feel, you deserve to be safe and treated with respect.$q$,
 null,null,true,40),

('gender-identity','identity',$q$What if I don't feel fully like a boy or a girl?$q$,
 array['gender','trans','transgender','nonbinary','identity','boy or girl','who i am'],
 $q$Gender is about how you feel inside, and for some people that doesn't fit neatly into "boy" or "girl" — that's a real and recognised experience. There's no rush to figure it all out, and your feelings are valid. If this is weighing on you, talking to someone you trust or a youth-friendly counsellor can help.$q$,
 null,null,true,50),

('sharing-toys','safer-sex',$q$Is it safe to share sex toys or strap-ons?$q$,
 array['sex toy','strap on','strap-on','dildo','vibrator','sharing toys'],
 $q$Sharing toys can pass STIs and infections like bacterial vaginosis from one person to another through fluids. To stay safer: put a fresh condom on the toy for each person and change it between users, wash the toy with warm soapy water between uses, and never move a toy from the anus to the vagina without cleaning it and using a new condom first.$q$,
 'WHO','https://www.who.int/health-topics/sexually-transmitted-infections',true,60),

('drugs-and-sex','harm-reduction',$q$Is it risky to mix alcohol or drugs with sex?$q$,
 array['drunk','high','drugs','alcohol','weed','chemsex','party'],
 $q$It can be. Being drunk or high clouds judgment, makes it harder to use protection, and makes real consent impossible — if someone is too intoxicated, they cannot agree to sex. Some drug-and-sex combinations are also physically dangerous. If you do drink, remember you can always stop, and you never owe anyone sex.$q$,
 null,null,false,70),

('anal-sex-safety','safer-sex',$q$Is anal sex safe?$q$,
 array['anal','anal sex','backdoor'],
 $q$Anal sex carries a higher risk of HIV and other STIs than many other kinds of sex because the lining tears easily — so a condom plus plenty of water- or silicone-based lube matters a lot. Go slowly, stop if it hurts, and you don't need to "clean out" inside. Use a fresh condom before switching to vaginal sex.$q$,
 'NASCOP','https://www.nascop.or.ke',true,80),

('what-is-consent','consent',$q$What actually counts as consent?$q$,
 array['consent','pressure','force','yes','no means no'],
 $q$Consent is a clear, freely given yes — enthusiastic, sober, and something you can take back at any point. Silence, being pressured, or being asleep, drunk or high is not consent. It is needed every time, even with a regular partner, and for each thing you do together.$q$,
 null,null,false,90),

('after-unprotected-sex','emergency',$q$I had unprotected sex — what can I do now?$q$,
 array['unprotected','condom broke','morning after','emergency','pep','plan b','prevent pregnancy'],
 $q$You have options, but timing matters. Emergency contraception (the "morning-after" pill) can prevent pregnancy up to 72–120 hours after sex — the sooner the better. To prevent HIV, PEP must be started within 72 hours, so go to a clinic or pharmacy as soon as you can. A clinic can also check for other STIs.$q$,
 'NASCOP','https://www.nascop.or.ke',false,100),

('protect-from-hiv','hiv',$q$How do I protect myself from HIV?$q$,
 array['hiv','prep','protect','aids','prevent hiv'],
 $q$Condoms used correctly every time are very effective, and PrEP — a daily pill — can also stop HIV before exposure if you are at higher risk. Get tested so you know your status; it's quick, free and confidential at youth-friendly clinics. And someone living with HIV who is on treatment with an undetectable viral load cannot pass it on sexually (U=U).$q$,
 'NASCOP','https://www.nascop.or.ke',false,110),

('am-i-pregnant','pregnancy',$q$How do I know if I'm pregnant?$q$,
 array['pregnant','missed period','pregnancy test','late period'],
 $q$The most common early sign is a missed period, sometimes with nausea, sore breasts or tiredness — but these can have other causes too. A urine pregnancy test, from a pharmacy or clinic, is the only way to be sure, and it's most accurate from the day your period is due. A youth-friendly clinic can support you with whatever the result is.$q$,
 null,null,false,120),

('porn-vs-reality','media',$q$Is real sex like what I see in porn?$q$,
 array['porn','pornography','realistic','xvideos','is sex like'],
 $q$No. Porn is performance — edited, acted, and often shaped by surgery, lighting and camera tricks. Real bodies, stamina, sounds and timing are nothing like it. Treating porn as a how-to guide leads to a lot of worry and pressure about things that were never real.$q$,
 null,null,false,130),

('pressured-for-nudes','safety',$q$Someone keeps pressuring me to send nudes.$q$,
 array['nudes','nude','sexting','send pics','pictures','sextortion'],
 $q$You never owe anyone a photo, and real respect means taking "no" the first time. Once an image is sent you can't control where it goes. Anyone pressuring or threatening you to get images (that's sextortion) is in the wrong — not you. If this is happening, talk to an adult you trust, and you can report it.$q$,
 null,null,false,140)
on conflict (slug) do nothing;
