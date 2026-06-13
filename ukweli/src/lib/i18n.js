import { useState, useEffect } from 'react'

// 3-language string store: English / Kiswahili / Sheng.
// Tone: warm, direct, youth-native — never preachy or clinical.
const STRINGS = {
  en: {
    // nav
    ask_anon: 'Ask', myths: 'Myths', learn: 'Learn',
    exit: 'EXIT',
    // hero
    tagline: 'Straight answers about your body, your health, your choices. Anonymous. No judgment. Answered by real health pros.',
    // ask tab
    ask_placeholder: 'Ask anything — contraception, HIV, your body, your rights. Nobody will know it was you.',
    ask_cta: 'Ask anonymously',
    ask_sending: 'Sending…',
    ask_sent: '✓ Sent. No name attached — not even we know who asked. A verified health worker will answer; check back here.',
    ask_another: 'Ask another',
    ask_privacy: 'No account · no name · no trace',
    answered_label: 'Already answered',
    no_answers: 'No answered questions yet — yours could be the first.',
    // myths tab
    myths_intro: 'Heard something that didn’t sit right? Tap a card and get the real deal.',
    why_feels_true: 'Why it feels true',
    the_truth: 'The truth',
    what_to_do: 'What to do',
    bust_myth: 'Bust this myth',
    close_card: 'Close',
    loading: 'Loading…',
    // learn tab
    learn_intro: 'Real talk about your body, relationships and rights — clear, correct, and free of shame.',
    learn_footer: 'Info reviewed against Kenya MoH adolescent SRHR guidance & WHO. In an emergency, call the helplines under “Your rights” and “GBV”.',
    verified_pro: 'Verified health professional',
  },
  sw: {
    ask_anon: 'Uliza', myths: 'Imani Potovu', learn: 'Jifunze',
    exit: 'TOKA',
    tagline: 'Majibu ya moja kwa moja kuhusu mwili, afya na chaguo zako. Bila kujulikana. Bila hukumu. Yanajibiwa na wataalamu halisi wa afya.',
    ask_placeholder: 'Uliza chochote — uzazi wa mpango, VVU, mwili wako, haki zako. Hakuna atakayejua ni wewe.',
    ask_cta: 'Uliza bila kujulikana',
    ask_sending: 'Inatuma…',
    ask_sent: '✓ Imetumwa. Hakuna jina — hata sisi hatujui ni nani aliuliza. Mhudumu wa afya aliyethibitishwa atajibu; rudi hapa kuangalia.',
    ask_another: 'Uliza lingine',
    ask_privacy: 'Bila akaunti · bila jina · bila alama',
    answered_label: 'Yaliyojibiwa',
    no_answers: 'Bado hakuna maswali yaliyojibiwa — lako linaweza kuwa la kwanza.',
    myths_intro: 'Umesikia jambo lisilokaa sawa? Gusa kadi upate ukweli halisi.',
    why_feels_true: 'Kwa nini inahisi kweli',
    the_truth: 'Ukweli',
    what_to_do: 'Cha kufanya',
    bust_myth: 'Vunja imani hii',
    close_card: 'Funga',
    loading: 'Inapakia…',
    learn_intro: 'Mazungumzo ya kweli kuhusu mwili, mahusiano na haki zako — wazi, sahihi, bila aibu.',
    learn_footer: 'Taarifa zimepitiwa kulingana na mwongozo wa SRHR wa vijana wa Wizara ya Afya Kenya na WHO. Wakati wa dharura, piga simu zilizo katika “Haki zako” na “Ukatili”.',
    verified_pro: 'Mtaalamu wa afya aliyethibitishwa',
  },
  sheng: {
    ask_anon: 'Uliza', myths: 'Ma-Fake', learn: 'Soma',
    exit: 'TOKA',
    tagline: 'Majibu poa kuhusu bodi yako, afya na decisions zako. Hakuna anajua ni wewe. Hakuna kujudge. Unajibiwa na ma-pro wa afya.',
    ask_placeholder: 'Uliza chochote — CBs, HIV, bodi yako, haki zako. Hakuna atajua ni wewe.',
    ask_cta: 'Uliza ukidaff',
    ask_sending: 'Inatuma…',
    ask_sent: '✓ Imeenda. Hakuna jina — hata sisi hatujui ni nani. Pro wa afya atakujibu; rudi hapa ucheki.',
    ask_another: 'Uliza ingine',
    ask_privacy: 'Hakuna account · hakuna jina · hakuna trace',
    answered_label: 'Zimejibiwa',
    no_answers: 'Bado hakuna swali limejibiwa — lako linaweza kuwa la kwanza.',
    myths_intro: 'Umesikia kitu hakikai sawa? Bonyeza card upate ukweli mtupu.',
    why_feels_true: 'Kwa nini inakaa kweli',
    the_truth: 'Ukweli',
    what_to_do: 'Fanya hivi',
    bust_myth: 'Demystify hii fake',
    close_card: 'Funga',
    loading: 'Inapakia…',
    learn_intro: 'Real talk kuhusu bodi yako, relationships na haki zako — wazi, sahihi, hakuna aibu.',
    learn_footer: 'Info imecheckiwa na mwongozo wa SRHR wa vijana wa MoH Kenya na WHO. Ukiwa kwa dharura, piga lines ziko kwa “Haki zako” na “Ukatili”.',
    verified_pro: 'Pro wa afya aliyeverify-iwa',
  },
}

let current = (() => { try { return localStorage.getItem('imaarisha_lang') || 'en' } catch { return 'en' } })()
const listeners = new Set()

export function useLang() {
  const [lang, setLang] = useState(current)
  useEffect(() => { const fn = l => setLang(l); listeners.add(fn); return () => listeners.delete(fn) }, [])
  const set = (l) => { current = l; try { localStorage.setItem('imaarisha_lang', l) } catch {} listeners.forEach(fn => fn(l)) }
  const tr = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key
  return { lang, setLang: set, tr }
}

export const LANGS = [['en','EN'],['sw','SW'],['sheng','Sheng']]
