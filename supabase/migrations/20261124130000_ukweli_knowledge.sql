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
 $q$There's no single "normal" — vulvas, labia, penises, breasts and skin tone come in a wide range of shapes, sizes and shades, and most of what looks "perfect" online is filtered, edited or surgically altered. Labia that hang lower or are uneven, one testicle sitting lower than the other, a slightly curved penis, darker skin around the genitals, or breasts of different sizes are all common and healthy. How big a penis looks soft says little about erect size, and size matters far less for pleasure or fertility than people claim. What is worth a clinic visit is a change you can feel or see — a new lump, sore, unusual discharge, a strong smell, itching or pain — because those can be signs of an infection that's easily treated. Looking different is not a defect; it's just a body, and almost everyone quietly worries theirs is strange when it isn't.$q$,
 'WHO','https://www.who.int/health-topics/sexual-health',false,10),

('masturbation-safe','masturbation',$q$Will masturbation harm me?$q$,
 array['masturbation','masturbate','touch myself','solo','self pleasure'],
 $q$No — masturbation is normal, common and medically harmless. It does not cause blindness, infertility, weakness, acne, "wasting energy", or any disease, and people of all genders do it. It carries zero risk of pregnancy or STIs, and it can actually help you understand your own body, release tension and sleep better. Doing it often is fine; there is no "too much" as long as it isn't sore or getting in the way of school, friends or responsibilities, and privacy is just about respect for others, not shame. If it ever starts to feel compulsive, or you're only using it to escape stress or difficult feelings, that's worth talking through with someone you trust. Whatever you've been told in order to scare you, there is nothing dirty or damaging about it.$q$,
 'WHO','https://www.who.int/health-topics/sexual-health',false,20),

('sexual-feelings-normal','sexual-feelings',$q$Is it normal to feel turned on a lot?$q$,
 array['horny','aroused','urges','sexual feelings','turned on','desire'],
 $q$Yes — feeling attraction, arousal, curiosity or strong urges, sometimes out of nowhere, is a normal part of puberty, driven by hormones and completely human. These feelings rise and fade, can be about people you would never actually act on, and don't make you a bad or dirty person. The most important thing to hold onto is that feelings and actions are separate: you are always free to choose what you do, when, and with whom — or to do nothing at all. There is no "right age" to start feeling this way and no shame in feeling it strongly or barely at all. If the feelings ever feel overwhelming, confusing or hard to control, talking to someone you trust can help you make sense of them without judgment.$q$,
 null,null,false,30),

('same-sex-feelings','identity',$q$I have feelings for someone of the same sex — is something wrong with me?$q$,
 array['gay','lesbian','same sex','attracted to same','bisexual','queer','like girls','like boys'],
 $q$There is nothing wrong, broken or sinful about you — being attracted to the same sex, to more than one sex, or being unsure is part of the natural range of human attraction that millions of people share. You don't have to put a label on it, "prove" anything, come out, or make any decision right now; feelings can be clear or confusing and can shift over time, and all of that is okay. What you feel is real and valid even if people around you don't understand it, and it says nothing bad about your character. Your safety and wellbeing come first, so choose carefully who you confide in, and go at your own pace. If this is weighing on you, a non-judgmental counsellor or a trusted adult can be real support — and whatever you're feeling, you are not alone and you deserve respect.$q$,
 null,null,true,40),

('gender-identity','identity',$q$What if I don't feel fully like a boy or a girl?$q$,
 array['gender','trans','transgender','nonbinary','identity','boy or girl','who i am'],
 $q$Gender identity is your own inner sense of being a boy, a girl, both, neither, or somewhere in between — and for some people that doesn't match the sex written on their birth certificate, which is a real, long-recognised human experience, not a trend or an illness. You might feel it strongly or simply be questioning, and either is completely okay; there is no timeline and nothing you must decide today. Feeling this way does not mean anything is wrong with you, and it doesn't have to change how you live right now unless you want it to. Because not everyone around you may understand, it's wise to think about who is safe to talk to and to move at your own pace. A youth-friendly counsellor can offer a private, non-judgmental space to explore what you feel — your feelings are valid, whatever words you do or don't choose for them.$q$,
 null,null,true,50),

