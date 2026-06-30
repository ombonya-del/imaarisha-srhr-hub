import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Btn, inputStyle } from '../lib/components'

// ── Disinformation Watch — claims + verified sources + standard responses ────
// Ported from the old hub (disinfoSources) and extended with the radar typologies.
const RESPONSE_LIBRARY = {
  contraceptives: {
    match: (t) => /contracept|infertil|depo|barren/.test(t),
    sources: [
      ['WHO — Contraceptive Use and Fertility Return', 'https://www.who.int/news-room/fact-sheets/detail/family-planning-contraception'],
      ['MoH Kenya — Family Planning Guidelines', 'https://www.health.go.ke/family-planning'],
      ['UNFPA — Contraceptive Safety Evidence', 'https://www.unfpa.org/contraception'],
    ],
    response: 'FACT: Modern contraceptives do NOT cause permanent infertility. According to WHO and Kenya MoH, fertility returns within weeks to months after stopping most contraceptive methods. Millions of Kenyan women use contraceptives safely every year. For accurate information, speak to a trained health worker.',
  },
  cse: {
    match: (t) => /sexuality education|cse|promiscu/.test(t),
    sources: [
      ['UNESCO — International Technical Guidance on Sexuality Education', 'https://www.unesco.org/en/health-education/cse'],
      ['WHO — Adolescent SRH Evidence', 'https://www.who.int/teams/sexual-and-reproductive-health-and-research/key-aspects/adolescents-and-sexual-reproductive-health'],
    ],
    response: 'FACT: Evidence from UNESCO and WHO shows age-appropriate sexuality education DELAYS sexual debut and reduces teen pregnancy and STIs. It equips children to recognise and report abuse. It protects — it does not corrupt.',
  },
  hiv: {
    match: (t) => /hiv|faith.?heal|miracle|arv|herbs/.test(t),
    sources: [
      ['NASCOP — HIV Treatment Guidelines', 'https://www.nascop.or.ke/'],
      ['UNAIDS — Undetectable = Untransmittable', 'https://www.unaids.org/en/resources/presscentre/featurestories/2018/july/undetectable-untransmittable'],
    ],
    response: 'FACT: There is no faith or herbal cure for HIV. Stopping ARVs after a "healing" claim is life-threatening. With consistent treatment, people living with HIV lead full lives and cannot transmit the virus once virally suppressed (U=U). Always confirm status changes with a clinic test — never a testimony.',
  },
  abortion: {
    match: (t) => /abortion|termination|womb/.test(t),
    sources: [
      ['Constitution of Kenya, Article 26(4)', 'http://kenyalaw.org/lex/actview.xql?actid=Const2010'],
      ['WHO — Abortion Care Guideline', 'https://www.who.int/publications/i/item/9789240039483'],
    ],
    response: 'FACT: Safe abortion is NOT illegal in all circumstances in Kenya. Article 26(4) of the Constitution permits it when, in the opinion of a trained health professional, the life or health of the mother is in danger. Unsafe, hidden procedures are what cause lasting harm.',
  },
}
const libFor = (claim) => Object.values(RESPONSE_LIBRARY).find(l => l.match((claim || '').toLowerCase()))

const VERDICTS = { false:['FALSE', C.coral], misleading:['MISLEADING', C.gold], partially_false:['PARTIALLY FALSE', C.sky] }
const SPREAD   = { high:'🔥 High spread', medium:'⚡ Medium spread', low:'• Low spread' }

