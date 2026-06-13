import { useState, useEffect } from 'react'
import { sb, timeAgo } from './lib/supabase'
import { useLang, LANGS } from './lib/i18n'
import { LEARN } from './lib/learn'

// ── Ukweli — youth-facing PWA. No accounts, no names, quick exit. ─────────────
// Identity: evergreen + sophisticated. Deep forest base gives cards real
// figure-ground contrast; spring-green signals youth/growth; coral & gold add
// energy. Mobile-first (bottom nav) with a responsive desktop top nav.
const Y = {
  bg:    '#0A2620',   // deep evergreen
  card:  '#0F3329',   // elevated surface
  card2: '#17463A',   // lighter surface
  line:  'rgba(214,243,230,0.12)',
  green: '#3FE0A0',   // spring green — primary, youthful
  teal:  '#2FD0C4',
  coral: '#FF6F61',
  gold:  '#F2C75C',
  txt:   '#F1F5EE',
  mut:   '#88AE9D',
  disp:  "'Space Grotesk', system-ui, sans-serif",
  sans:  "'Plus Jakarta Sans', system-ui, sans-serif",
}

const TABS = [['ask','💬'],['myths','⚡'],['learn','📖']]
const TAB_ACCENT = { ask: Y.green, myths: Y.coral, learn: Y.teal }
const MYTH_COLORS = [Y.coral, Y.green, Y.teal, Y.gold]

