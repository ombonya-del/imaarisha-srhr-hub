-- ════════════════════════════════════════════════════════════════════════════
-- HEBU FIKA — additional SRHR providers (NGOs, CSOs, faith-based missions)
-- Additive seed for fika_facilities. Run AFTER 20260613100000_fika.sql.
--
-- Real, publicly-known providers used as starting points (not endorsements).
-- Service tags reflect each provider type — faith-based mission hospitals are
-- tagged for HIV / antenatal / counselling / maternal & child health, NOT for
-- services many of them do not offer. Ratings are built only from youth reviews.
-- Non-destructive: on conflict (id) do nothing.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.fika_facilities (id, name, county, area, kind, services, verified) values
  ('f-ms-mombasa','Marie Stopes Kenya — Mombasa','Mombasa','Mombasa','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-kisumu','Marie Stopes Kenya — Kisumu','Kisumu','Kisumu','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-nakuru','Marie Stopes Kenya — Nakuru','Nakuru','Nakuru','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-eldoret','Marie Stopes Kenya — Eldoret','Uasin Gishu','Eldoret','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-thika','Marie Stopes Kenya — Thika','Kiambu','Thika','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-nyeri','Marie Stopes Kenya — Nyeri','Nyeri','Nyeri','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-meru','Marie Stopes Kenya — Meru','Meru','Meru','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-kakamega','Marie Stopes Kenya — Kakamega','Kakamega','Kakamega','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-kisii','Marie Stopes Kenya — Kisii','Kisii','Kisii','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-embu','Marie Stopes Kenya — Embu','Embu','Embu','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-ms-machakos','Marie Stopes Kenya — Machakos','Machakos','Machakos','ngo',array['Family planning','Safe care','HIV testing','Counselling'],true),
  ('f-fhok-nairobi','Family Health Options Kenya (FHOK) — Nairobi','Nairobi','Nairobi','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-mombasa','Family Health Options Kenya (FHOK) — Mombasa','Mombasa','Mombasa','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-kisumu','Family Health Options Kenya (FHOK) — Kisumu','Kisumu','Kisumu','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-nakuru','Family Health Options Kenya (FHOK) — Nakuru','Nakuru','Nakuru','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-eldoret','Family Health Options Kenya (FHOK) — Eldoret','Uasin Gishu','Eldoret','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-thika','Family Health Options Kenya (FHOK) — Thika','Kiambu','Thika','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-nyeri','Family Health Options Kenya (FHOK) — Nyeri','Nyeri','Nyeri','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-kitale','Family Health Options Kenya (FHOK) — Kitale','Trans Nzoia','Kitale','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-fhok-meru','Family Health Options Kenya (FHOK) — Meru','Meru','Meru','ngo',array['Family planning','Youth-friendly services','HIV testing','GBV support'],true),
  ('f-lvct-nairobi','LVCT Health (One2One youth line 1190) — Nairobi','Nairobi','Nairobi','ngo',array['HIV testing','GBV support','Counselling','Youth services'],true),
  ('f-lvct-mombasa','LVCT Health — Mombasa','Mombasa','Mombasa','ngo',array['HIV testing','GBV support','Counselling','Youth services'],true),
  ('f-lvct-kisumu','LVCT Health — Kisumu','Kisumu','Kisumu','ngo',array['HIV testing','GBV support','Counselling','Youth services'],true),
  ('f-faith-kijabe','AIC Kijabe Hospital','Kiambu','Kijabe','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-kikuyu','PCEA Kikuyu Hospital','Kiambu','Kikuyu','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-nazareth','Nazareth Hospital','Kiambu','Riara Ridge','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-mater','Mater Misericordiae Hospital','Nairobi','South B','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-stmary-nbo','St. Mary’s Mission Hospital','Nairobi','Langata','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-consolata','Consolata Hospital Mathari','Nyeri','Mathari','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-maua','Maua Methodist Hospital','Meru','Maua','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-tenwek','Tenwek Hospital (AIC)','Bomet','Tenwek','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-kendu','Kendu Adventist Hospital','Homa Bay','Kendu Bay','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-mutomo','Mutomo Mission Hospital','Kitui','Mutomo','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-faith-mumias','St. Mary’s Mission Hospital, Mumias','Kakamega','Mumias','faith',array['HIV testing','Antenatal care','Counselling','Maternal & child health'],true),
  ('f-cso-zamara','Zamara Foundation (youth SRHR)','Nairobi','Nairobi','ngo',array['Information','Referrals','Peer support','Youth services'],true),
  ('f-cso-rhnk','Reproductive Health Network Kenya (RHNK)','Nairobi','Nairobi','ngo',array['Information','Referrals','Peer support','Youth services'],true),
  ('f-cso-dsw','DSW Kenya — Youth-to-Youth','Nairobi','Nairobi','ngo',array['Information','Referrals','Peer support','Youth services'],true),
  ('f-cso-icl','I Choose Life-Africa','Nairobi','Nairobi','ngo',array['Information','Referrals','Peer support','Youth services'],true)
on conflict (id) do nothing;
