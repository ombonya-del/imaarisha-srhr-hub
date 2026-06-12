import { useState, useEffect } from 'react'
import { sb, timeAgo } from './lib/supabase'
import { useLang, LANGS } from './lib/i18n'

// ── Ukweli — youth-facing PWA. No accounts, no names, quick exit. ─────────────
// Warmer, softer identity than the CSO ops room: deep green + cream.
const Y = {
  bg:   '#0E1614',
  card: '#16241F',
  card2:'#1D2F28',
  line: 'rgba(255,255,255,0.08)',
  acc:  '#7FD1B9',   // soft mint — calm, clinical-but-kind
  warm: '#E8C97D',   // warm sand
  red:  '#E07861',
  txt:  '#F2EFE6',
  mut:  '#8FA39B',
  serif:"'Cormorant Garamond', serif",
  sans: "'Nunito Sans', sans-serif",
}

export default function App() {
  const { tr, lang, setLang } = useLang()
  const [tab, setTab] = useState('ask')

  // Quick exit — instant redirect to a neutral site, replaces history entry
  const quickExit = () => { try { window.location.replace('https://www.google.com/search?q=weather+nairobi') } catch {} }

  return (
    <div style={{ background:Y.bg, minHeight:'100vh', fontFamily:Y.sans, color:Y.txt,
      maxWidth:480, margin:'0 auto', position:'relative', overflowX:'hidden' }}>
      <style>{`* { -webkit-tap-highlight-color: transparent; } body { margin:0; background:${Y.bg}; }`}</style>

      {/* Top bar */}
      <header style={{ position:'sticky', top:0, zIndex:10, background:'rgba(14,22,20,0.94)',
        backdropFilter:'blur(8px)', borderBottom:`1px solid ${Y.line}`,
        padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ fontFamily:Y.serif, fontSize:20, fontWeight:700 }}>
          Ukweli<span style={{ color:Y.acc }}>SRHR</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', gap:3, background:Y.card, borderRadius:20, padding:3 }}>
            {LANGS.map(([code,label]) => (
              <button key={code} onClick={()=>setLang(code)}
                style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, padding:'4px 9px', borderRadius:16, border:'none',
                  cursor:'pointer', background: lang===code?Y.acc:'transparent', color: lang===code?'#0E1614':Y.mut }}>{label}</button>
            ))}
          </div>
          <button onClick={quickExit} title="Leave this site instantly"
            style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, padding:'6px 11px', borderRadius:16,
              border:`1px solid ${Y.red}`, background:'transparent', color:Y.red, cursor:'pointer', whiteSpace:'nowrap' }}>
            ✕ EXIT
          </button>
        </div>
      </header>

      <main style={{ padding:'18px 16px 90px' }}>
        <p style={{ fontFamily:Y.sans, fontSize:12.5, color:Y.mut, margin:'0 0 16px', lineHeight:1.65 }}>
          Straight answers about your body, your health, your choices. Anonymous. No judgment.
          Answered by real health professionals.
        </p>
        {tab === 'ask'   && <Uliza lang={lang} />}
        {tab === 'myths' && <Myths tr={tr} lang={lang} />}
        {tab === 'learn' && <Learn />}
      </main>

      {/* Bottom nav */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480,
        background:'rgba(22,36,31,0.96)', backdropFilter:'blur(10px)', borderTop:`1px solid ${Y.line}`,
        display:'flex', justifyContent:'space-around', padding:'8px 0 calc(8px + env(safe-area-inset-bottom))', zIndex:20 }}>
        {[['ask','💬', tr('ask_anon')],['myths','⚡', tr('myths')],['learn','▶', tr('learn')]].map(([id,icon,label]) => {
          const on = tab === id
          return (
            <button key={id} onClick={()=>setTab(id)}
              style={{ background:'none', border:'none', cursor:'pointer', display:'flex', flexDirection:'column',
                alignItems:'center', gap:3, padding:'2px 10px', flex:1 }}>
              <span style={{ fontSize:17, lineHeight:1, filter: on?'none':'grayscale(1) opacity(0.55)' }}>{icon}</span>
              <span style={{ fontFamily:Y.sans, fontSize:10, fontWeight:on?800:600, color:on?Y.acc:Y.mut }}>{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── Uliza: anonymous Q&A ─────────────────────────────────────────────────────
function Uliza({ lang }) {
  const [answered, setAnswered] = useState([])
  const [q, setQ] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    sb.from('uliza_questions').select('*').eq('status','answered')
      .order('answered_at',{ascending:false}).limit(40).then(({data}) => setAnswered(data || []))
  }, [])

  const submit = async () => {
    if (q.trim().length < 8) return
    setBusy(true)
    const { error } = await sb.from('uliza_questions').insert({ question: q.trim(), language: lang })
    setBusy(false)
    if (!error) { setSent(true); setQ('') }
  }

  return (
    <div>
      <div style={{ background:Y.card, border:`1px solid ${Y.line}`, borderRadius:14, padding:16, marginBottom:18 }}>
        {sent ? (
          <div>
            <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.acc, margin:0, lineHeight:1.6 }}>
              ✓ Sent. No name attached — not even we know who asked. A verified health worker will answer; check back here.
            </p>
            <button onClick={()=>setSent(false)} style={{ marginTop:10, background:'none',
              border:`1px solid ${Y.line}`, color:Y.mut, fontFamily:Y.sans, fontSize:11, padding:'7px 14px',
              borderRadius:8, cursor:'pointer' }}>Ask another</button>
          </div>
        ) : (
          <>
            <textarea value={q} onChange={e=>setQ(e.target.value)}
              placeholder="Ask anything — contraception, HIV, your body, your rights. Nobody will know it was you."
              style={{ width:'100%', boxSizing:'border-box', minHeight:88, resize:'vertical', background:Y.card2,
                border:`1px solid ${Y.line}`, borderRadius:10, padding:'12px', color:Y.txt,
                fontFamily:Y.sans, fontSize:13.5, outline:'none', lineHeight:1.5 }}/>
            <button onClick={submit} disabled={busy || q.trim().length < 8}
              style={{ marginTop:10, width:'100%', fontFamily:Y.sans, fontSize:13, fontWeight:800, padding:'12px 0',
                borderRadius:10, border:'none', cursor:'pointer', background:Y.acc, color:'#0E1614',
                opacity: q.trim().length<8?0.45:1 }}>
              {busy ? 'Sending…' : '💬 Ask anonymously'}
            </button>
            <p style={{ fontFamily:Y.sans, fontSize:10.5, color:Y.mut, margin:'8px 0 0', textAlign:'center' }}>
              No account · no name · no trace on your profile
            </p>
          </>
        )}
      </div>

      <p style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:Y.mut, marginBottom:10 }}>
        Already answered
      </p>
      {answered.length === 0 && (
        <p style={{ fontFamily:Y.sans, fontSize:12, color:Y.mut, fontStyle:'italic' }}>No answered questions yet — yours could be the first.</p>
      )}
      {answered.map(a => (
        <div key={a.id} style={{ background:Y.card, border:`1px solid ${Y.line}`, borderRadius:12, padding:14, marginBottom:8 }}>
          <p style={{ fontFamily:Y.serif, fontSize:17, fontWeight:700, color:Y.txt, margin:'0 0 6px', lineHeight:1.3 }}>{a.question}</p>
          <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.txt, lineHeight:1.7, margin:'0 0 8px', opacity:.92 }}>{a.answer}</p>
          <p style={{ fontFamily:Y.sans, fontSize:10.5, color:Y.acc, margin:0, fontWeight:700 }}>
            ✓ {a.answered_by || 'Verified health professional'} · {timeAgo(a.answered_at)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Myth-buster cards ────────────────────────────────────────────────────────
function Myths({ tr, lang }) {
  const [cards, setCards] = useState([])
  const [open, setOpen] = useState(null)
  useEffect(() => {
    sb.from('ukweli_cards').select('*').eq('active', true).order('sort_order')
      .then(({data}) => setCards(data || []))
  }, [])
  const byLang = cards.filter(c => c.language === lang)
  const list = byLang.length ? byLang : cards.filter(c => c.language === 'en')

  return (
    <div>
      {list.length === 0 && <p style={{ fontFamily:Y.sans, fontSize:12, color:Y.mut, fontStyle:'italic' }}>Loading…</p>}
      {list.map(c => (
        <div key={c.id} onClick={()=>setOpen(open===c.id?null:c.id)}
          style={{ background:Y.card, border:`1px solid ${Y.line}`, borderLeft:`3px solid ${Y.red}`,
            borderRadius:12, padding:15, marginBottom:9, cursor:'pointer' }}>
          <p style={{ fontFamily:Y.serif, fontSize:18, fontWeight:700, color:Y.txt, margin:0, lineHeight:1.3 }}>
            "{c.claim}"
          </p>
          {open === c.id && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${Y.line}` }}>
              <Block label={tr('why_feels_true')} text={c.why_it_feels_true} color={Y.warm}/>
              <Block label={tr('the_truth')} text={c.truth} color={Y.acc}/>
              <Block label={tr('what_to_do')} text={c.what_to_do} color={Y.txt}/>
            </div>
          )}
          <p style={{ fontFamily:Y.sans, fontSize:11, color:Y.acc, margin:'9px 0 0', fontWeight:800 }}>
            {open===c.id ? '▲ Close' : '⚡ Bust this myth'}
          </p>
        </div>
      ))}
    </div>
  )
}

function Block({ label, text, color }) {
  if (!text) return null
  return (
    <div style={{ marginBottom:11 }}>
      <p style={{ fontFamily:Y.sans, fontSize:9.5, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color, margin:'0 0 3px' }}>{label}</p>
      <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, lineHeight:1.65, margin:0, opacity:.92 }}>{text}</p>
    </div>
  )
}

function Learn() {
  return (
    <div style={{ background:Y.card, border:`1px dashed ${Y.line}`, borderRadius:14, padding:26, textAlign:'center' }}>
      <p style={{ fontSize:30, margin:'0 0 8px' }}>▶</p>
      <p style={{ fontFamily:Y.serif, fontSize:19, fontWeight:700, color:Y.txt, margin:'0 0 6px' }}>Videos & podcast — coming soon</p>
      <p style={{ fontFamily:Y.sans, fontSize:12.5, color:Y.mut, lineHeight:1.65, margin:0 }}>
        Real talk about contraception, relationships, and your rights — from Kenyan health workers
        and people like you. Short videos and a podcast, in English, Kiswahili na Sheng.
      </p>
    </div>
  )
}