export default function Watch({ session }) {
  const { user, name, isAdmin } = session
  const [claims, setClaims] = useState([])
  const [open, setOpen] = useState(null)
  const [reporting, setReporting] = useState(false)

  const load = () => sb.from('disinformation_claims').select('*').eq('is_active', true)
    .order('flagged_date', { ascending:false }).limit(50)
    .then(({ data }) => setClaims(data || []))
  useEffect(() => { load() }, [])

  const copyResponse = async (d) => {
    const lib = libFor(d.claim)
    const text = (lib?.response || d.correction || '') +
      (lib ? '\n\nSources:\n' + lib.sources.map(s => `• ${s[0]}: ${s[1]}`).join('\n') : '')
    try { await navigator.clipboard.writeText(text); toast('✓ Response template copied — paste it where the myth is spreading', 'green') }
    catch { toast('Copy failed — long-press to select manually', 'red') }
  }

  return (
    <div>
      <ScreenTitle accent={C.coral} kicker="Disinformation Watch" title="Claims, verdicts & ready responses"
        sub="Every flagged claim ships with a verified-source response template. Copy, paste, counter — where the myth is spreading."/>

      <div style={{ marginBottom:14 }}>
        <Btn small onClick={() => user ? setReporting(r=>!r) : toast('Sign in to report a claim', 'red')} color={C.coral}>
          {reporting ? '✕ Close' : '🚩 Report a spreading claim'}
        </Btn>
      </div>
      {reporting && <ReportForm name={name} onDone={() => { setReporting(false); load() }}/>}

      {claims.map(d => {
        const [vLabel, vColor] = VERDICTS[d.verdict] || ['UNVERIFIED', C.mut]
        const lib = libFor(d.claim)
        const isOpen = open === d.id
        return (
          <div key={d.id} onClick={() => setOpen(isOpen ? null : d.id)}
            style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${vColor}`,
              borderRadius:12, padding:16, marginBottom:9, cursor:'pointer' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              <span style={{ fontFamily:C.sans, fontSize:9.5, fontWeight:800, letterSpacing:'.08em',
                color:vColor, border:`1px solid ${vColor}`, borderRadius:5, padding:'2px 8px' }}>{vLabel}</span>
              <span style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut }}>
                {SPREAD[d.spread_level] || ''} · flagged {timeAgo(d.flagged_date)}
                {(d.platforms || []).length ? ' · ' + d.platforms.join(', ') : ''}
              </span>
            </div>
            <p style={{ fontFamily:C.sans, fontSize:14.5, fontWeight:800, color:C.txt, margin:'0 0 6px', lineHeight:1.45,
              overflowWrap:'anywhere', wordBreak:'break-word' }}>
              "{d.claim}"
            </p>
            <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.mint, margin:0, lineHeight:1.6,
              overflowWrap:'anywhere', wordBreak:'break-word' }}>{d.correction}</p>

            {isOpen && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${C.line}` }} onClick={e=>e.stopPropagation()}>
                {lib && (
                  <>
                    <SectionLabel color={C.sky}>Verified sources</SectionLabel>
                    {lib.sources.map((s,i) => (
                      <a key={i} href={s[1]} target="_blank" rel="noopener noreferrer"
                        style={{ display:'block', fontFamily:C.sans, fontSize:12, color:C.sky,
                          textDecoration:'none', marginBottom:5, fontWeight:700 }}>📎 {s[0]} →</a>
                    ))}
                    <SectionLabel color={C.gold}>Standard response</SectionLabel>
                    <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, lineHeight:1.65,
                      background:C.card2, borderRadius:10, padding:'10px 12px', margin:'0 0 10px' }}>{lib.response}</p>
                  </>
                )}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <Btn small onClick={() => copyResponse(d)}>📋 Copy response template</Btn>
                  {isAdmin && (
                    <Btn small ghost onClick={async () => {
                      await sb.from('disinformation_claims').update({ is_active:false }).eq('id', d.id)
                      toast('Claim archived', 'gold'); load()
                    }}>🗄 Archive (admin)</Btn>
                  )}
                </div>
              </div>
            )}
            <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.gold, margin:'8px 0 0', fontWeight:800 }}>
              {isOpen ? '▲ Close' : '👆 Sources & response template'}
            </p>
          </div>
        )
      })}
      {claims.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>No active claims — quiet on the western front.</p>}
    </div>
  )
}

function ReportForm({ name, onDone }) {
  const [claim, setClaim] = useState('')
  const [platforms, setPlatforms] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (claim.trim().length < 10) { toast('Describe the claim in a sentence or two', 'red'); return }
    setBusy(true)
    const { error } = await sb.from('disinformation_claims').insert({
      claim: claim.trim(), correction: 'Pending network review.',
      verdict: 'misleading', spread_level: 'medium',
      platforms: platforms ? platforms.split(',').map(s=>s.trim()).filter(Boolean) : [],
      is_active: true, flagged_date: new Date().toISOString(),
    })
    if (!error) {
      logActivity('discussion_start', `🚩 ${name || 'A member'} reported a new disinformation claim for network review`, claim.slice(0,80), 'red')
      toast('Reported — the network has been alerted', 'green'); onDone()
    } else toast(error.message, 'red')
    setBusy(false)
  }
  return (
    <div style={{ background:C.card, border:`1px solid ${C.coral}55`, borderRadius:12, padding:14, marginBottom:14 }}>
      <textarea style={{ ...inputStyle, minHeight:70 }} placeholder='The claim, as people are saying it — e.g. "They are putting…"'
        value={claim} onChange={e=>setClaim(e.target.value)}/>
      <input style={inputStyle} placeholder="Where is it spreading? (WhatsApp, TikTok, X — comma separated)"
        value={platforms} onChange={e=>setPlatforms(e.target.value)}/>
      <Btn small onClick={submit} disabled={busy} color={C.coral}>{busy ? 'Reporting…' : '🚩 Flag for the network'}</Btn>
    </div>
  )
}
