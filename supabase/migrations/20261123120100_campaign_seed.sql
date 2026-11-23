-- ============================================================================
-- ImaarishaSRHR campaign — starter data
-- Myth typologies, the master assets (all PRIVATE / draft until reviewed),
-- and DRAFT knowledge-check items. Quiz items are inactive until the
-- accuracy reviewer approves them — please check wording, translations and
-- Kenya-specific service routes before switching them on.
-- ============================================================================

-- Four disinformation typologies from Phase 1
insert into public.campaign_myths (slug, label, typology, false_claim, verified_fact, sources) values
 ('contraception-infertility', 'Contraception causes permanent infertility', 'contraceptive_safety',
  'Family planning methods make you barren.',
  'Fertility returns after stopping modern methods — quickly for most, after a few months for the injectable.',
  array['WHO Family Planning Handbook','MoH Kenya']),
 ('emergency-pill-abortion', 'The emergency pill causes abortion', 'fertility_abortion',
  'The morning-after pill ends a pregnancy.',
  'Emergency contraception works by preventing or delaying ovulation. It does not end an established pregnancy.',
  array['WHO']),
 ('cse-promotes-sex', 'Sexuality education makes young people have sex', 'anti_cse',
  'Teaching young people about sexuality encourages early sex.',
  'Evidence shows good sexuality education does not lead to earlier sex and can delay it.',
  array['UNESCO International Technical Guidance on Sexuality Education']),
 ('prayer-cures-hiv', 'Prayer alone cures HIV', 'hiv_faith_healing',
  'Faith healing means you can stop ARVs.',
  'ARVs keep people with HIV healthy and stop transmission. Faith and treatment go together; stopping ARVs is dangerous.',
  array['NASCOP','WHO'])
on conflict (slug) do nothing;

-- Master asset: the field guide / visual toolkit
insert into public.campaign_assets (slug, kind, title, summary, language, audiences, audience_facing, host)
values ('field-guide', 'toolkit', 'Imaarisha Field Guide — Visual Toolkit',
        'Strategic communication and reframing SRHR: message principles, myth cards and scripts.',
        'en', array['partners','practitioners'], 'partners', 'web')
on conflict (slug) do nothing;

-- Master assets: five explainer videos (rename when titles are final)
insert into public.campaign_assets (slug, kind, series, episode_no, title, language, audiences, host)
select 'video-' || n, 'video', 'Imaarisha Explainers', n, 'Explainer video ' || n || ' (title TBC)',
       'multi', array['youth','men','mothers'], 'youtube'
from generate_series(1,5) n
on conflict (slug) do nothing;

-- Master assets: Imaarisha Conversations — three shows × five episodes
insert into public.campaign_assets (slug, kind, series, episode_no, title, language, audiences, host)
select 'conversations-' || l.code || '-ep' || n, 'podcast_episode',
       'Imaarisha Conversations (' || l.label || ')', n,
       'Imaarisha Conversations · ' || l.label || ' · Episode ' || n || ' (title TBC)',
       l.code, l.aud, 'podcast_host'
from (values ('sheng','Sheng', array['youth']),
             ('sw','Kiswahili', array['mothers','men']),
             ('en','English', array['practitioners','partners'])) as l(code,label,aud),
     generate_series(1,5) n
on conflict (slug) do nothing;

-- DRAFT knowledge-check items (English). Inactive until reviewed.
insert into public.campaign_quiz_items (code, topic, language, prompt, options, correct_index, explanation, sources, sort_order) values
 ('c1','contraception','en',
  'After a woman stops using a modern contraceptive method, can she get pregnant again?',
  '["No, contraception causes permanent infertility","Yes — fertility returns, quickly for most methods and after a few months for the injection","Only after five years"]',
  1, 'Modern methods do not cause permanent infertility. With the injectable, it can take a few months for fertility to return.',
  array['WHO Family Planning Handbook'], 1),
 ('c2','contraception','en',
  'The emergency (morning-after) pill…',
  '["ends an existing pregnancy","prevents or delays ovulation so pregnancy does not start","protects against HIV"]',
  1, 'Emergency contraception prevents pregnancy from starting. It does not end an established pregnancy and does not protect against HIV.',
  array['WHO'], 2),
 ('h1','hiv','en',
  'A person living with HIV who takes ARVs every day and has an undetectable viral load…',
  '["can still easily pass HIV to a sexual partner","does not pass HIV to sexual partners","no longer needs to take ARVs"]',
  1, 'Undetectable = Untransmittable (U=U). Staying on ARVs is what keeps the virus undetectable.',
  array['NASCOP','WHO'], 3),
 ('h2','hiv','en',
  'Someone with HIV joins a prayer group that says faith has healed them. What should they do about their ARVs?',
  '["Stop the ARVs to show their faith","Keep taking ARVs — faith and treatment can go together","Take ARVs only when they feel sick"]',
  1, 'Stopping ARVs lets the virus return and damage health. Many faith leaders support treatment.',
  array['NASCOP'], 4),
 ('s1','cse','en',
  'Does age-appropriate sexuality education make young people start having sex earlier?',
  '["Yes, it encourages sex","No — evidence shows it does not, and it can delay first sex","It has no effect on knowledge"]',
  1, 'Reviews of the evidence show good sexuality education does not hasten sex and improves knowledge and safer choices.',
  array['UNESCO ITGSE'], 5),
 ('r1','claiming_rights','en',
  'You are 18 or older and a health worker refuses you contraception or information because of your age or marital status. What can you do?',
  '["Nothing, the health worker decides","Ask for another provider or raise it with the facility in-charge or county health office","Buy pills from anyone selling them online"]',
  1, 'You have a right to accurate information and services. You can ask for another provider and raise a complaint. [REVIEW: confirm Kenya complaint routes]',
  array['Constitution of Kenya Art. 43','MoH Kenya'], 6),
 ('r2','claiming_rights','en',
  'Where can you get accurate SRHR information and services in Kenya?',
  '["Only from friends and social media","From public health facilities, trained health workers and community health promoters","Only from private hospitals"]',
  1, 'Public health facilities and community health promoters provide information and services. [REVIEW: add hotline / service finder if available]',
  array['MoH Kenya'], 7)
on conflict (code) do nothing;
