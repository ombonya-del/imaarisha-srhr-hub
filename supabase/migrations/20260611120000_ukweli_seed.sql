-- Ukweli myth-buster cards — seeded from the four Phase 1 disinformation typologies.
-- Each card: the claim as people say it, why it FEELS true (research insists on this),
-- the truth, and a safe next action. English first; Swahili rows follow.

insert into public.ukweli_cards (typology, claim, why_it_feels_true, truth, what_to_do, language, sort_order)
select * from (values
('contraceptive_myth',
 'Family planning makes you barren — once you use Depo or the pill you''ll never have children again.',
 'It travels through mothers and aunties who love you, and everyone "knows someone" it supposedly happened to — so it feels like protection, not a rumour.',
 'Modern contraception does not cause permanent infertility. Fertility returns after stopping — sometimes immediately, and for injectables usually within several months to about a year. Millions of women use family planning and go on to have healthy pregnancies.',
 'Talk to a health worker about which method fits your plans. If you want children later, ask about how quickly fertility returns for each method.',
 'en', 1),
('fertility_abortion',
 'Abortion destroys the womb and leaves you infertile for life.',
 'It connects to a real, deep fear about fertility and respectability — so it lands as a moral warning, not a medical claim that can be checked.',
 'Safe, legally-provided abortion care does not cause infertility. The serious harm comes from unsafe, hidden procedures. In Kenya abortion is permitted where a trained health professional judges the life or health of the woman is in danger.',
 'If you need care or accurate information, seek a trained health professional — not a rumour. Confidential help exists.',
 'en', 2),
('anti_cse',
 'Sex education teaches children to be promiscuous and pushes foreign values on Kenyan kids.',
 'It speaks to a genuine wish to protect children and defend culture — so opposing it feels like good parenting and patriotism at once.',
 'Age-appropriate sexuality education is linked to LATER first sex, fewer teen pregnancies and lower STI rates. It gives children language to recognise and report abuse. It is about safety and knowledge, not encouragement.',
 'Ask what the actual curriculum covers before deciding. Information protects children; silence does not.',
 'en', 3),
('faith_healing',
 'HIV has been cured through prayer — people have testimonies, so the science has been overtaken by faith.',
 'It comes wrapped in trusted faith authority and real testimonies, at the exact moment someone is desperate for hope — so doubting it feels like doubting God.',
 'There is no faith cure for HIV. Stopping antiretroviral treatment because of a healing claim is dangerous and can be fatal. With consistent treatment, people with HIV live full, long lives and cannot transmit the virus when virally suppressed.',
 'Never stop ARVs based on a healing claim. Speak to your clinic first — faith and treatment can go together; abandoning treatment cannot.',
 'en', 4),
-- Swahili
('contraceptive_myth',
 'Uzazi wa mpango unakufanya tasa — ukitumia Depo au vidonge hutazaa tena.',
 'Inapitishwa na mama na shangazi wanaokupenda, na kila mtu "anamjua mtu" iliyemtokea — kwa hivyo inahisi kama ulinzi, si uvumi.',
 'Njia za kisasa za uzazi wa mpango hazisababishi utasa wa kudumu. Uwezo wa kuzaa hurudi baada ya kuacha — wakati mwingine mara moja, na kwa sindano kawaida ndani ya miezi kadhaa hadi mwaka.',
 'Ongea na mhudumu wa afya kuhusu njia inayokufaa na jinsi uwezo wa kuzaa unavyorudi.',
 'sw', 1),
('faith_healing',
 'HIV imeponywa kwa maombi — kuna ushuhuda, kwa hivyo sayansi imeshindwa na imani.',
 'Inakuja ikiwa imefungwa kwa mamlaka ya kidini na ushuhuda wa kweli, wakati mtu anahitaji matumaini — kwa hivyo kuitilia shaka kunahisi kama kumtilia shaka Mungu.',
 'Hakuna tiba ya imani kwa HIV. Kuacha dawa za ARV kwa sababu ya dai la uponyaji ni hatari na kunaweza kuua. Kwa matibabu thabiti, watu wenye HIV huishi maisha kamili na marefu.',
 'Usiache ARV kamwe kwa dai la uponyaji. Ongea na kliniki yako kwanza.',
 'sw', 4)
) as v(typology, claim, why_it_feels_true, truth, what_to_do, language, sort_order)
where not exists (select 1 from public.ukweli_cards limit 1);
