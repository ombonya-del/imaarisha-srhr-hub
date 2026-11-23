import { useState, useEffect, useRef } from 'react'
import { sb } from './lib/supabase'
import { campaignEvent, mediaHandlers, useYouTubeProgress, shareWhatsApp, submitQuiz, baselineDone } from './lib/campaign'
import { getCounty } from './lib/track'

// ── Imaarisha media: the campaign's videos, podcast episodes and clips ───────
// Reads released (public) items from campaign_assets. Every play is measured
// in milestones (started, 25/50/75%, finished) for the campaign report.

const STORAGE = (import.meta.env.VITE_SUPABASE_URL || '') + '/storage/v1/object/public/campaign-media/'
const PLAYABLE = ['video', 'podcast_episode', 'clip', 'voice_note', 'audiogram', 'toolkit']
const GROUPS = [
  ['videos',  ['video'],                                'media_videos'],
  ['podcast', ['podcast_episode'],                      'media_podcast'],
  ['clips',   ['clip', 'voice_note', 'audiogram'],     'media_clips'],
  ['guide',   ['toolkit'],                              'media_guide'],
]
const isAudio = (u) => /\.(mp3|m4a|aac|ogg|wav)(\?|$)/i.test(u || '')
const isPdf = (u) => /\.pdf(\?|$)/i.test(u || '')
const fileUrl = (a) => (a.storage_path ? STORAGE + a.storage_path.replace(/^\/+/, '') : a.url)