export default function App() {
  const { tr, lang, setLang } = useLang()
  const [tab, setTab] = useState('ask')
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const fn = e => setIsDesktop(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const quickExit = () => { try { window.location.replace('https://www.google.com/search?q=weather+nairobi') } catch {} }
  const maxW = isDesktop ? 760 : 480

  return (
    <div style={{ background:Y.bg, minHeight:'100vh', fontFamily:Y.sans, color:Y.txt, position:'relative', overflowX:'hidden' }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { margin:0; background:${Y.bg};
          background-image:
            radial-gradient(640px 440px at 108% -6%, rgba(47,208,196,0.18), transparent 60%),
            radial-gradient(520px 380px at -8% 2%, rgba(63,224,160,0.14), transparent 62%),
            radial-gradient(620px 460px at 50% 118%, rgba(255,111,97,0.12), transparent 60%);
          background-attachment: fixed; }
        ::-webkit-scrollbar { width:8px } ::-webkit-scrollbar-thumb { background:#1d4a3c; border-radius:4px }
        @keyframes pop { from { transform: translateY(4px); opacity:0 } to { transform:none; opacity:1 } }
        .uk-card { animation: pop .2s ease; }
        .uk-press { transition: transform .12s ease, box-shadow .15s ease, background .15s ease; }
        .uk-press:active { transform: scale(.985); }
        .uk-navlink { transition: color .15s ease, border-color .15s ease; }
      `}</style>

      {/* identity stripe */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:30,
        background:`linear-gradient(90deg, ${Y.green} 0%, ${Y.teal} 50%, ${Y.coral} 100%)` }}/>

      {/* Top bar */}
      <header style={{ position:'sticky', top:3, zIndex:10, background:'rgba(10,38,32,0.82)',
        backdropFilter:'blur(14px)', borderBottom:`1px solid ${Y.line}` }}>
        <div style={{ maxWidth:maxW, margin:'0 auto', padding:'12px 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/icon-192.png" alt="" width={30} height={30}
              style={{ borderRadius:9, boxShadow:'0 2px 10px rgba(47,208,196,0.35)' }}/>
            <div style={{ fontFamily:Y.disp, fontSize:21, fontWeight:600, letterSpacing:'-.02em', lineHeight:1 }}>
              Ukweli<span style={{ color:Y.green }}>SRHR</span>
            </div>
          </div>

          {/* Desktop inline nav */}
          {isDesktop && (
            <nav style={{ display:'flex', gap:4, flex:1, justifyContent:'center' }}>
              {TABS.map(([id,icon]) => {
                const on = tab === id, acc = TAB_ACCENT[id]
                return (
                  <button key={id} onClick={()=>setTab(id)} className="uk-navlink uk-press"
                    style={{ fontFamily:Y.disp, fontSize:14.5, fontWeight:600, padding:'9px 16px', borderRadius:12,
                      border:'none', cursor:'pointer', letterSpacing:'.01em',
                      background: on ? acc : 'transparent', color: on ? '#06241C' : Y.mut,
                      boxShadow: on ? `0 4px 14px ${acc}55` : 'none' }}>
                    <span style={{ marginRight:6, filter:on?'none':'grayscale(1) opacity(.7)' }}>{icon}</span>{tr(id==='ask'?'ask_anon':id)}
                  </button>
                )
              })}
            </nav>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.06)', borderRadius:20, padding:3, border:`1px solid ${Y.line}` }}>
              {LANGS.map(([code,label]) => (
                <button key={code} onClick={()=>setLang(code)}
                  style={{ fontFamily:Y.sans, fontSize:10.5, fontWeight:700, padding:'4px 10px', borderRadius:16, border:'none',
                    cursor:'pointer', background: lang===code?Y.txt:'transparent', color: lang===code?Y.bg:Y.mut }}>{label}</button>
              ))}
            </div>
            <button onClick={quickExit} title="Leave this site instantly" className="uk-press"
              style={{ fontFamily:Y.disp, fontSize:11, fontWeight:600, padding:'6px 12px', borderRadius:16,
                border:`1px solid ${Y.coral}`, background:'rgba(255,111,97,0.12)', color:Y.coral, cursor:'pointer', whiteSpace:'nowrap' }}>
              ✕ {tr('exit')}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:maxW, margin:'0 auto', padding: isDesktop ? '26px 16px 60px' : '20px 16px 108px' }}>
        <p style={{ fontFamily:Y.sans, fontSize: isDesktop?16:14, color:Y.txt, opacity:.82, margin:'0 0 22px',
          lineHeight:1.6, fontWeight:500, maxWidth:560 }}>
          {tr('tagline')}
        </p>
        {tab === 'ask'   && <Uliza tr={tr} lang={lang} isDesktop={isDesktop} />}
        {tab === 'myths' && <Myths tr={tr} lang={lang} isDesktop={isDesktop} />}
        {tab === 'learn' && <Learn tr={tr} lang={lang} isDesktop={isDesktop} />}
      </main>

      {/* Mobile bottom nav — chunky, each tab lights up in its own colour */}
      {!isDesktop && (
        <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480,
          background:'rgba(10,38,32,0.95)', backdropFilter:'blur(14px)', borderTop:`1px solid ${Y.line}`,
          display:'flex', justifyContent:'space-around', gap:8,
          padding:'10px 14px calc(10px + env(safe-area-inset-bottom))', zIndex:20 }}>
          {TABS.map(([id,icon]) => {
            const on = tab === id, acc = TAB_ACCENT[id]
            return (
              <button key={id} onClick={()=>setTab(id)} className="uk-press"
                style={{ flex:1, cursor:'pointer', border:'none', borderRadius:14,
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px 0',
                  background: on ? acc : 'transparent', color: on ? '#06241C' : Y.mut,
                  boxShadow: on ? `0 4px 14px ${acc}55` : 'none' }}>
                <span style={{ fontSize:16, lineHeight:1, filter: on?'none':'grayscale(1) opacity(.6)' }}>{icon}</span>
                <span style={{ fontFamily:Y.disp, fontSize:13.5, fontWeight:600 }}>{tr(id==='ask'?'ask_anon':id)}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

// ── Uliza: anonymous Q&A ─────────────────────────────────────────────────────
function Uliza({ tr, lang, isDesktop }) {
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
      <div className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`, borderTop:`3px solid ${Y.green}`,
        borderRadius:18, padding:isDesktop?22:18, marginBottom:22, boxShadow:'0 10px 30px rgba(0,0,0,0.28)' }}>
        {sent ? (
          <div>
            <p style={{ fontFamily:Y.sans, fontSize:14, color:Y.txt, margin:0, lineHeight:1.6, fontWeight:500 }}>
              {tr('ask_sent')}
            </p>
            <button onClick={()=>setSent(false)} className="uk-press" style={{ marginTop:13, background:Y.card2,
              border:`1px solid ${Y.line}`, color:Y.green, fontFamily:Y.disp, fontSize:13, fontWeight:600, padding:'9px 16px',
              borderRadius:12, cursor:'pointer' }}>{tr('ask_another')}</button>
          </div>
        ) : (
          <>
            <textarea value={q} onChange={e=>setQ(e.target.value)}
              placeholder={tr('ask_placeholder')}
              style={{ width:'100%', minHeight:100, resize:'vertical', background:Y.bg,
                border:`1px solid ${Y.line}`, borderRadius:14, padding:'13px', color:Y.txt,
                fontFamily:Y.sans, fontSize:14.5, outline:'none', lineHeight:1.5 }}/>
            <button onClick={submit} disabled={busy || q.trim().length < 8} className="uk-press"
              style={{ marginTop:12, width:'100%', fontFamily:Y.disp, fontSize:15, fontWeight:600, padding:'14px 0',
                borderRadius:14, border:'none', cursor:'pointer', color:'#06241C',
                background:`linear-gradient(135deg, ${Y.green}, ${Y.teal})`,
                boxShadow:'0 8px 20px rgba(63,224,160,0.28)',
                opacity: q.trim().length<8?0.45:1 }}>
              {busy ? tr('ask_sending') : `💬 ${tr('ask_cta')}`}
            </button>
            <p style={{ fontFamily:Y.sans, fontSize:11.5, color:Y.mut, margin:'10px 0 0', textAlign:'center', fontWeight:600 }}>
              🔒 {tr('ask_privacy')}
            </p>
          </>
        )}
      </div>

      <SectionLabel color={Y.green}>{tr('answered_label')}</SectionLabel>
      {answered.length === 0 && (
        <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.mut, fontStyle:'italic' }}>{tr('no_answers')}</p>
      )}
      <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap:11 }}>
        {answered.map(a => (
          <div key={a.id} className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`, borderRadius:16,
            padding:16, boxShadow:'0 6px 18px rgba(0,0,0,0.20)' }}>
            <p style={{ fontFamily:Y.disp, fontSize:16.5, fontWeight:600, color:Y.txt, margin:'0 0 7px', lineHeight:1.3 }}>{a.question}</p>
            <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, lineHeight:1.7, margin:'0 0 9px', opacity:.8 }}>{a.answer}</p>
            <p style={{ fontFamily:Y.sans, fontSize:11, color:Y.green, margin:0, fontWeight:700 }}>
              ✓ {a.answered_by || tr('verified_pro')} · {timeAgo(a.answered_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Myth-buster cards ────────────────────────────────────────────────────────
function Myths({ tr, lang, isDesktop }) {
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
      <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, opacity:.7, margin:'0 0 18px', lineHeight:1.6, fontWeight:500 }}>
        {tr('myths_intro')}
      </p>
      {cards === null && <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.mut, fontStyle:'italic' }}>{tr('loading')}</p>}
      {cards !== null && list.length === 0 && (
        <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.mut, fontStyle:'italic' }}>{tr('no_answers')}</p>
      )}
      <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap:12 }}>
        {list.map((c, i) => {
          const acc = MYTH_COLORS[i % MYTH_COLORS.length]
          const isOpen = open === c.id
          return (
            <div key={c.id} onClick={()=>setOpen(isOpen?null:c.id)} className="uk-card uk-press"
              style={{ background:Y.card, border:`1px solid ${Y.line}`, borderLeft:`4px solid ${acc}`,
                borderRadius:16, padding:16, cursor:'pointer', alignSelf:'start',
                boxShadow:'0 6px 18px rgba(0,0,0,0.20)' }}>
              <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:17, lineHeight:1.25 }}>💬</span>
                <p style={{ fontFamily:Y.disp, fontSize:17.5, fontWeight:600, color:Y.txt, margin:0, lineHeight:1.3 }}>
                  “{c.claim}”
                </p>
              </div>
              {isOpen && (
                <div style={{ marginTop:13, paddingTop:13, borderTop:`1px solid ${Y.line}` }}>
                  <Block label={tr('why_feels_true')} text={c.why_it_feels_true} color={Y.gold}/>
                  <Block label={tr('the_truth')} text={c.truth} color={Y.green}/>
                  <Block label={tr('what_to_do')} text={c.what_to_do} color={Y.teal}/>
                </div>
              )}
              <p style={{ fontFamily:Y.disp, fontSize:13, color:acc, margin:'12px 0 0', fontWeight:600 }}>
                {isOpen ? `▲ ${tr('close_card')}` : `⚡ ${tr('bust_myth')}`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Block({ label, text, color }) {
  if (!text) return null
  return (
    <div style={{ marginBottom:12 }}>
      <span style={{ display:'inline-block', fontFamily:Y.disp, fontSize:10.5, fontWeight:600, letterSpacing:'.04em',
        textTransform:'uppercase', color:'#06241C', background:color, padding:'2px 9px', borderRadius:8, marginBottom:6 }}>{label}</span>
      <p style={{ fontFamily:Y.sans, fontSize:14, color:Y.txt, lineHeight:1.65, margin:0, opacity:.85 }}>{text}</p>
    </div>
  )
}

// ── Learn: real SRHR explainers (from lib/learn.js) ──────────────────────────
function Learn({ tr, lang, isDesktop }) {
  const [open, setOpen] = useState(null)
  return (
    <div>
      <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, opacity:.7, margin:'0 0 18px', lineHeight:1.6, fontWeight:500 }}>
        {tr('learn_intro')}
      </p>
      <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap:12 }}>
        {LEARN.map(topic => {
          const t = topic[lang] || topic.en
          const isOpen = open === topic.id
          return (
            <div key={topic.id} className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`,
              borderTop:`3px solid ${topic.color}`, borderRadius:16, overflow:'hidden', alignSelf:'start',
              boxShadow:'0 6px 18px rgba(0,0,0,0.20)' }}>
              <button onClick={()=>setOpen(isOpen?null:topic.id)} className="uk-press"
                style={{ width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'transparent',
                  display:'flex', alignItems:'center', gap:13, padding:'15px 16px' }}>
                <span style={{ width:44, height:44, borderRadius:13, flexShrink:0, fontSize:22,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:topic.color + '26', border:`1px solid ${topic.color}55` }}>{topic.emoji}</span>
                <span style={{ flex:1 }}>
                  <span style={{ display:'block', fontFamily:Y.disp, fontSize:16.5, fontWeight:600, color:Y.txt, lineHeight:1.2 }}>{t.title}</span>
                  <span style={{ display:'block', fontFamily:Y.sans, fontSize:12, color:Y.mut, marginTop:3, lineHeight:1.45 }}>{t.intro}</span>
                </span>
                <span style={{ fontFamily:Y.disp, fontSize:18, color:topic.color, fontWeight:600 }}>{isOpen ? '–' : '+'}</span>
              </button>
              {isOpen && (
                <div style={{ padding:'2px 16px 16px' }}>
                  {t.points.map(([head, body], j) => (
                    <div key={j} style={{ marginBottom:12, paddingLeft:13, borderLeft:`3px solid ${topic.color}66` }}>
                      <p style={{ fontFamily:Y.disp, fontSize:14, fontWeight:600, color:topic.color, margin:'0 0 3px' }}>{head}</p>
                      <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, lineHeight:1.65, margin:0, opacity:.82 }}>{body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p style={{ fontFamily:Y.sans, fontSize:11.5, color:Y.mut, lineHeight:1.6, margin:'18px 4px 0', textAlign:'center' }}>
        {tr('learn_footer')}
      </p>
    </div>
  )
}

function SectionLabel({ children, color }) {
  return <p style={{ fontFamily:Y.disp, fontSize:12, fontWeight:600, letterSpacing:'.08em',
    textTransform:'uppercase', color, margin:'0 0 13px' }}>{children}</p>
}
