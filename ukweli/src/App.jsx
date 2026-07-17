import { useState, useEffect, useRef } from 'react'
import { sb, timeAgo } from './lib/supabase'
import { TurnstileWidget, tsInsert, resetTurnstile } from './lib/turnstile'
import { useLang, LANGS } from './lib/i18n'
import { LEARN } from './lib/learn'
import { KENYA_COUNTIES, FACILITY_TYPES, FACILITIES_FALLBACK, ATTRIBUTES, ATTR_LABEL } from './lib/fika'
import KenyaMap from './KenyaMap'

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
  rose:  '#FF5C8A',   // alert accent — the Trending / disinfo tab
  txt:   '#F1F5EE',
  mut:   '#88AE9D',
  disp:  "'Space Grotesk', system-ui, sans-serif",
  sans:  "'Plus Jakarta Sans', system-ui, sans-serif",
}

// Lightning "asterisk" — the spark that differentiates Ukweli from the calm hub mark
function Bolt({ size = 12, color = '#F2C75C' }) {
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 12 18" fill="none"
      style={{ marginLeft:2, marginTop:-1 }} aria-hidden="true">
      <path d="M7 0 L1 9.5 H5 L4 18 L11 7 H6.5 Z" fill={color}/>
    </svg>
  )
}

const TABS = [['ask','💬'],['myths','⚡'],['disinfo','🚩'],['learn','📖'],['fika','📍']]
const TAB_ACCENT = { ask: Y.green, myths: Y.coral, disinfo: Y.rose, learn: Y.teal, fika: Y.gold }
const MYTH_COLORS = [Y.coral, Y.green, Y.teal, Y.gold]
const navLabel = (tr, id) => tr(id === 'ask' ? 'ask_anon' : id === 'fika' ? 'fika_nav' : id)

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
  const maxW = isDesktop ? 900 : 480

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
        <div style={{ maxWidth:maxW, margin:'0 auto', padding: isDesktop?'12px 16px':'10px 12px',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap: isDesktop?12:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap: isDesktop?11:8, minWidth:0, flexShrink: isDesktop?0:1 }}>
            <img src="/logo-mark.png" alt="Imaarisha" height={isDesktop?36:30}
              style={{ display:'block', flexShrink:0, filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}/>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1, minWidth:0 }}>
              <span style={{ fontFamily:Y.disp, fontSize: isDesktop?21:18, fontWeight:600, letterSpacing:'-.02em',
                display:'inline-flex', alignItems:'flex-start', whiteSpace:'nowrap' }}>
                Ukweli<span style={{ color:Y.green }}>SRHR</span>
                <Bolt size={isDesktop?11:9} color={Y.gold}/>
              </span>
              <span style={{ fontFamily:Y.sans, fontSize: isDesktop?9.5:8, fontWeight:700,
                letterSpacing: isDesktop?'.26em':'.18em', whiteSpace:'nowrap',
                textTransform:'uppercase', color:Y.green, marginTop:5 }}>Fresh &amp; Friendly</span>
            </div>
          </div>

          {/* Desktop inline nav */}
          {isDesktop && (
            <nav style={{ display:'flex', gap:7, flex:1, justifyContent:'center' }}>
              {TABS.map(([id,icon]) => {
                const on = tab === id, acc = TAB_ACCENT[id]
                return (
                  <button key={id} onClick={()=>setTab(id)} className="uk-navlink uk-press"
                    style={{ fontFamily:Y.disp, fontSize:14.5, fontWeight:600, padding:'9px 14px', borderRadius:12,
                      border:'none', cursor:'pointer', letterSpacing:'.01em', whiteSpace:'nowrap',
                      background: on ? acc : 'transparent', color: on ? '#06241C' : Y.mut,
                      boxShadow: on ? `0 4px 14px ${acc}55` : 'none' }}>
                    <span style={{ marginRight:6, filter:on?'none':'grayscale(1) opacity(.7)' }}>{icon}</span>{navLabel(tr, id)}
                  </button>
                )
              })}
            </nav>
          )}

          <div style={{ display:'flex', alignItems:'center', gap: isDesktop?8:6, flexShrink:0 }}>
            <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.06)', borderRadius:20,
              padding: isDesktop?3:2, border:`1px solid ${Y.line}` }}>
              {LANGS.map(([code,label]) => (
                <button key={code} onClick={()=>setLang(code)}
                  style={{ fontFamily:Y.sans, fontSize: isDesktop?10.5:9.5, fontWeight:700,
                    padding: isDesktop?'4px 10px':'3px 7px', borderRadius:16, border:'none',
                    cursor:'pointer', background: lang===code?Y.txt:'transparent', color: lang===code?Y.bg:Y.mut }}>{label}</button>
              ))}
            </div>
            <button onClick={quickExit} title="Leave this site instantly" className="uk-press"
              style={{ fontFamily:Y.disp, fontSize: isDesktop?11:10, fontWeight:600,
                padding: isDesktop?'6px 12px':'5px 9px', borderRadius:16, flexShrink:0,
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
        {tab === 'disinfo' && <Disinfo tr={tr} lang={lang} isDesktop={isDesktop} />}
        {tab === 'learn' && <Learn tr={tr} lang={lang} isDesktop={isDesktop} />}
        {tab === 'fika'  && <Fika  tr={tr} lang={lang} isDesktop={isDesktop} />}
        <div style={{ textAlign:'center', marginTop:30, paddingTop:14, borderTop:`1px solid ${Y.line}` }}>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily:Y.sans, fontSize:11, color:Y.mut, textDecoration:'none' }}>Privacy Policy</a>
        </div>
      </main>

      {/* Mobile bottom nav — chunky, each tab lights up in its own colour */}
      {!isDesktop && (
        <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480,
          background:'rgba(10,38,32,0.95)', backdropFilter:'blur(14px)', borderTop:`1px solid ${Y.line}`,
          display:'flex', justifyContent:'space-around', gap:5,
          padding:'8px 8px calc(8px + env(safe-area-inset-bottom))', zIndex:20 }}>
          {TABS.map(([id,icon]) => {
            const on = tab === id, acc = TAB_ACCENT[id]
            return (
              <button key={id} onClick={()=>setTab(id)} className="uk-press"
                style={{ flex:1, minWidth:0, cursor:'pointer', border:'none', borderRadius:14,
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, padding:'8px 2px',
                  background: on ? acc : 'transparent', color: on ? '#06241C' : Y.mut,
                  boxShadow: on ? `0 4px 14px ${acc}55` : 'none' }}>
                <span style={{ fontSize:17, lineHeight:1, filter: on?'none':'grayscale(1) opacity(.6)' }}>{icon}</span>
                <span style={{ fontFamily:Y.disp, fontSize:10.5, fontWeight:600, whiteSpace:'nowrap', letterSpacing:'-.01em' }}>{navLabel(tr, id)}</span>
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
  const [tsToken, setTsToken] = useState('')

  useEffect(() => {
    sb.from('uliza_questions').select('*').eq('status','answered')
      .order('answered_at',{ascending:false}).limit(40).then(({data}) => setAnswered(data || []))
  }, [])

  const submit = async () => {
    if (q.trim().length < 8) return
    if (!tsToken) return
    setBusy(true)
    const { error } = await tsInsert(sb, 'uliza_questions', { question: q.trim(), language: lang }, tsToken)
    setBusy(false)
    if (!error) { setSent(true); setQ('') }
    else { resetTurnstile(); setTsToken('') }
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
            <TurnstileWidget onVerify={setTsToken} />
            <button onClick={submit} disabled={busy || q.trim().length < 8 || !tsToken} className="uk-press"
              style={{ marginTop:12, width:'100%', fontFamily:Y.disp, fontSize:15, fontWeight:600, padding:'14px 0',
                borderRadius:14, border:'none', cursor:'pointer', color:'#06241C',
                background:`linear-gradient(135deg, ${Y.green}, ${Y.teal})`,
                boxShadow:'0 8px 20px rgba(63,224,160,0.28)',
                opacity: (q.trim().length<8||!tsToken)?0.45:1 }}>
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

// ── Trending: live SRHR disinfo the Radar catches on TikTok & socials ─────────
const DTY = {
  contraceptive_myth: { key:'ty_contra', color:Y.coral },
  fertility_abortion: { key:'ty_fert',   color:Y.gold },
  anti_cse:           { key:'ty_cse',    color:Y.teal },
  faith_healing:      { key:'ty_faith',  color:Y.rose },
}
const DPLAT = {
  tiktok:{ label:'TikTok', icon:'♪' }, youtube:{ label:'YouTube', icon:'▶' },
  reddit:{ label:'Reddit', icon:'↗' }, x:{ label:'X', icon:'𝕏' },
  facebook:{ label:'Facebook', icon:'f' }, instagram:{ label:'Instagram', icon:'◎' },
}
const DSOCIAL = Object.keys(DPLAT)

// Direct post embeds — TikTok / YouTube / X. Click-to-load so we never silently
// connect a young reader's device to these platforms just for opening the tab
// (the app promises "no trace"); the real inline player loads only on tap.
const EMBEDDABLE = new Set(['tiktok','youtube','x'])
const ytId = (u) => { const m = (u||'').match(/(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/); return m ? m[1] : '' }
const tkId = (u) => { const m = (u||'').match(/\/video\/(\d+)/); return m ? m[1] : '' }
const canEmbedItem = (it) => !!it.url && (
  (it.platform==='tiktok'  && /tiktok\.com/.test(it.url)) ||
  (it.platform==='youtube' && !!ytId(it.url)) ||
  (it.platform==='x'       && /(twitter|x)\.com/.test(it.url)))
function reloadScript(id, src) {
  const old = document.getElementById(id); if (old) old.remove()
  const s = document.createElement('script'); s.id = id; s.src = src; s.async = true; document.body.appendChild(s)
}

function SocialEmbed({ url, platform, tr, accent, typoColor }) {
  const [show, setShow] = useState(false)
  const box = useRef(null)
  useEffect(() => {
    if (!show || !box.current) return
    if (platform === 'tiktok') {
      box.current.innerHTML = `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${tkId(url)}" style="max-width:605px;min-width:280px;margin:0"><section></section></blockquote>`
      reloadScript('tiktok-embed-js', 'https://www.tiktok.com/embed.js')
    } else if (platform === 'youtube') {
      const id = ytId(url)
      box.current.innerHTML = id
        ? `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px"><iframe src="https://www.youtube-nocookie.com/embed/${id}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" loading="lazy" allow="encrypted-media;picture-in-picture" allowfullscreen title="Embedded video"></iframe></div>`
        : ''
    } else if (platform === 'x') {
      box.current.innerHTML = `<blockquote class="twitter-tweet" data-dnt="true" data-theme="dark"><a href="${url}"></a></blockquote>`
      reloadScript('twitter-wjs', 'https://platform.twitter.com/widgets.js')
    }
  }, [show, url, platform])

  if (!show) {
    const yt = platform === 'youtube' ? ytId(url) : ''
    const thumb = yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : ''
    const pic = DPLAT[platform] || { icon:'▶' }
    const acc = typoColor || accent || Y.coral
    return (
      <div>
        <button onClick={()=>setShow(true)} className="uk-press" aria-label={tr('load_post')}
          style={{ position:'relative', display:'block', width:'100%', padding:0, border:'none', cursor:'pointer',
            borderRadius:12, overflow:'hidden', lineHeight:0, background:acc }}>
          {thumb
            ? <img src={thumb} alt="" loading="lazy" style={{ width:'100%', aspectRatio:'16 / 9', objectFit:'cover', display:'block' }}/>
            : <div style={{ width:'100%', aspectRatio:'16 / 9', display:'flex', alignItems:'center', justifyContent:'center',
                background:`linear-gradient(135deg, ${acc}, ${Y.bg})`, fontSize:46 }}>{pic.icon}</div>}
          <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }} aria-hidden>
            <span style={{ width:54, height:54, borderRadius:'50%', background:'rgba(6,36,28,0.72)', color:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>▶</span>
          </span>
        </button>
        <p style={{ fontFamily:Y.sans, fontSize:10, color:Y.mut, textAlign:'center', margin:'6px 0 0' }}>{tr('load_hint')}</p>
      </div>
    )
  }
  return <div ref={box} style={{ background:'#fff', borderRadius:12, overflow:'hidden', minHeight:60 }} />
}

function Disinfo({ tr, lang, isDesktop }) {
  const [items, setItems] = useState(null)
  const [ty, setTy] = useState('all')

  useEffect(() => {
    sb.from('radar_items').select('*').in('platform', DSOCIAL)
      .order('scanned_at', { ascending:false }).limit(60)
      .then(({ data }) => setItems((data || []).filter(i => i.is_disinfo || i.harm_score >= 5)))
      .catch(() => setItems([]))
  }, [])

  const list = (items || []).filter(i => ty === 'all' || i.typology === ty)
  const chip = (on, color) => ({
    fontFamily:Y.disp, fontSize:12.5, fontWeight:600, padding:'7px 13px', borderRadius:20,
    cursor:'pointer', whiteSpace:'nowrap', border:'none',
    background: on ? color : 'rgba(255,255,255,0.06)', color: on ? '#06241C' : Y.mut,
    boxShadow: on ? `0 4px 12px ${color}44` : 'none',
  })

  return (
    <div>
      <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, opacity:.7, margin:'0 0 16px', lineHeight:1.6, fontWeight:500 }}>
        {tr('disinfo_intro')}
      </p>

      {/* typology filter */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:16 }}>
        <button onClick={()=>setTy('all')} className="uk-press" style={chip(ty==='all', Y.green)}>{tr('disinfo_all')}</button>
        {Object.entries(DTY).map(([k,v]) => (
          <button key={k} onClick={()=>setTy(k)} className="uk-press" style={chip(ty===k, v.color)}>{tr(v.key)}</button>
        ))}
      </div>

      {items === null && <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.mut, fontStyle:'italic' }}>{tr('loading')}</p>}
      {items !== null && list.length === 0 && (
        <div className="uk-card" style={{ background:Y.card, border:`1px dashed ${Y.line}`, borderRadius:16, padding:20, textAlign:'center' }}>
          <p style={{ fontSize:26, margin:'0 0 6px' }}>🚩</p>
          <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.mut, lineHeight:1.6, margin:0 }}>{tr('disinfo_empty')}</p>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap:12 }}>
        {list.map(it => {
          const t = DTY[it.typology]
          const acc = t ? t.color : Y.rose
          const pl = DPLAT[it.platform] || { label:it.platform, icon:'•' }
          return (
            <div key={it.id} className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`,
              borderLeft:`4px solid ${acc}`, borderRadius:16, padding:16, alignSelf:'start',
              boxShadow:'0 6px 18px rgba(0,0,0,0.20)', overflowWrap:'anywhere' }}>
              {canEmbedItem(it) && <div style={{ marginBottom:11 }}><SocialEmbed url={it.url} platform={it.platform} tr={tr} accent={acc} typoColor={acc} /></div>}
              <div style={{ display:'flex', flexWrap:'wrap', gap:7, alignItems:'center', marginBottom:9 }}>
                <span style={{ fontFamily:Y.disp, fontSize:10.5, fontWeight:700, letterSpacing:'.02em', color:'#06241C',
                  background:acc, borderRadius:8, padding:'2px 9px' }}>
                  <span aria-hidden style={{ marginRight:4 }}>{pl.icon}</span>{pl.label}
                </span>
                {t && <span style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, letterSpacing:'.03em',
                  textTransform:'uppercase', color:acc, border:`1px solid ${acc}66`, borderRadius:8, padding:'2px 8px' }}>{tr(t.key)}</span>}
                {it.harm_score >= 7 && <span style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, color:Y.coral }}>{tr('disinfo_flag')}</span>}
              </div>
              <p style={{ fontFamily:Y.disp, fontSize:16.5, fontWeight:600, color:Y.txt, margin:0, lineHeight:1.32 }}>{it.title}</p>
              {it.snippet && <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.txt, opacity:.75, lineHeight:1.6, margin:'8px 0 0' }}>
                {it.snippet.slice(0,180)}{it.snippet.length>180?'…':''}</p>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginTop:11 }}>
                <span style={{ fontFamily:Y.sans, fontSize:10.5, color:Y.mut }}>{it.source_name} · {timeAgo(it.scanned_at)}</span>
                {it.url && <a href={it.url} target="_blank" rel="noopener noreferrer nofollow"
                  style={{ fontFamily:Y.disp, fontSize:11.5, fontWeight:600, color:acc, textDecoration:'none', whiteSpace:'nowrap' }}>See post ↗</a>}
              </div>
            </div>
          )
        })}
      </div>

      {items !== null && list.length > 0 && (
        <p style={{ fontFamily:Y.sans, fontSize:11.5, color:Y.mut, lineHeight:1.6, margin:'18px 4px 0', textAlign:'center' }}>
          {tr('disinfo_footer')}
        </p>
      )}
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

// ── Hebu Fika: youth-rated access to SRHR services, by county ────────────────
function Fika({ tr, lang, isDesktop }) {
  const [county, setCounty] = useState('Nairobi')
  const [facilities, setFacilities] = useState(null)
  const [reviews, setReviews] = useState([])
  const [usingFallback, setUsingFallback] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [indicator, setIndicator] = useState(null)   // tracker: Youth Friendliness of SRHR Facilities

  const load = () => {
    sb.from('fika_facilities').select('*').then(({ data, error }) => {
      if (!error && data && data.length) { setFacilities(data); setUsingFallback(false) }
      else { setFacilities(FACILITIES_FALLBACK); setUsingFallback(true) }
    }).catch(() => { setFacilities(FACILITIES_FALLBACK); setUsingFallback(true) })
    sb.from('fika_reviews').select('*').eq('status','published')
      .order('created_at',{ascending:false}).then(({ data }) => setReviews(data || []))
  }
  useEffect(load, [])

  useEffect(() => {
    sb.from('tracker_indicators').select('name,current_value,unit').then(({ data }) => {
      const row = (data || []).find(r => /youth friendliness/i.test(r.name))
      setIndicator(row ? { val: row.current_value, unit: row.unit || '%' } : { val: 38, unit: '%' })
    }).catch(() => setIndicator({ val: 38, unit: '%' }))
  }, [])

  const allFacilities = facilities || []
  const coveredCounties = new Set(allFacilities.map(f => f.county)).size

  const byFac = {}
  reviews.forEach(r => { (byFac[r.facility_id] = byFac[r.facility_id] || []).push(r) })

  const ranked = (facilities || [])
    .filter(f => f.county === county)
    .map(f => {
      const rs = byFac[f.id] || []
      const avg = rs.length ? rs.reduce((s,r)=>s+r.rating,0)/rs.length : null
      const tally = {}
      rs.forEach(r => (r.attributes||[]).forEach(a => { tally[a] = (tally[a]||0)+1 }))
      const praised = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k)
      return { ...f, avg, count: rs.length, recent: rs.slice(0,2), praised }
    })
    .sort((a,b) => (b.avg ?? -1) - (a.avg ?? -1) || (b.verified?1:0) - (a.verified?1:0))
    .slice(0, 5)

  const countyFacilities = (facilities || []).filter(f => f.county === county)

  return (
    <div>
      <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.txt, opacity:.7, margin:'0 0 16px', lineHeight:1.6, fontWeight:500 }}>
        {tr('fika_intro')}
      </p>

      {/* Map + tracker indicator */}
      <div className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`, borderTop:`3px solid ${Y.gold}`,
        borderRadius:16, padding:16, marginBottom:18, boxShadow:'0 6px 18px rgba(0,0,0,0.20)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10, marginBottom:4 }}>
          <SectionLabel color={Y.gold}>{tr('fika_map_title')}</SectionLabel>
          <span style={{ fontFamily:Y.sans, fontSize:10.5, color:Y.mut }}>{tr('fika_tap_county')}</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, margin:'4px 0 12px' }}>
          <MiniStat v={indicator ? `${indicator.val}${indicator.unit==='%'?'%':''}` : '—'} l={tr('fika_indicator')} color={Y.green}/>
          <MiniStat v={allFacilities.length} l={tr('fika_mapped')} color={Y.teal}/>
          <MiniStat v={coveredCounties} l={tr('fika_counties_live')} color={Y.gold}/>
        </div>
        <KenyaMap facilities={allFacilities} selected={county} onSelect={setCounty}
          accent={Y.gold} mut={Y.mut} txt={Y.txt}/>
      </div>

      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:18 }}>
        <label style={{ fontFamily:Y.disp, fontSize:12, fontWeight:600, letterSpacing:'.06em',
          textTransform:'uppercase', color:Y.gold }}>{tr('fika_county')}</label>
        <select value={county} onChange={e=>setCounty(e.target.value)}
          style={{ flex:'1 1 180px', fontFamily:Y.sans, fontSize:14, fontWeight:600, color:Y.txt,
            background:Y.card2, border:`1px solid ${Y.line}`, borderRadius:12, padding:'10px 12px', outline:'none' }}>
          {KENYA_COUNTIES.map(c => <option key={c} value={c} style={{ background:Y.bg }}>{c}</option>)}
        </select>
        <button onClick={()=>setSubmitOpen(true)} className="uk-press"
          style={{ fontFamily:Y.disp, fontSize:13, fontWeight:600, padding:'10px 16px', borderRadius:12, border:'none',
            cursor:'pointer', color:'#06241C', background:Y.gold, boxShadow:'0 4px 12px rgba(242,199,92,0.3)' }}>
          ＋ {tr('fika_share')}
        </button>
      </div>

      <SectionLabel color={Y.gold}>{tr('fika_top')} {county}</SectionLabel>

      {facilities === null && <p style={{ fontFamily:Y.sans, fontSize:13.5, color:Y.mut, fontStyle:'italic' }}>{tr('loading')}</p>}
      {facilities !== null && ranked.length === 0 && (
        <div className="uk-card" style={{ background:Y.card, border:`1px dashed ${Y.line}`, borderRadius:16, padding:20, textAlign:'center' }}>
          <p style={{ fontSize:26, margin:'0 0 6px' }}>📍</p>
          <p style={{ fontFamily:Y.disp, fontSize:16, fontWeight:600, color:Y.txt, margin:'0 0 5px' }}>{tr('fika_empty_title')}</p>
          <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.mut, lineHeight:1.6, margin:0 }}>{tr('fika_empty_body')}</p>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1fr 1fr':'1fr', gap:12 }}>
        {ranked.map((f, i) => {
          const ft = FACILITY_TYPES[f.kind] || FACILITY_TYPES.public
          return (
            <div key={f.id} className="uk-card" style={{ background:Y.card, border:`1px solid ${Y.line}`,
              borderLeft:`4px solid ${ft.color}`, borderRadius:16, padding:16, alignSelf:'start',
              boxShadow:'0 6px 18px rgba(0,0,0,0.20)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div>
                  <p style={{ fontFamily:Y.disp, fontSize:16.5, fontWeight:600, color:Y.txt, margin:0, lineHeight:1.25 }}>
                    <span style={{ color:ft.color, marginRight:5 }}>{i+1}.</span>{f.name}
                  </p>
                  <p style={{ fontFamily:Y.sans, fontSize:11.5, color:Y.mut, margin:'3px 0 0' }}>📍 {f.area} · {f.county}</p>
                </div>
                {f.verified && <span style={{ fontFamily:Y.sans, fontSize:9.5, fontWeight:800, color:Y.green,
                  border:`1px solid ${Y.green}`, borderRadius:8, padding:'2px 7px', whiteSpace:'nowrap' }}>✓ Known</span>}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:8, margin:'10px 0' }}>
                <Stars value={f.avg}/>
                <span style={{ fontFamily:Y.sans, fontSize:11.5, color:Y.mut }}>
                  {f.avg ? `${f.avg.toFixed(1)} · ${f.count} ${f.count===1?tr('fika_review'):tr('fika_reviews')}` : tr('fika_no_ratings')}
                </span>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                <span style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, color:ft.color,
                  background:ft.color+'22', border:`1px solid ${ft.color}55`, borderRadius:10, padding:'2px 9px' }}>{ft.label}</span>
                {(f.services||[]).map((s,j) => (
                  <span key={j} style={{ fontFamily:Y.sans, fontSize:10.5, fontWeight:600, color:Y.txt, opacity:.8,
                    background:'rgba(255,255,255,0.06)', border:`1px solid ${Y.line}`, borderRadius:10, padding:'2px 9px' }}>{s}</span>
                ))}
              </div>

              {f.praised.length > 0 && (
                <div style={{ marginTop:10 }}>
                  <span style={{ fontFamily:Y.sans, fontSize:10, fontWeight:800, letterSpacing:'.04em',
                    textTransform:'uppercase', color:Y.mut }}>{tr('fika_praise')}: </span>
                  <span style={{ display:'inline-flex', flexWrap:'wrap', gap:5, marginTop:5 }}>
                    {f.praised.map(a => (
                      <span key={a} style={{ fontFamily:Y.sans, fontSize:10.5, fontWeight:700, color:Y.green,
                        background:'rgba(63,224,160,0.12)', border:`1px solid ${Y.green}44`, borderRadius:10, padding:'2px 9px' }}>
                        {ATTR_LABEL[a] || a}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {f.recent.length > 0 && (
                <div style={{ marginTop:12, paddingTop:11, borderTop:`1px solid ${Y.line}` }}>
                  {f.recent.map(r => (
                    <div key={r.id} style={{ marginBottom:8 }}>
                      <span style={{ fontFamily:Y.sans, fontSize:11, color:Y.gold, fontWeight:700 }}>{'★'.repeat(r.rating)}</span>
                      <p style={{ fontFamily:Y.sans, fontSize:12.5, color:Y.txt, opacity:.82, lineHeight:1.55, margin:'2px 0 0' }}>“{r.comment}”</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ textAlign:'center', marginTop:18 }}>
        <button onClick={()=>setSuggestOpen(true)} className="uk-press"
          style={{ fontFamily:Y.disp, fontSize:13, fontWeight:600, padding:'10px 18px', borderRadius:12, cursor:'pointer',
            border:`1px solid ${Y.gold}`, background:'transparent', color:Y.gold }}>
          ＋ {tr('fika_suggest')}
        </button>
      </div>

      <p style={{ fontFamily:Y.sans, fontSize:11.5, color:Y.mut, lineHeight:1.6, margin:'16px 4px 0', textAlign:'center' }}>
        {tr('fika_footer')}
      </p>

      {submitOpen && (
        <FikaSubmit tr={tr} lang={lang} county={county} facilities={countyFacilities}
          canWrite={!usingFallback} onClose={()=>setSubmitOpen(false)} onDone={load}/>
      )}
      {suggestOpen && (
        <FikaSuggest tr={tr} lang={lang} county={county} canWrite={!usingFallback}
          onClose={()=>setSuggestOpen(false)}/>
      )}
    </div>
  )
}

// ── Suggest a missing service — anonymous, admin-reviewed ────────────────────
function FikaSuggest({ tr, lang, county, canWrite, onClose }) {
  const [name, setName] = useState('')
  const [cnty, setCnty] = useState(county)
  const [area, setArea] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  const [tsToken, setTsToken] = useState('')

  const submit = async () => {
    if (!name.trim() || !cnty) { setMsg(tr('fika_suggest_need')); return }
    if (!canWrite) { setMsg(tr('fika_soon')); return }
    if (!tsToken) { setMsg(tr('fika_verify') || 'Please complete the verification.'); return }
    setBusy(true); setMsg('')
    const { error } = await tsInsert(sb, 'fika_suggestions', {
      name: name.trim(), county: cnty, area: area.trim() || null, note: note.trim() || null,
      language: lang,
    }, tsToken)
    setBusy(false)
    if (error) { setMsg(error.message); resetTurnstile(); setTsToken(''); return }
    setSent(true)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(4,18,14,0.7)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:Y.card, border:`1px solid ${Y.line}`,
        borderRadius:18, padding:22, width:'100%', maxWidth:420, boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
        <p style={{ fontFamily:Y.disp, fontSize:19, fontWeight:600, color:Y.txt, margin:'0 0 2px' }}>{tr('fika_suggest_title')}</p>
        <p style={{ fontFamily:Y.sans, fontSize:12, color:Y.mut, margin:'0 0 14px' }}>{tr('ask_privacy')}</p>

        {sent ? (
          <>
            <p style={{ fontFamily:Y.sans, fontSize:14, color:Y.txt, lineHeight:1.6, fontWeight:500, margin:'0 0 14px' }}>{tr('fika_suggest_sent')}</p>
            <button onClick={onClose} className="uk-press" style={{ width:'100%', fontFamily:Y.disp, fontSize:14, fontWeight:600,
              padding:'12px 0', borderRadius:12, border:'none', color:'#06241C', cursor:'pointer',
              background:`linear-gradient(135deg, ${Y.green}, ${Y.teal})` }}>{tr('close_card')}</button>
          </>
        ) : (
          <>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder={tr('fika_suggest_name')}
              style={fikaInput}/>
            <select value={cnty} onChange={e=>setCnty(e.target.value)} style={{ ...fikaInput, appearance:'auto' }}>
              {KENYA_COUNTIES.map(c => <option key={c} value={c} style={{ background:Y.bg }}>{c}</option>)}
            </select>
            <input value={area} onChange={e=>setArea(e.target.value)} placeholder={tr('fika_suggest_area')} style={fikaInput}/>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={tr('fika_suggest_note')}
              style={{ ...fikaInput, minHeight:74, resize:'vertical' }}/>
            {msg && <p style={{ fontFamily:Y.sans, fontSize:12, color:Y.coral, margin:'2px 0 0', lineHeight:1.5 }}>{msg}</p>}
            {canWrite && <TurnstileWidget onVerify={setTsToken} />}
            <div style={{ display:'flex', gap:8, marginTop:14 }}>
              <button onClick={onClose} className="uk-press" style={{ flex:1, fontFamily:Y.disp, fontSize:14, fontWeight:600,
                padding:'12px 0', borderRadius:12, border:`1px solid ${Y.line}`, background:'transparent', color:Y.mut, cursor:'pointer' }}>
                {tr('close_card')}
              </button>
              <button onClick={submit} disabled={busy || (canWrite && !tsToken)} className="uk-press" style={{ flex:1, fontFamily:Y.disp, fontSize:14, fontWeight:600,
                padding:'12px 0', borderRadius:12, border:'none', color:'#06241C', cursor:'pointer',
                background:`linear-gradient(135deg, ${Y.gold}, ${Y.coral})`, opacity:(canWrite && !tsToken)?0.5:1 }}>
                {busy ? tr('ask_sending') : tr('fika_suggest_title')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const fikaInput = {
  width:'100%', boxSizing:'border-box', fontFamily:'inherit', fontSize:13.5, color:'#F1F5EE',
  background:'#0A2620', border:'1px solid rgba(214,243,230,0.12)', borderRadius:12, padding:'11px 12px',
  outline:'none', marginBottom:10,
}

function MiniStat({ v, l, color }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${Y.line}`, borderRadius:12, padding:'10px 11px' }}>
      <div style={{ fontFamily:Y.disp, fontSize:21, fontWeight:600, color, lineHeight:1 }}>{v}</div>
      <div style={{ fontFamily:Y.sans, fontSize:9.5, color:Y.mut, marginTop:3, lineHeight:1.3 }}>{l}</div>
    </div>
  )
}

function Stars({ value }) {
  const v = value || 0
  return (
    <span style={{ fontSize:14, letterSpacing:'1px', lineHeight:1 }} aria-label={`${v.toFixed(1)} of 5`}>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ color: n <= Math.round(v) ? Y.gold : 'rgba(255,255,255,0.18)' }}>★</span>
      ))}
    </span>
  )
}

function FikaSubmit({ tr, lang, county, facilities, canWrite, onClose, onDone }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '')
  const [rating, setRating] = useState(0)
  const [attrs, setAttrs] = useState([])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [tsToken, setTsToken] = useState('')

  const toggleAttr = (k) => setAttrs(a => a.includes(k) ? a.filter(x=>x!==k) : [...a, k])

  const submit = async () => {
    if (!facilityId || !rating) { setMsg(tr('fika_need')); return }
    if (!canWrite) { setMsg(tr('fika_soon')); return }
    if (!tsToken) { setMsg(tr('fika_verify') || 'Please complete the verification.'); return }
    setBusy(true); setMsg('')
    const { error } = await tsInsert(sb, 'fika_reviews', {
      facility_id: facilityId, rating, attributes: attrs, comment: comment.trim() || null, language: lang,
    }, tsToken)
    setBusy(false)
    if (error) { setMsg(error.message); resetTurnstile(); setTsToken(''); return }
    onDone?.(); onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(4,18,14,0.7)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:Y.card, border:`1px solid ${Y.line}`,
        borderRadius:18, padding:22, width:'100%', maxWidth:420, boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
        <p style={{ fontFamily:Y.disp, fontSize:19, fontWeight:600, color:Y.txt, margin:'0 0 2px' }}>{tr('fika_share')}</p>
        <p style={{ fontFamily:Y.sans, fontSize:12, color:Y.mut, margin:'0 0 14px' }}>{county} · {tr('ask_privacy')}</p>

        <select value={facilityId} onChange={e=>setFacilityId(e.target.value)}
          style={{ width:'100%', fontFamily:Y.sans, fontSize:13.5, color:Y.txt, background:Y.card2,
            border:`1px solid ${Y.line}`, borderRadius:12, padding:'11px 12px', outline:'none', marginBottom:12 }}>
          {facilities.length === 0 && <option value="">{tr('fika_no_facilities')}</option>}
          {facilities.map(f => <option key={f.id} value={f.id} style={{ background:Y.bg }}>{f.name}</option>)}
        </select>

        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={()=>setRating(n)} className="uk-press"
              style={{ fontSize:26, lineHeight:1, background:'none', border:'none', cursor:'pointer',
                color: n <= rating ? Y.gold : 'rgba(255,255,255,0.2)' }}>★</button>
          ))}
        </div>

        <p style={{ fontFamily:Y.disp, fontSize:11.5, fontWeight:600, letterSpacing:'.04em', textTransform:'uppercase',
          color:Y.mut, margin:'0 0 8px' }}>{tr('fika_whatgood')}</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:14 }}>
          {ATTRIBUTES.map(([k,label]) => {
            const on = attrs.includes(k)
            return (
              <button key={k} onClick={()=>toggleAttr(k)} className="uk-press"
                style={{ fontFamily:Y.sans, fontSize:11.5, fontWeight:700, padding:'6px 11px', borderRadius:20, cursor:'pointer',
                  border:`1px solid ${on?Y.green:Y.line}`, background: on?'rgba(63,224,160,0.16)':'transparent',
                  color: on?Y.green:Y.mut }}>{label}</button>
            )
          })}
        </div>

        <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder={tr('fika_comment_ph')}
          style={{ width:'100%', minHeight:80, resize:'vertical', background:Y.bg, border:`1px solid ${Y.line}`,
            borderRadius:12, padding:'12px', color:Y.txt, fontFamily:Y.sans, fontSize:13.5, outline:'none', lineHeight:1.5 }}/>
        {msg && <p style={{ fontFamily:Y.sans, fontSize:12, color:Y.coral, margin:'10px 0 0', lineHeight:1.5 }}>{msg}</p>}
        {canWrite && <TurnstileWidget onVerify={setTsToken} />}
        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button onClick={onClose} className="uk-press" style={{ flex:1, fontFamily:Y.disp, fontSize:14, fontWeight:600,
            padding:'12px 0', borderRadius:12, border:`1px solid ${Y.line}`, background:'transparent', color:Y.mut, cursor:'pointer' }}>
            {tr('close_card')}
          </button>
          <button onClick={submit} disabled={busy || (canWrite && !tsToken)} className="uk-press" style={{ flex:1, fontFamily:Y.disp, fontSize:14, fontWeight:600,
            padding:'12px 0', borderRadius:12, border:'none', color:'#06241C', cursor:'pointer',
            background:`linear-gradient(135deg, ${Y.gold}, ${Y.coral})`, opacity:(canWrite && !tsToken)?0.5:1 }}>
            {busy ? tr('ask_sending') : tr('fika_share')}
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children, color }) {
  return <p style={{ fontFamily:Y.disp, fontSize:12, fontWeight:600, letterSpacing:'.08em',
    textTransform:'uppercase', color, margin:'0 0 13px' }}>{children}</p>
}
