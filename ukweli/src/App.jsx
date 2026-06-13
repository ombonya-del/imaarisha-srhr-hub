import { useState, useEffect } from 'react'
import { sb, timeAgo } from './lib/supabase'
import { useLang, LANGS } from './lib/i18n'
import { LEARN } from './lib/learn'

// ── Ukweli — youth-facing PWA. No accounts, no names, quick exit. ─────────────
// Identity: bright, bold, youthful. Energetic coral/violet/teal on warm paper —
// a Gen-Z consumer feel, deliberately different from the CSO hub's calm ops room.
const Y = {
  bg:    '#FFF6EE',
  card:  '#FFFFFF',
  card2: '#FBF1FF',
  ink:   '#211833',
  line:  'rgba(33,24,51,0.10)',
  coral: '#FF4D6D',
  violet:'#7B5CFF',
  teal:  '#00C2A8',
  yellow:'#FFC93C',
  blue:  '#2EA0FF',
  mut:   '#8A7FA0',
  disp:  "'Fredoka', 'Nunito Sans', sans-serif",
  sans:  "'Nunito Sans', sans-serif",
}

const TAB_ACCENT = { ask: Y.violet, myths: Y.coral, learn: Y.teal }
const MYTH_COLORS = [Y.coral, Y.violet, Y.teal, Y.blue, Y.yellow]

