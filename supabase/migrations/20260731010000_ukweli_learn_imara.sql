-- Imara TV curated highlights, mapped into the six Learn themes via `topic`.
-- Videos are EMBEDDED from Imara TV's public YouTube channel with credit — never
-- rehosted. Idempotent: ON CONFLICT updates existing rows (so earlier seeds get
-- their topic set too). The auto-scanner adds newer uploads on the same pattern.

alter table public.ukweli_learn add column if not exists topic text;
alter table public.ukweli_learn add column if not exists ext_id text;
create unique index if not exists ukweli_learn_ext_id_uidx on public.ukweli_learn (ext_id);

insert into public.ukweli_learn (ext_id, topic, language, media_type, sort_order, title, media_url) values
 ('imara-SbjRNZRTKbU','contraception','en','embed',40,'This is how you wear a condom','https://www.youtube.com/watch?v=SbjRNZRTKbU'),
 ('imara-VoctdS4vVw0','contraception','en','embed',41,'Condom shaming & teenage pregnancy','https://www.youtube.com/watch?v=VoctdS4vVw0'),
 ('imara-JBegB015i-s','contraception','en','embed',42,'Omwami talks about his favourite contraceptives','https://www.youtube.com/watch?v=JBegB015i-s'),
 ('imara-45bs7j7X7QQ','contraception','en','embed',43,'Do not use the emergency pill regularly','https://www.youtube.com/watch?v=45bs7j7X7QQ'),
 ('imara-PAEVrLCf6yM','contraception','en','embed',44,'Condom confusion: a take on safe sex','https://www.youtube.com/watch?v=PAEVrLCf6yM'),
 ('imara-1LeIbrd27K8','contraception','en','embed',45,'How to prevent unwanted pregnancies & STIs','https://www.youtube.com/watch?v=1LeIbrd27K8'),
 ('imara-mULdFFRrmvE','contraception','en','embed',46,'Teenage pregnancy','https://www.youtube.com/watch?v=mULdFFRrmvE'),
 ('imara-1EliT1xx6uo','hiv','en','embed',50,'HIV & AIDS: a simple explanation','https://www.youtube.com/watch?v=1EliT1xx6uo'),
 ('imara-oTgzfBCkSts','hiv','en','embed',51,'What happens during an HIV test','https://www.youtube.com/watch?v=oTgzfBCkSts'),
 ('imara-X26ryV-dJ8s','hiv','en','embed',52,'What happens during an HIV test (part 2)','https://www.youtube.com/watch?v=X26ryV-dJ8s'),
 ('imara-lLFL4ggq-1I','hiv','en','embed',53,'Sexually transmitted infections (STIs)','https://www.youtube.com/watch?v=lLFL4ggq-1I'),
 ('imara-gH3F_8t54BE','hiv','en','embed',54,'Preventing mother-to-child HIV transmission','https://www.youtube.com/watch?v=gH3F_8t54BE'),
 ('imara-7IpGh2-CCWI','hiv','en','embed',55,'All affected: AIDS and the family','https://www.youtube.com/watch?v=7IpGh2-CCWI'),
 ('imara-jRgY2M3UZqQ','hiv','en','embed',56,'HIV/AIDS & family support','https://www.youtube.com/watch?v=jRgY2M3UZqQ'),
 ('imara-xcZAkxyUXOE','hiv','en','embed',57,'Disclosing your HIV status to family','https://www.youtube.com/watch?v=xcZAkxyUXOE'),
 ('imara-MPc90Ve05go','gbv','en','embed',60,'#CampusMeToo — sexual harassment toolkit','https://www.youtube.com/watch?v=MPc90Ve05go'),
 ('imara-EvTECBdo1eY','gbv','en','embed',61,'#CampusMeToo','https://www.youtube.com/watch?v=EvTECBdo1eY'),
 ('imara-fZiqnS3t__E','gbv','en','embed',62,'Kenyan youth expose sexual harassment','https://www.youtube.com/watch?v=fZiqnS3t__E'),
 ('imara-oALK-NzWiTw','gbv','en','embed',63,'Safe spaces for all: addressing GBV in higher education','https://www.youtube.com/watch?v=oALK-NzWiTw'),
 ('imara-Zn2ToxG1Jko','gbv','en','embed',64,'Young in action: driving change to end GBV','https://www.youtube.com/watch?v=Zn2ToxG1Jko'),
 ('imara-IejvizWqiv0','gbv','en','embed',65,'Domestic abuse — Omwami na Wanawe (Ep 1)','https://www.youtube.com/watch?v=IejvizWqiv0'),
 ('imara-qPH0wlZ19E0','gbv','en','embed',66,'Police SGBV Policare training','https://www.youtube.com/watch?v=qPH0wlZ19E0'),
 ('imara-eCQ5H8tDgQo','gbv','en','embed',67,'Married too early','https://www.youtube.com/watch?v=eCQ5H8tDgQo'),
 ('imara-Aj2N_pF8PGg','consent','en','embed',70,'Healthy relationships','https://www.youtube.com/watch?v=Aj2N_pF8PGg'),
 ('imara-8ADTl8HkOM0','consent','en','embed',71,'She said no','https://www.youtube.com/watch?v=8ADTl8HkOM0'),
 ('imara-GAC1qats0Lk','rights','en','embed',80,'The sponsor faces the law','https://www.youtube.com/watch?v=GAC1qats0Lk')
on conflict (ext_id) do update
  set topic = excluded.topic, title = excluded.title, media_url = excluded.media_url,
      media_type = excluded.media_type, sort_order = excluded.sort_order, active = true;
