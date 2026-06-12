import { useState, useEffect } from 'react'

// Minimal 3-language string store: English / Kiswahili / Sheng.
const STRINGS = {
  en: {
    pulse:'Pulse', intel:'Intel', forum:'Forum', exchange:'Exchange', ukweli:'Ukweli',
    radar:'Radar', tracker:'Tracker', briefs:'Briefs',
    narrative_index:'SRHR Narrative Index', positive_share:'positive content',
    disinfo_today:'disinformation signals', ask_anon:'Ask anonymously',
    myths:'Myth-busters', learn:'Learn', why_feels_true:'Why it feels true',
    the_truth:'The truth', what_to_do:'What to do', see_more:'See more', see_less:'See less',
    tagline:'The operations room for Kenya’s disruptive SRHR collective.',
  },
  sw: {
    pulse:'Mapigo', intel:'Taarifa', forum:'Jukwaa', exchange:'Soko', ukweli:'Ukweli',
    radar:'Rada', tracker:'Kifuatiliaji', briefs:'Ripoti',
    narrative_index:'Kipimo cha Simulizi ya SRHR', positive_share:'maudhui chanya',
    disinfo_today:'ishara za upotoshaji', ask_anon:'Uliza bila kujulikana',
    myths:'Kuvunja Imani Potovu', learn:'Jifunze', why_feels_true:'Kwa nini inahisi kweli',
    the_truth:'Ukweli', what_to_do:'Cha kufanya', see_more:'Ona zaidi', see_less:'Ona kidogo',
    tagline:'Chumba cha operesheni cha muungano wa SRHR wa Kenya.',
  },
  sheng: {
    pulse:'Pulse', intel:'Intel', forum:'Forum', exchange:'Soko', ukweli:'Ukweli',
    radar:'Radar', tracker:'Tracker', briefs:'Briefs',
    narrative_index:'SRHR Narrative Index', positive_share:'story poa',
    disinfo_today:'ma-fake signals', ask_anon:'Uliza ukidaff',
    myths:'Kudemystify Fake', learn:'Soma', why_feels_true:'Kwa nini inakaa kweli',
    the_truth:'Ukweli', what_to_do:'Fanya hivi', see_more:'Ona zaidi', see_less:'Punguza',
    tagline:'The ops room ya wadau wa SRHR wenye wanachallenge mfumo.',
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