export function ImaarishaMedia({ Y, tr, lang, isDesktop, open, setOpen, onCheck }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    sb.from('campaign_assets')
      .select('slug,kind,series,episode_no,title,summary,language,host,external_id,url,storage_path,duration_seconds,thumbnail_url')
      .eq('visibility', 'public').eq('audience_facing', 'public').in('kind', PLAYABLE)
      .order('series').order('episode_no')
      .then(({ data }) => setItems(data || []), () => setItems([]))
  }, [])
  if (!items || items.length === 0) return null

  // Prefer the reader's language; 'multi' items show for everyone.
  const mine = items.filter(a => a.language === lang || a.language === 'multi')
  const list = mine.length ? mine : items

  return (
    <section style={{ background:Y.card, border:`1px solid ${Y.line}`, borderTop:`3px solid ${Y.gold}`, borderRadius:16,
      padding:'16px 16px 8px', marginBottom:18 }}>
      <p style={{ fontFamily:Y.sans, fontSize:10.5, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:Y.gold, margin:0 }}>
        Imaarisha
      </p>
      <h2 style={{ fontFamily:Y.disp, fontSize:20, fontWeight:600, color:Y.txt, margin:'4px 0 4px', letterSpacing:'-.01em' }}>{tr('media_title')}</h2>
      <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.mut, margin:'0 0 12px', lineHeight:1.55 }}>{tr('media_intro')}</p>
      {GROUPS.map(([key, kinds, label]) => {
        const rows = list.filter(a => kinds.includes(a.kind))
        if (!rows.length) return null
        return (
          <div key={key} style={{ marginBottom:10 }}>
            <p style={{ fontFamily:Y.sans, fontSize:11, fontWeight:800, color:Y.txt, opacity:.75, margin:'6px 0 6px' }}>{tr(label)}</p>
            <div style={{ display:'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap:8 }}>
              {rows.map(a => (
                <MediaRow key={a.slug} a={a} Y={Y} tr={tr} isOpen={open === 'm-' + a.slug}
                  onToggle={() => setOpen(open === 'm-' + a.slug ? null : 'm-' + a.slug)} onCheck={onCheck}/>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

function MediaRow({ a, Y, tr, isOpen, onToggle, onCheck }) {
  const [half, setHalf] = useState(false)
  useEffect(() => { if (isOpen) campaignEvent('asset_view', a.slug) }, [isOpen, a.slug])
  const icon = a.kind === 'video' || a.host === 'youtube' ? '▶' : a.kind === 'toolkit' ? '📘' : '🎧'
  return (
    <div id={'uk-item-m-' + a.slug} style={{ border:`1px solid ${Y.line}`, borderRadius:12, overflow:'hidden', alignSelf:'start' }}>
      <button onClick={onToggle} className="uk-press" aria-expanded={isOpen}
        style={{ width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'transparent', color:Y.txt,
          display:'flex', alignItems:'center', gap:10, padding:'10px 12px' }}>
        <span aria-hidden style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
          background:Y.tint, color:Y.gold, fontSize:14 }}>{icon}</span>
        <span style={{ flex:1, minWidth:0 }}>
          <span style={{ display:'block', fontFamily:Y.disp, fontSize:14, fontWeight:600, lineHeight:1.25, overflowWrap:'anywhere' }}>{a.title}</span>
          {a.series && <span style={{ display:'block', fontFamily:Y.sans, fontSize:11, color:Y.mut, marginTop:2 }}>
            {a.series}{a.episode_no ? ` · ${tr('media_ep')} ${a.episode_no}` : ''}</span>}
        </span>
        <span aria-hidden style={{ fontFamily:Y.disp, color:Y.gold }}>{isOpen ? '–' : '+'}</span>
      </button>
      {isOpen && (
        <div style={{ padding:'0 12px 12px' }}>
          {a.summary && <p style={{ fontFamily:Y.sans, fontSize:13, color:Y.txt, opacity:.85, lineHeight:1.6, margin:'0 0 10px' }}>{a.summary}</p>}
          <Player a={a} Y={Y} tr={tr} onHalf={() => setHalf(true)}/>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
            <button onClick={() => shareWhatsApp(a.slug, tr('media_share_text'))} className="uk-press"
              style={{ fontFamily:Y.disp, fontSize:12.5, fontWeight:600, minHeight:40, padding:'0 14px', borderRadius:20, border:'none',
                background:Y.green, color:Y.on, cursor:'pointer' }}>{tr('media_share')}</button>
            {half && onCheck && (
              <button onClick={onCheck} className="uk-press"
                style={{ fontFamily:Y.disp, fontSize:12.5, fontWeight:600, minHeight:40, padding:'0 14px', borderRadius:20,
                  border:`1px solid ${Y.gold}`, background:'transparent', color:Y.gold, cursor:'pointer' }}>{tr('media_check_prompt')}</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Player({ a, Y, tr, onHalf }) {
  const src = fileUrl(a)
  if (a.host === 'youtube' && a.external_id) return <YouTube id={a.external_id} slug={a.slug} title={a.title} Y={Y} onHalf={onHalf}/>
  if (src && isAudio(src)) return <audio controls preload="none" src={src} style={{ width:'100%' }} {...mediaHandlers(a.slug, onHalf)}/>
  if (src && /\.(mp4|webm)(\?|$)/i.test(src)) return <video controls preload="metadata" src={src} style={{ width:'100%', borderRadius:10, background:'#000' }} {...mediaHandlers(a.slug, onHalf)}/>
  if (src && (isPdf(src) || a.kind === 'toolkit')) return (
    <a href={src} target="_blank" rel="noopener noreferrer" onClick={() => campaignEvent('download', a.slug, { once:false })}
      style={{ fontFamily:Y.disp, fontSize:13, fontWeight:600, color:Y.teal, textDecoration:'none' }}>⬇ {tr('media_download')}</a>
  )
  if (src) return (
    <a href={src} target="_blank" rel="noopener noreferrer" onClick={() => campaignEvent('link_out', a.slug, { once:false })}
      style={{ fontFamily:Y.disp, fontSize:13, fontWeight:600, color:Y.teal, textDecoration:'none' }}>🎧 {tr('media_listen_full')} ↗</a>
  )
  return null
}

function YouTube({ id, slug, title, Y, onHalf }) {
  const ref = useRef(null)
  useYouTubeProgress(ref, slug, onHalf)
  const origin = typeof location !== 'undefined' ? encodeURIComponent(location.origin) : ''
  return (
    <div style={{ position:'relative', paddingBottom:'56.25%', height:0, overflow:'hidden', borderRadius:10, border:`1px solid ${Y.line}` }}>
      <iframe ref={ref} title={title} loading="lazy" allow="encrypted-media; picture-in-picture" allowFullScreen
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?enablejsapi=1&rel=0&origin=${origin}`}
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:0 }}/>
    </div>
  )
}

// ── Knowledge check (anonymous, adults only) ─────────────────────────────────
// First completion on a device is the "before" answer; later ones are "after".
const AGES = ['18-24', '25-34', '35-54', '55+']
const COUNTY_CODES = { nairobi:'nairobi', narok:'narok', 'homa bay':'homa_bay', homa_bay:'homa_bay' }

export function KnowledgeCheck({ Y, tr, lang, open, setOpen }) {
  const [items, setItems] = useState(null)
  const [answers, setAnswers] = useState({})
  const [age, setAge] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [qLang, setQLang] = useState('en')

  useEffect(() => {
    sb.from('campaign_quiz_public').select('*').order('sort_order').then(({ data }) => {
      const all = data || []
      const mine = all.filter(q => q.language === lang)
      const use = mine.length ? lang : 'en'
      setQLang(use); setItems(all.filter(q => q.language === use))
    }, () => setItems([]))
  }, [lang])

  if (!items || items.length === 0) return null
  const isOpen = open === 'quiz'
  const complete = items.every(q => answers[q.code] != null) && age

  const submit = async () => {
    setMsg('')
    if (age === 'under18') { setMsg(tr('quiz_under18')); return }
    setBusy(true)
    try {
      const c = (getCounty() || '').toLowerCase()
      const county = COUNTY_CODES[c] || (c && c !== 'skip' ? 'other_kenya' : null)
      const r = await submitQuiz(answers, { language: qLang, ageBand: age, county })
      setResult(r)
    } catch { setMsg(tr('quiz_error')) }
    setBusy(false)
  }

  return (
    <section id="uk-item-quiz" style={{ background:Y.card, border:`1px solid ${Y.line}`, borderTop:`3px solid ${Y.teal}`,
      borderRadius:16, overflow:'hidden', marginTop:14 }}>
      <button onClick={() => setOpen(isOpen ? null : 'quiz')} className="uk-press" aria-expanded={isOpen}
        style={{ width:'100%', textAlign:'left', cursor:'pointer', border:'none', background:'transparent', color:Y.txt,
          display:'flex', alignItems:'center', gap:12, padding:'15px 16px' }}>
        <span aria-hidden style={{ width:44, height:44, borderRadius:13, flexShrink:0, fontSize:20, display:'flex', alignItems:'center',
          justifyContent:'center', background:Y.tint }}>✅</span>
        <span style={{ flex:1 }}>
          <span style={{ display:'block', fontFamily:Y.disp, fontSize:16.5, fontWeight:600, lineHeight:1.2 }}>{tr('quiz_title')}</span>
          <span style={{ display:'block', fontFamily:Y.sans, fontSize:12, color:Y.mut, marginTop:3, lineHeight:1.45 }}>
            {baselineDone() ? tr('quiz_intro_again') : tr('quiz_intro')}</span>
        </span>
        <span aria-hidden style={{ fontFamily:Y.disp, fontSize:18, color:Y.teal }}>{isOpen ? '–' : '+'}</span>
      </button>
      {isOpen && (
        <div style={{ padding:'0 16px 16px' }}>
          {result ? (
            <div>
              <p style={{ fontFamily:Y.disp, fontSize:18, fontWeight:600, color:Y.txt, margin:'0 0 10px' }}>
                {tr('quiz_score').replace('{n}', result.score).replace('{t}', result.out_of)}</p>
              {(result.feedback || []).map(f => {
                const q = items.find(x => x.code === f.code)
                return (
                  <div key={f.code} style={{ marginBottom:10, paddingLeft:11, borderLeft:`3px solid ${f.correct ? Y.green : Y.coral}` }}>
                    <p style={{ fontFamily:Y.sans, fontSize:13, fontWeight:700, color:Y.txt, margin:'0 0 3px' }}>{f.correct ? '✓ ' : '✗ '}{q?.prompt}</p>
                    {!f.correct && q && <p style={{ fontFamily:Y.sans, fontSize:12.5, color:Y.green, margin:'0 0 3px' }}>{q.options[f.correct_index]}</p>}
                    {f.explanation && <p style={{ fontFamily:Y.sans, fontSize:12.5, color:Y.txt, opacity:.8, lineHeight:1.55, margin:0 }}>{f.explanation}</p>}
                  </div>
                )
              })}
              <button onClick={() => { setResult(null); setAnswers({}) }} className="uk-press"
                style={{ fontFamily:Y.disp, fontSize:12.5, fontWeight:600, minHeight:40, padding:'0 14px', borderRadius:20,
                  border:`1px solid ${Y.line}`, background:'transparent', color:Y.txt, cursor:'pointer' }}>{tr('quiz_again')}</button>
            </div>
          ) : (
            <div>
              {items.map((q, i) => (
                <fieldset key={q.code} style={{ border:'none', padding:0, margin:'0 0 14px' }}>
                  <legend style={{ fontFamily:Y.sans, fontSize:13.5, fontWeight:700, color:Y.txt, marginBottom:6, lineHeight:1.45 }}>{i + 1}. {q.prompt}</legend>
                  {q.options.map((o, j) => {
                    const on = answers[q.code] === j
                    return (
                      <label key={j} style={{ display:'flex', gap:9, alignItems:'flex-start', padding:'9px 11px', margin:'5px 0', borderRadius:10,
                        cursor:'pointer', border:`1px solid ${on ? Y.teal : Y.line}`, background: on ? Y.tint : 'transparent',
                        fontFamily:Y.sans, fontSize:13, color:Y.txt, lineHeight:1.45 }}>
                        <input type="radio" name={q.code} checked={on} onChange={() => setAnswers(s => ({ ...s, [q.code]: j }))}
                          style={{ marginTop:3, accentColor:'var(--uk-teal)' }}/>
                        <span>{o}</span>
                      </label>
                    )
                  })}
                </fieldset>
              ))}
              <label style={{ display:'block', fontFamily:Y.sans, fontSize:13, fontWeight:700, color:Y.txt, margin:'4px 0 6px' }}>{tr('quiz_age')}</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
                {[...AGES, 'under18'].map(a => (
                  <button key={a} onClick={() => setAge(a)} className="uk-press"
                    style={{ fontFamily:Y.sans, fontSize:12, fontWeight:700, minHeight:36, padding:'0 12px', borderRadius:18, cursor:'pointer',
                      border:`1px solid ${age === a ? Y.teal : Y.line}`, background: age === a ? Y.teal : 'transparent', color: age === a ? Y.on : Y.mut }}>
                    {a === 'under18' ? tr('quiz_under18_btn') : a}</button>
                ))}
              </div>
              {msg && <p style={{ fontFamily:Y.sans, fontSize:12.5, color:Y.gold, margin:'0 0 10px' }}>{msg}</p>}
              <button onClick={submit} disabled={!complete || busy} className="uk-press"
                style={{ fontFamily:Y.disp, fontSize:14, fontWeight:600, minHeight:44, padding:'0 18px', borderRadius:22, border:'none',
                  background: complete ? Y.teal : Y.tint, color: complete ? Y.on : Y.mut, cursor: complete ? 'pointer' : 'default' }}>
                {busy ? tr('quiz_saving') : tr('quiz_submit')}</button>
              <p style={{ fontFamily:Y.sans, fontSize:11, color:Y.mut, margin:'10px 0 0', lineHeight:1.5 }}>{tr('quiz_privacy')}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