('sharing-toys','safer-sex',$q$Is it safe to share sex toys or strap-ons?$q$,
 array['sex toy','strap on','strap-on','dildo','vibrator','sharing toys'],
 $q$Sharing sex toys can pass on STIs (such as herpes, HPV, gonorrhoea, chlamydia and hepatitis) and disturb the natural balance that leads to infections like bacterial vaginosis and thrush, because body fluids stay on the toy. The safest option is not to share; if you do, roll a fresh condom onto the toy and change it to a new one before the next person uses it, and wash the toy with warm water and plain soap, then let it dry, between uses. Never move a toy straight from the anus to the vagina or mouth without cleaning it and changing the condom, because that spreads gut bacteria and can cause infections. Use plenty of water- or silicone-based lube so there are no small tears for infections to enter, and check toys are body-safe (non-porous) and undamaged. These same principles — barriers, not sharing fluids, and cleaning in between — are what make every kind of sex safer.$q$,
 'WHO','https://www.who.int/health-topics/sexually-transmitted-infections',true,60),

('drugs-and-sex','harm-reduction',$q$Is it risky to mix alcohol or drugs with sex?$q$,
 array['drunk','high','drugs','alcohol','weed','chemsex','party'],
 $q$Yes, mixing alcohol or drugs with sex raises real risks. Being drunk or high blurs judgment, so people forget or skip condoms, misread situations, and are more likely to regret things afterwards — and crucially, someone who is very drunk or high cannot give real consent, which means sex with them is not okay, and the same rule protects you. Some combinations are physically dangerous (for example alcohol or certain drugs together with erection pills, or mixing sedatives), and substances can also make erections, orgasm or lubrication harder. If you do drink or use, a few habits lower the harm: keep condoms on you, watch your own drink, stay with people you trust, agree your limits before things start, and remember you can stop or leave at any moment. You never owe anyone sex because they bought you drinks or you got high together.$q$,
 null,null,false,70),

('anal-sex-safety','safer-sex',$q$Is anal sex safe?$q$,
 array['anal','anal sex','backdoor'],
 $q$Anal sex can be made safer, but it carries the highest HIV and STI risk of the common types of sex, because the lining of the anus is thin and tears easily, letting infections in. To lower the risk: always use a condom with plenty of water- or silicone-based lube (the anus makes none of its own, and lube prevents the tiny tears that spread infection), go slowly, and stop if there is pain or bleeding. Never go from anus to vagina without changing the condom, to avoid spreading bacteria and urinary infections, and you do not need to "flush out" or douche inside — that actually irritates the lining and can raise risk. A condom also matters because semen that later reaches the vagina can still cause pregnancy. If you have anal sex regularly, it's worth asking a clinic about PrEP and routine STI testing.$q$,
 'NASCOP','https://www.nascop.or.ke',true,80),

('what-is-consent','consent',$q$What actually counts as consent?$q$,
 array['consent','pressure','force','yes','no means no'],
 $q$Consent is a clear, freely given, enthusiastic "yes", and it only counts when the person is sober enough, awake, old enough, and free from pressure, threats or fear. It is specific (yes to one thing is not yes to everything), ongoing (you can change your mind at any point, even midway), and needed every single time — including with a boyfriend, girlfriend or spouse. Silence, going along with it, or not fighting back is not consent, and neither is a "yes" squeezed out by guilt-tripping, pestering, or lines like "if you loved me". Real consent runs both ways: you check that the other person genuinely wants to, and you are free to say no, "not yet", or "stop" at any time without owing a reason. If someone ignores your no or pressures you past it, the fault is theirs, never yours.$q$,
 null,null,false,90),