export default function App() {
  const { tr, lang, setLang } = useLang()
  const [tab, setTab] = useState('ask')

  // Quick exit — instant redirect to a neutral site, replaces history entry
  const quickExit = () => { try { window.location.replace('https://www.google.com/search?q=weather+nairobi') } catch {} }

  return (
    <div style={{ background:Y.bg, minHeight:'100vh', fontFamily:Y.sans, color:Y.ink,
      maxWidth:480, margin:'0 auto', position:'relative', overflowX:'hidden' }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        body { margin:0; background:${Y.bg};
          background-image:
            radial-gradient(520px 360px at 110% -8%, rgba(123,92,255,0.16), transparent 60%),
            radial-gradient(480px 340px at -10% 4%, rgba(255,77,109,0.14), transparent 60%),
            radial-gradient(560px 420px at 50% 116%, rgba(0,194,168,0.12), transparent 60%);
          background-attachment: fixed; }
        @keyframes pop { from { transform: scale(.97); opacity:.6 } to { transform:none; opacity:1 } }
        .uk-card { animation: pop .18s ease; }
        .uk-press:active { transform: scale(.985); }
      `}</style>

      {/* Top bar */}
      <header style={{ position:'sticky', top:0, zIndex:10, background:'rgba(255,246,238,0.86)',
        backdropFilter:'blur(12px)', borderBottom:`1px solid ${Y.line}`,
        padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <img src="/icon-192.png" alt="" width={30} height={30}
            style={{ borderRadius:9, boxShadow:'0 2px 8px rgba(123,92,255,0.4)' }}/>
          <div style={{ fontFamily:Y.disp, fontSize:22, fontWeight:600, letterSpacing:'-.01em', lineHeight:1 }}>
            Ukweli<span style={{ color:Y.coral }}>SRHR</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', gap:2, background:Y.card2, borderRadius:20, padding:3, border:`1px solid ${Y.line}` }}>
            {LANGS.map(([code,label]) => (
              <button key={code} onClick={()=>setLang(code)}
                style={{ fontFamily:Y.sans, fontSize:10.5, fontWeight:800, padding:'4px 10px', borderRadius:16, border:'none',
                  cursor:'pointer', background: lang===code?Y.ink:'transparent', color: lang===code?'#fff':Y.mut }}>{label}</button>
            ))}
          </div>
          <button onClick={quickExit} title="Leave this site instantly" className="uk-press"
            style={{ fontFamily:Y.disp, fontSize:11, fontWeight:600, padding:'6px 12px', borderRadius:16,
              border:'none', background:Y.coral, color:'#fff', cursor:'pointer', whiteSpace:'nowrap',
              boxShadow:'0 2px 8px rgba(255,77,109,0.4)' }}>
            ✕ {tr('exit')}
          </button>
        </div>
      </header>

      <main style={{ padding:'18px 16px 104px' }}>
        <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.ink, opacity:.7, margin:'0 0 18px', lineHeight:1.6, fontWeight:600 }}>
          {tr('tagline')}
        </p>
        {tab === 'ask'   && <Uliza tr={tr} lang={lang} />}
        {tab === 'myths' && <Myths tr={tr} lang={lang} />}
        {tab === 'learn' && <Learn tr={tr} lang={lang} />}
      </main>

      {/* Bottom nav — chunky, each tab lights up in its own colour */}
      <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480,
        background:'rgba(255,246,238,0.94)', backdropFilter:'blur(12px)', borderTop:`1px solid ${Y.line}`,
        display:'flex', justifyContent:'space-around', gap:8,
        padding:'10px 14px calc(10px + env(safe-area-inset-bottom))', zIndex:20 }}>
        {[['ask','💬'],['myths','⚡'],['learn','📖']].map(([id,icon]) => {
          const on = tab === id
          const acc = TAB_ACCENT[id]
          return (
            <button key={id} onClick={()=>setTab(id)} className="uk-press"
              style={{ flex:1, cursor:'pointer', border:'none', borderRadius:16,
                display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px 0',
                background: on ? acc : 'transparent',
                color: on ? '#fff' : Y.mut,
                boxShadow: on ? `0 4px 14px ${acc}66` : 'none', transition:'all .15s ease' }}>
              <span style={{ fontSize:16, lineHeight:1, filter: on?'none':'grayscale(1) opacity(.6)' }}>{icon}</span>
              <span style={{ fontFamily:Y.disp, fontSize:13.5, fontWeight:600 }}>{tr(id==='ask'?'ask_anon':id)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

// ── Uliza: anonymous Q&A ─────────────────────────────────────────────────────
function Uliza({ tr, lang }) {
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
      <div className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`, borderTop:`4px solid ${Y.violet}`,
        borderRadius:18, padding:18, marginBottom:20, boxShadow:'0 8px 24px rgba(123,92,255,0.10)' }}>
        {sent ? (
          <div>
            <p style={{ fontFamily:Y.sans, fontSize:14, color:Y.ink, margin:0, lineHeight:1.6, fontWeight:600 }}>
              {tr('ask_sent')}
            </p>
            <button onClick={()=>setSent(false)} className="uk-press" style={{ marginTop:12, background:Y.card2,
              border:`1px solid ${Y.line}`, color:Y.violet, fontFamily:Y.disp, fontSize:13, fontWeight:600, padding:'9px 16px',
              borderRadius:12, cursor:'pointer' }}>{tr('ask_another')}</button>
          </div>
        ) : (
          <>
            <textarea value={q} onChange={e=>setQ(e.target.value)}
              placeholder={tr('ask_placeholder')}
              style={{ width:'100%', boxSizing:'border-box', minHeight:96, resize:'vertical', background:Y.card2,
                border:`1px solid ${Y.line}`, borderRadius:14, padding:'13px', color:Y.ink,
                fontFamily:Y.sans, fontSize:14, outline:'none', lineHeight:1.5 }}/>
            <button onClick={submit} disabled={busy || q.trim().length < 8} className="uk-press"
              style={{ marginTop:12, width:'100%', fontFamily:Y.disp, fontSize:15, fontWeight:600, padding:'14px 0',
                borderRadius:14, border:'none', cursor:'pointer', color:'#fff',
                background:`linear-gradient(135deg, ${Y.violet}, ${Y.coral})`,
                boxShadow:'0 6px 18px rgba(123,92,255,0.35)',
                opacity: q.trim().length<8?0.45:1 }}>
              {busy ? tr('ask_sending') : `💬 ${tr('ask_cta')}`}
            </button>
            <p style={{ fontFamily:Y.sans, fontSize:11, color:Y.mut, margin:'10px 0 0', textAlign:'center', fontWeight:700 }}>
              🔒 {tr('ask_privacy')}
            </p>
          </>
        )}
      </div>

      <SectionLabel color={Y.violet}>{tr('answered_label')}</SectionLabel>
      {answered.length === 0 && (
        <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.mut, fontStyle:'italic' }}>{tr('no_answers')}</p>
      )}
      {answered.map(a => (
        <div key={a.id} className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`, borderRadius:16,
          padding:16, marginBottom:10, boxShadow:'0 4px 14px rgba(33,24,51,0.05)' }}>
          <p style={{ fontFamily:Y.disp, fontSize:17, fontWeight:600, color:Y.ink, margin:'0 0 7px', lineHeight:1.25 }}>{a.question}</p>
          <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.ink, lineHeight:1.7, margin:'0 0 9px', opacity:.85 }}>{a.answer}</p>
          <p style={{ fontFamily:Y.sans, fontSize:11, color:Y.teal, margin:0, fontWeight:800 }}>
            ✓ {a.answered_by || tr('verified_pro')} · {timeAgo(a.answered_at)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Myth-buster cards ────────────────────────────────────────────────────────
function Myths({ tr, lang }) {
  const [cards, setCards] = useState(null)
  const [open, setOpen] = useState(null)
  useEffect(() => {
    sb.from('ukweli_cards').select('*').eq('active', true).order('sort_order')
      .then(({data}) => setCards(data || []))
  }, [])
  const byLang = (cards || []).filter(c => c.language === lang)
  const list = byLang.length ? byLang : (cards || []).filter(c => c.language === 'en')

  return (
    <div>
      <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.ink, opacity:.7, margin:'0 0 16px', lineHeight:1.6, fontWeight:600 }}>
        {tr('myths_intro')}
      </p>
      {cards === null && <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.mut, fontStyle:'italic' }}>{tr('loading')}</p>}
      {cards !== null && list.length === 0 && (
        <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.mut, fontStyle:'italic' }}>{tr('no_answers')}</p>
      )}
      {list.map((c, i) => {
        const acc = MYTH_COLORS[i % MYTH_COLORS.length]
        const isOpen = open === c.id
        return (
          <div key={c.id} onClick={()=>setOpen(isOpen?null:c.id)} className="uk-card uk-press"
            style={{ background:Y.card, border:`1px solid ${Y.line}`, borderLeft:`5px solid ${acc}`,
              borderRadius:16, padding:16, marginBottom:11, cursor:'pointer',
              boxShadow:'0 4px 14px rgba(33,24,51,0.05)' }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ fontSize:18, lineHeight:1.2 }}>💬</span>
              <p style={{ fontFamily:Y.disp, fontSize:18, fontWeight:600, color:Y.ink, margin:0, lineHeight:1.3 }}>
                “{c.claim}”
              </p>
            </div>
            {isOpen && (
              <div style={{ marginTop:13, paddingTop:13, borderTop:`1px solid ${Y.line}` }}>
                <Block label={tr('why_feels_true')} text={c.why_it_feels_true} color={Y.yellow}/>
                <Block label={tr('the_truth')} text={c.truth} color={Y.teal}/>
                <Block label={tr('what_to_do')} text={c.what_to_do} color={Y.violet}/>
              </div>
            )}
            <p style={{ fontFamily:Y.disp, fontSize:13, color:acc, margin:'11px 0 0', fontWeight:600 }}>
              {isOpen ? `▲ ${tr('close_card')}` : `⚡ ${tr('bust_myth')}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function Block({ label, text, color }) {
  if (!text) return null
  return (
    <div style={{ marginBottom:12 }}>
      <span style={{ display:'inline-block', fontFamily:Y.disp, fontSize:10.5, fontWeight:600, letterSpacing:'.04em',
        textTransform:'uppercase', color:'#fff', background:color, padding:'2px 9px', borderRadius:8, marginBottom:6 }}>{label}</span>
      <p style={{ fontFamily:Y.sans, fontSize:14, color:Y.ink, lineHeight:1.65, margin:0, opacity:.88 }}>{text}</p>
    </div>
  )
}

// ── Learn: real SRHR explainers (from lib/learn.js) ──────────────────────────
function Learn({ tr, lang }) {
  const [open, setOpen] = useState(null)
  return (
    <div>
      <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.ink, opacity:.7, margin:'0 0 16px', lineHeight:1.6, fontWeight:600 }}>
        {tr('learn_intro')}
      </p>
      {LEARN.map(topic => {
        const t = topic[lang] || topic.en
        const isOpen = open === topic.id
        return (
          <div key={topic.id} className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`,
            borderRadius:16, marginBottom:11, overflow:'hidden', boxShadow:'0 4px 14px rgba(33,24,51,0.05)' }}>
            <button onClick={()=>setOpen(isOpen?null:topic.id)} className="uk-press"
              style={{ width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'transparent',
                display:'flex', alignItems:'center', gap:13, padding:'15px 16px' }}>
              <span style={{ width:42, height:42, borderRadius:12, flexShrink:0, fontSize:21,
                display:'flex', alignItems:'center', justifyContent:'center',
                background:topic.color + '22', border:`1px solid ${topic.color}44` }}>{topic.emoji}</span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontFamily:Y.disp, fontSize:17, fontWeight:600, color:Y.ink, lineHeight:1.2 }}>{t.title}</span>
                <span style={{ display:'block', fontFamily:Y.sans, fontSize:12, color:Y.mut, marginTop:2, lineHeight:1.4 }}>{t.intro}</span>
              </span>
              <span style={{ fontFamily:Y.disp, fontSize:15, color:topic.color, fontWeight:600 }}>{isOpen ? '–' : '+'}</span>
            </button>
            {isOpen && (
              <div style={{ padding:'2px 16px 16px' }}>
                {t.points.map(([head, body], j) => (
                  <div key={j} style={{ marginBottom:12, paddingLeft:13, borderLeft:`3px solid ${topic.color}55` }}>
                    <p style={{ fontFamily:Y.disp, fontSize:14, fontWeight:600, color:topic.color, margin:'0 0 3px' }}>{head}</p>
                    <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.ink, lineHeight:1.65, margin:0, opacity:.85 }}>{body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      <p style={{ fontFamily:Y.sans, fontSize:11, color:Y.mut, lineHeight:1.6, margin:'16px 4px 0', textAlign:'center' }}>
        {tr('learn_footer')}
      </p>
    </div>
  )
}

function SectionLabel({ children, color }) {
  return <p style={{ fontFamily:Y.disp, fontSize:12, fontWeight:600, letterSpacing:'.06em',
    textTransform:'uppercase', color, margin:'0 0 12px' }}>{children}</p>
}
