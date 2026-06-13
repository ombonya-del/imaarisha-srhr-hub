// ── Learn content — short, accurate SRHR explainers for young Kenyans.
// English + Kiswahili written out; Sheng falls back to English (the i18n labels
// around them switch fully). Sources: Kenya MoH adolescent SRHR guidelines,
// FEMNET Kenya SRHR Fact Sheet 2022, WHO. Helplines listed are long-standing
// Kenyan toll-free lines — verify before crises.

export const LEARN = [
  {
    id: 'contraception',
    color: '#FF4D6D',
    emoji: '🛡️',
    en: {
      title: 'Contraception & family planning',
      intro: 'Ways to prevent pregnancy until you decide you’re ready. There are many options — one will fit your life.',
      points: [
        ['Condoms', 'The only method that also protects against HIV and other STIs. Free at public clinics. Use a new one every time.'],
        ['Pills, injections & implants', 'Hormonal methods that are very effective at preventing pregnancy. An implant lasts up to 3–5 years; the injection about 3 months.'],
        ['Emergency pills', 'Can prevent pregnancy if taken within 72 hours (3 days) after unprotected sex — the sooner the better. Available at pharmacies.'],
        ['It’s your right', 'In Kenya, young people can access contraception and counselling at public health facilities. Services should be confidential.'],
      ],
    },
    sw: {
      title: 'Uzazi wa mpango',
      intro: 'Njia za kuzuia mimba hadi utakapokuwa tayari. Kuna njia nyingi — moja itakufaa.',
      points: [
        ['Kondomu', 'Njia pekee inayolinda pia dhidi ya VVU na magonjwa mengine ya zinaa. Ni za bure kwenye kliniki za umma. Tumia mpya kila wakati.'],
        ['Vidonge, sindano na vipandikizi', 'Njia za homoni zenye ufanisi mkubwa wa kuzuia mimba. Kipandikizi hudumu miaka 3–5; sindano takriban miezi 3.'],
        ['Vidonge vya dharura', 'Vinaweza kuzuia mimba vikitumika ndani ya saa 72 (siku 3) baada ya kujamiiana bila kinga — haraka ni bora. Vinapatikana kwenye maduka ya dawa.'],
        ['Ni haki yako', 'Nchini Kenya, vijana wanaweza kupata uzazi wa mpango na ushauri kwenye vituo vya afya vya umma. Huduma zinapaswa kuwa za siri.'],
      ],
    },
  },
  {
    id: 'consent',
    color: '#7B5CFF',
    emoji: '💜',
    en: {
      title: 'Consent & healthy relationships',
      intro: 'Consent means a free, clear YES — every time. Without it, it is not okay, no matter who the person is.',
      points: [
        ['Consent is freely given', 'Not pressured, not bought, not given when someone is drunk, asleep or afraid. It can be withdrawn at any moment.'],
        ['Respect goes both ways', 'A healthy relationship has trust, honesty and space to say no. Jealousy, control and threats are warning signs.'],
        ['Your body, your pace', 'You never owe anyone sex — not for gifts, not for love, not for anything. “Not now” is a complete answer.'],
        ['Age matters', 'In Kenya, anyone under 18 cannot legally consent to sex. Sex with a minor is defilement and a serious crime.'],
      ],
    },
    sw: {
      title: 'Ridhaa na mahusiano mazuri',
      intro: 'Ridhaa ni NDIYO ya hiari na iliyo wazi — kila wakati. Bila hiyo, si sawa, hata awe nani.',
      points: [
        ['Ridhaa ni ya hiari', 'Si kwa shinikizo, si kwa kununuliwa, si wakati mtu amelewa, amelala au ana hofu. Inaweza kuondolewa wakati wowote.'],
        ['Heshima ni ya pande mbili', 'Uhusiano mzuri una uaminifu, ukweli na nafasi ya kusema hapana. Wivu, udhibiti na vitisho ni dalili za hatari.'],
        ['Mwili wako, kasi yako', 'Hudaiwi kufanya ngono na yeyote — si kwa zawadi, si kwa mapenzi. “Si sasa” ni jibu kamili.'],
        ['Umri ni muhimu', 'Nchini Kenya, mtu chini ya miaka 18 hawezi kutoa ridhaa ya ngono kisheria. Ngono na mtoto ni ukatili na ni kosa kubwa.'],
      ],
    },
  },
  {
    id: 'hiv',
    color: '#00C2A8',
    emoji: '🧬',
    en: {
      title: 'HIV & STIs — know the facts',
      intro: 'STIs are common and treatable. Knowing your status protects you and the people you care about.',
      points: [
        ['Test regularly', 'HIV testing is free, fast and confidential at public clinics. Self-test kits are also available. Knowing early means you can stay healthy.'],
        ['Treatment works', 'People living with HIV who take ARVs daily can live long, healthy lives — and when the virus is undetectable, it can’t be passed on (U=U).'],
        ['Protect yourself', 'Condoms prevent HIV and most STIs. PrEP (a daily pill) can prevent HIV for people at higher risk. PEP can help within 72 hours of exposure.'],
        ['Other STIs', 'Things like gonorrhoea, chlamydia and syphilis are curable with medicine — but need a clinic visit. Don’t self-treat or feel shame.'],
      ],
    },
    sw: {
      title: 'VVU na magonjwa ya zinaa — ukweli',
      intro: 'Magonjwa ya zinaa ni ya kawaida na yanatibika. Kujua hali yako kunakulinda wewe na wapendwa wako.',
      points: [
        ['Pima mara kwa mara', 'Kupima VVU ni bure, haraka na kwa siri kwenye kliniki za umma. Vifaa vya kujipima pia vipo. Kujua mapema kunakuwezesha kubaki na afya.'],
        ['Matibabu yanafanya kazi', 'Wanaoishi na VVU wanaotumia ARV kila siku wanaweza kuishi maisha marefu na yenye afya — na virusi vikiwa havitambuliki, haviambukizwi (U=U).'],
        ['Jilinde', 'Kondomu huzuia VVU na magonjwa mengi ya zinaa. PrEP (kidonge cha kila siku) huzuia VVU kwa walio hatarini. PEP husaidia ndani ya saa 72.'],
        ['Magonjwa mengine', 'Kisonono, klamidia na kaswende hutibika kwa dawa — lakini unahitaji kutembelea kliniki. Usijitibu wala usione aibu.'],
      ],
    },
  },
  {
    id: 'rights',
    color: '#FFC93C',
    emoji: '⚖️',
    en: {
      title: 'Your rights',
      intro: 'Kenyan law and the Constitution protect your right to health, dignity and information.',
      points: [
        ['Right to health', 'Article 43 of the Constitution guarantees the right to the highest attainable standard of health, including reproductive health care.'],
        ['Confidentiality', 'Health workers should keep your visit private. You can ask to speak to them alone.'],
        ['Information is power', 'You have the right to accurate information about your body and choices — not myths, shame or scare tactics.'],
        ['When life is at risk', 'Article 26(4) allows abortion when, in the opinion of a trained health professional, the life or health of the mother is in danger or there is an emergency.'],
      ],
    },
    sw: {
      title: 'Haki zako',
      intro: 'Sheria za Kenya na Katiba zinalinda haki yako ya afya, heshima na taarifa.',
      points: [
        ['Haki ya afya', 'Kifungu cha 43 cha Katiba kinahakikisha haki ya kiwango cha juu cha afya, ikiwemo huduma za afya ya uzazi.'],
        ['Usiri', 'Wahudumu wa afya wanapaswa kuweka ziara yako siri. Unaweza kuomba kuzungumza nao peke yako.'],
        ['Taarifa ni nguvu', 'Una haki ya taarifa sahihi kuhusu mwili wako na chaguo zako — si imani potovu, aibu wala vitisho.'],
        ['Maisha yakiwa hatarini', 'Kifungu cha 26(4) kinaruhusu uavyaji mimba pale, kwa maoni ya mtaalamu wa afya aliyefunzwa, maisha au afya ya mama iko hatarini au kuna dharura.'],
      ],
    },
  },
  {
    id: 'gbv',
    color: '#E0486B',
    emoji: '🆘',
    en: {
      title: 'GBV — you are not alone',
      intro: 'Gender-based violence is never your fault. Help is available, and reaching out is a sign of strength.',
      points: [
        ['Recognise it', 'GBV includes physical, sexual, emotional and economic abuse — by a partner, family member or anyone else.'],
        ['Get to safety first', 'If you’re in immediate danger, get to a safe place and call for help. After sexual assault, a clinic can offer care (including PEP) within 72 hours.'],
        ['Helplines (Kenya)', 'National GBV hotline: 1195 (toll-free). Childline Kenya: 116. Police emergency: 999 or 112. These lines are free to call.'],
        ['Talk to someone you trust', 'A health worker, teacher, counsellor or the Uliza desk in this app can help you find the next step — anonymously.'],
      ],
    },
    sw: {
      title: 'Ukatili wa kijinsia — hauko peke yako',
      intro: 'Ukatili wa kijinsia kamwe si kosa lako. Msaada upo, na kuomba msaada ni ishara ya nguvu.',
      points: [
        ['Tambua', 'Ukatili wa kijinsia ni pamoja na unyanyasaji wa kimwili, kingono, kihisia na kiuchumi — kutoka kwa mpenzi, ndugu au mtu yeyote.'],
        ['Tafuta usalama kwanza', 'Ukiwa hatarini sasa hivi, nenda mahali salama na uombe msaada. Baada ya ubakaji, kliniki inaweza kutoa huduma (ikiwemo PEP) ndani ya saa 72.'],
        ['Simu za msaada (Kenya)', 'Nambari ya kitaifa ya ukatili: 1195 (bure). Childline Kenya: 116. Dharura ya polisi: 999 au 112. Simu hizi ni za bure.'],
        ['Ongea na unayemwamini', 'Mhudumu wa afya, mwalimu, mshauri au dawati la Uliza kwenye programu hii linaweza kukusaidia kupata hatua inayofuata — bila kujulikana.'],
      ],
    },
  },
  {
    id: 'body',
    color: '#2EA0FF',
    emoji: '🌱',
    en: {
      title: 'Your body & growing up',
      intro: 'Bodies change through the teen years and beyond. What you feel is normal — and worth understanding.',
      points: [
        ['Periods', 'Most people start their period between ages 9 and 16. Cycles can be irregular at first. Pain that stops your day is worth checking with a clinic.'],
        ['It’s all normal', 'Bodies grow at different speeds and look different from each other. Comparison online is rarely the full or true picture.'],
        ['Hygiene, not shame', 'Keep clean with water and mild soap. You don’t need special “tightening” or scented products — they can cause harm.'],
        ['Ask questions', 'Curiosity about your body is healthy. The Uliza desk is here for the questions you don’t want to ask out loud.'],
      ],
    },
    sw: {
      title: 'Mwili wako na kukua',
      intro: 'Mwili hubadilika katika ujana na zaidi. Unachohisi ni cha kawaida — na kinastahili kueleweka.',
      points: [
        ['Hedhi', 'Wengi huanza hedhi kati ya miaka 9 na 16. Mzunguko unaweza kuwa usio wa kawaida mwanzoni. Maumivu yanayokuzuia kufanya mambo yanastahili kuangaliwa kliniki.'],
        ['Ni kawaida', 'Miili hukua kwa kasi tofauti na huonekana tofauti. Kulinganisha mtandaoni mara nyingi si picha kamili wala ya kweli.'],
        ['Usafi, si aibu', 'Jisafishe kwa maji na sabuni laini. Huhitaji bidhaa za “kubana” au za marashi — zinaweza kudhuru.'],
        ['Uliza maswali', 'Kutaka kujua kuhusu mwili wako ni afya. Dawati la Uliza lipo kwa maswali usiyotaka kuuliza kwa sauti.'],
      ],
    },
  },
]