('after-unprotected-sex','emergency',$q$I had unprotected sex — what can I do now?$q$,
 array['unprotected','condom broke','morning after','emergency','pep','plan b','prevent pregnancy','p2','postinor'],
 $q$Act quickly, because your options work best within hours. To prevent pregnancy, emergency contraception — the "morning-after" pill, sold in Kenya over the counter at pharmacies as P2, Postinor-2 or Ecee-2 without a prescription — works best within 72 hours, while some types and the copper IUD (fitted at a clinic) work up to 120 hours (5 days); the sooner you take it, the better it works. To prevent HIV, PEP is a short course of pills that must be started within 72 hours of the exposure — go to a hospital, health centre or VCT/clinic and ask for it by name. A clinic can also test for and treat other STIs, and if your period is later than usual, take a pregnancy test from about three weeks after. You don't need a parent's permission to ask, and youth-friendly clinics handle this every day without judgment.$q$,
 'NASCOP','https://www.nascop.or.ke',false,100),

('protect-from-hiv','hiv',$q$How do I protect myself from HIV?$q$,
 array['hiv','prep','protect','aids','prevent hiv','u=u'],
 $q$You have several strong tools, and combining them works best. Condoms used correctly every time are very effective against HIV and also prevent other STIs and pregnancy, so they're the everyday foundation. PrEP — a daily pill offered free through many Kenyan clinics via NASCOP — can stop HIV before exposure if you're at higher risk, for example if a partner is living with HIV or you have more than one partner. Knowing your status matters: HIV testing is quick, free and confidential at youth-friendly centres, and self-test kits are available too. If you're ever exposed, PEP started within 72 hours can still prevent infection. And one fact that changes everything: a person living with HIV who takes their treatment and has an undetectable viral load cannot pass HIV on sexually — that's "U=U", Undetectable equals Untransmittable.$q$,
 'NASCOP','https://www.nascop.or.ke',false,110),

('am-i-pregnant','pregnancy',$q$How do I know if I'm pregnant?$q$,
 array['pregnant','missed period','pregnancy test','late period'],
 $q$The commonest first sign is a missed or very late period, and some people also notice tender or swollen breasts, nausea, unusual tiredness, needing to pee more, or light spotting — but stress, illness and hormones can cause all of these, so symptoms alone don't confirm anything. The only reliable way to know is a pregnancy test: urine test kits are cheap and sold at any pharmacy in Kenya, and they are most accurate from the first day your period is due, or about three weeks after unprotected sex. Follow the instructions, use first-morning urine for the clearest result, and if the test is negative but your period still doesn't come, test again in a week or visit a clinic. Whatever the result, a youth-friendly clinic can talk you through your choices privately and without judgment — you don't have to face it alone or decide anything on the spot.$q$,
 null,null,false,120),

('porn-vs-reality','media',$q$Is real sex like what I see in porn?$q$,
 array['porn','pornography','realistic','xvideos','is sex like'],
 $q$No — porn is produced entertainment, not a documentary. Performers are cast for particular looks, scenes are scripted, lit and edited, bodies are often surgically altered, and the "stamina" you see is really cuts, breaks and sometimes medication. Real sex is slower, more awkward, quieter and more varied: bodies look ordinary, not everyone finishes, erections and lubrication aren't on demand, and the enthusiastic consent and communication that porn skips are what actually make it good. Treating porn as a how-to guide fuels needless anxiety about size, performance and how long things "should" last, and it can push people to expect or pressure partners into things they don't want. Watching it doesn't make you bad — the key is not to mistake a performance for real life or for what a real partner owes you.$q$,
 null,null,false,130),

('pressured-for-nudes','safety',$q$Someone keeps pressuring me to send nudes.$q$,
 array['nudes','nude','sexting','send pics','pictures','sextortion'],
 $q$You never owe anyone a photo — not a partner, not someone older, not someone promising love, money or secrecy — and real respect means hearing "no" the first time. Once an image leaves your phone you lose all control of it: it can be saved, forwarded or used to threaten you, and that includes photos sent on "disappearing" apps. Anyone who pressures, guilt-trips or threatens you to get images — or threatens to leak ones you already sent (that's sextortion) — is the one in the wrong, and it is not your fault, even if you shared something earlier. Don't send more and don't pay; paying almost always leads to more demands. Instead, save the evidence, block them, and tell an adult you trust — and in Kenya you can reach the Childline helpline free on 116. You have the right to say no and the right to get help.$q$,
 null,null,false,140)
on conflict (slug) do update set
  answer = excluded.answer, keywords = excluded.keywords,
  question = excluded.question, source = excluded.source, source_url = excluded.source_url;
