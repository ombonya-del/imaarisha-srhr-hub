import { useState, useEffect } from 'react'
import { sb, C, toast } from './supabase'
import { SectionLabel, Chip, Btn } from './components'

// ── 📈 UkweliSRHR usage report (Admin → Ukweli → Usage report) ────────────────
// Reads the anonymous counts through the admin-only ukweli_report() function:
// how many young people, where (county they chose to share), which partner
// link brought them, and which sections, topics and questions they engaged with.
// Everything can be exported as one CSV for partner and donor reporting.

const UKWELI_URL = 'https://ukweli.imaarishasrhr.org'
const BAR = C.sky   // one hue: every chart here is a single measure
const SECTION_NAMES = { ask:'Uliza (ask anonymously)', myths:'Myth-busters', disinfo:'Trending / Kweli check', learn:'Learn', fika:'Hebu Fika (services)' }
const LANG_NAMES = { en:'English', sw:'Kiswahili', sheng:'Sheng' }

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000))
const fmt = (n) => (n ?? 0).toLocaleString('en-KE')

export function UkweliUsage() {
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(iso(new Date()))
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (f = from, t = to) => {
    setBusy(true); setErr('')
    const { data: r, error } = await sb.rpc('ukweli_report', { p_from: f, p_to: t })
    setBusy(false)
    if (error) { setErr(/ukweli_report/.test(error.message) ? 'The analytics database update hasn’t been run yet.' : error.message); setData(null); return }
    setData(r)
  }
  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const preset = (n) => { const f = daysAgo(n - 1), t = iso(new Date()); setFrom(f); setTo(t); load(f, t) }

  const exportCsv = () => {
    if (!data) return
    const rows = [['section', 'label', 'value', 'value2']]
    const add = (sec, list, label, val, val2) => (list || []).forEach(x => rows.push([sec, label(x), x[val], val2 ? x[val2] : '']))
    rows.push(['range', 'from', data.range.from, ''], ['range', 'to', data.range.to, ''])
    Object.entries(data.totals || {}).forEach(([k, v]) => rows.push(['totals', k, v, '']))
    add('daily (visitors, sessions)', data.daily, x => x.day, 'visitors', 'sessions')
    add('county (visitors)', data.counties, x => x.county, 'visitors')
    add('partner link (visitors)', data.partners, x => x.partner, 'visitors')
    add('section (views, visitors)', data.sections, x => SECTION_NAMES[x.tab] || x.tab, 'views', 'visitors')
    add('most opened (opens, visitors)', data.top_items, x => `${SECTION_NAMES[x.tab] || x.tab}: ${x.item}`, 'opens', 'visitors')
    add('question topics (questions)', data.question_topics, x => x.category, 'questions')
    add('language (visitors)', data.languages, x => LANG_NAMES[x.lang] || x.lang, 'visitors')
    add('device (visitors)', data.devices, x => x.device, 'visitors')
    add('Hebu Fika reviews by county', data.fika_by_county, x => x.county, 'reviews')
    const csv = rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `ukweli-usage_${data.range.from}_to_${data.range.to}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  const dateIn = { fontFamily:C.sans, fontSize:12, padding:'6px 8px', borderRadius:8, border:`1px solid ${C.line}`, background:'#fff', color:C.txt }
  const t = data?.totals || {}

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, margin:'0 0 12px', lineHeight:1.6, maxWidth:640 }}>
        Anonymous counts from UkweliSRHR: no names, no IP addresses, no question text. "Visitors" are unique devices per month;
        county is only known when a young person chooses to share it.
      </p>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
        <Chip color={C.sky} onClick={()=>preset(7)}>Last 7 days</Chip>
        <Chip color={C.sky} onClick={()=>preset(30)}>Last 30 days</Chip>
        <Chip color={C.sky} onClick={()=>preset(90)}>Last 90 days</Chip>
        <input type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)} style={dateIn} aria-label="From"/>
        <span style={{ fontFamily:C.sans, fontSize:12, color:C.mut }}>to</span>
        <input type="date" value={to} min={from} onChange={e=>setTo(e.target.value)} style={dateIn} aria-label="To"/>
        <Btn small color={C.sky} onClick={()=>load()} disabled={busy}>{busy ? 'Loading…' : 'Update'}</Btn>
        <Btn small ghost color={C.mint} onClick={exportCsv} disabled={!data}>⬇ Export CSV</Btn>
      </div>

      {err && <p style={{ fontFamily:C.sans, fontSize:12, color:C.coral }}>{err}</p>}
      {!data && !err && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut }}>Crunching…</p>}

      {data && <>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:8, marginBottom:16 }}>
          {[[t.visitors,'young people (unique devices)'],[t.sessions,'visits'],[t.questions,'questions asked'],
            [t.items_opened,'myths, topics & posts opened'],[t.fika_reviews,'Hebu Fika reviews'],
            [t.visitors ? Math.round(100 * (t.county_given || 0) / t.visitors) + '%' : '—','shared their county']].map(([v,l],i) => (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontFamily:C.serif, fontSize:28, fontWeight:700, color:C.txt, lineHeight:1.1 }}>{typeof v === 'number' ? fmt(v) : v}</div>
              <div style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>

        <Panel title="Visitors per day">
          <DailyBars rows={data.daily}/>
        </Panel>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(290px,1fr))', gap:10 }}>
          <Panel title="Where: county (visitors)"><Ranked rows={[...(data.counties || [])].sort((a, b) => (a.county === 'Not given') - (b.county === 'Not given'))} label={x=>x.county} value="visitors"/></Panel>
          <Panel title="Partner link they came through (visitors)"><Ranked rows={data.partners} label={x=>x.partner} value="visitors"/></Panel>
          <Panel title="Sections used (views)"><Ranked rows={data.sections} label={x=>SECTION_NAMES[x.tab] || x.tab} value="views" sub={x=>`${fmt(x.visitors)} visitors`}/></Panel>
          <Panel title="Question topics (Uliza)"><Ranked rows={data.question_topics} label={x=>x.category} value="questions"/></Panel>
          <Panel title="Most opened myths, topics & posts"><Ranked rows={data.top_items} label={x=>x.item} value="opens" sub={x=>SECTION_NAMES[x.tab] || x.tab} max={15}/></Panel>
          <Panel title="Hebu Fika reviews by county"><Ranked rows={data.fika_by_county} label={x=>x.county} value="reviews"/></Panel>
          <Panel title="Language (visitors)"><Ranked rows={data.languages} label={x=>LANG_NAMES[x.lang] || x.lang} value="visitors"/></Panel>
          <Panel title="Device (visitors)"><Ranked rows={data.devices} label={x=>x.device} value="visitors"/></Panel>
        </div>
      </>}

      <PartnerLinks/>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
      <SectionLabel color={C.sky}>{title}</SectionLabel>
      {children}
    </div>
  )
}

const Empty = () => <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, fontStyle:'italic', margin:0 }}>Nothing in this period yet.</p>

// Ranked horizontal bars: label + value in text colours, the bar carries the magnitude.
function Ranked({ rows, label, value, sub, max = 12 }) {
  if (!rows || !rows.length) return <Empty/>
  const list = rows.slice(0, max)
  const top = Math.max(...list.map(r => r[value] || 0), 1)
  return (
    <div role="table">
      {list.map((r, i) => (
        <div key={i} role="row" title={`${label(r)}: ${fmt(r[value])}`} style={{ padding:'5px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline' }}>
            <span role="cell" style={{ fontFamily:C.sans, fontSize:12, color:C.txt, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {label(r)}{sub && <span style={{ color:C.mut, fontSize:10.5 }}> · {sub(r)}</span>}
            </span>
            <b role="cell" style={{ fontFamily:C.sans, fontSize:12, color:C.txt }}>{fmt(r[value])}</b>
          </div>
          <div style={{ height:6, marginTop:3, background:C.card2, borderRadius:4 }}>
            <div style={{ width:`${Math.max(2, 100 * (r[value] || 0) / top)}%`, height:'100%', background:BAR, borderRadius:4 }}/>
          </div>
        </div>
      ))}
      {rows.length > max && <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'4px 0 0' }}>+ {rows.length - max} more in the CSV</p>}
    </div>
  )
}

// Daily visitors as thin vertical bars on a zero baseline; hover a bar for the exact day.
function DailyBars({ rows }) {
  const [hover, setHover] = useState(null)
  if (!rows || !rows.length) return <Empty/>
  const top = Math.max(...rows.map(r => r.visitors), 1)
  const shown = hover ?? rows[rows.length - 1]
  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 6px' }}>
        <b style={{ color:C.txt }}>{shown.day}</b> · {fmt(shown.visitors)} visitors · {fmt(shown.sessions)} visits
      </p>
      <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:110, borderBottom:`1px solid ${C.line}` }} onMouseLeave={()=>setHover(null)}>
        {rows.map(r => (
          <div key={r.day} onMouseEnter={()=>setHover(r)} onClick={()=>setHover(r)} title={`${r.day}: ${r.visitors} visitors`}
            style={{ flex:1, height:'100%', display:'flex', alignItems:'flex-end', cursor:'default' }}>
            <div style={{ width:'100%', maxWidth:22, margin:'0 auto', height:`${Math.max(2, 100 * r.visitors / top)}%`,
              background:BAR, opacity: hover && hover.day !== r.day ? 0.45 : 1, borderRadius:'4px 4px 0 0' }}/>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontFamily:C.sans, fontSize:10, color:C.mut, marginTop:4 }}>
        <span>{rows[0].day}</span><span>{rows[rows.length - 1].day}</span>
      </div>
    </div>
  )
}

// ── Partner links: one ?ref= link per approved organisation ──────────────────
function PartnerLinks() {
  const [orgs, setOrgs] = useState(null)
  useEffect(() => {
    sb.from('organizations').select('name,short_name,slug,contact_email').eq('approved', true).order('short_name')
      .then(({ data }) => setOrgs(data || []))
  }, [])
  const link = (o) => `${UKWELI_URL}/?ref=${o.slug}`
  const copy = (txt, msg) => navigator.clipboard?.writeText(txt).then(() => toast(msg, 'green'), () => toast('Copy failed', 'red'))
  const copyAll = () => {
    const rows = [['organisation', 'contact_email', 'ukweli_link'], ...(orgs || []).filter(o => o.slug).map(o => [o.short_name || o.name, o.contact_email || '', link(o)])]
    copy(rows.map(r => r.map(v => /[",]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n'), '✓ Copied all links (CSV)')
  }
  if (!orgs) return null
  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'14px 16px', marginTop:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <SectionLabel color={C.mint}>🔗 Partner links ({orgs.filter(o => o.slug).length})</SectionLabel>
        <Btn small ghost color={C.mint} onClick={copyAll}>Copy all (CSV)</Btn>
      </div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 8px', lineHeight:1.5 }}>
        Give each partner its own link. Young people who arrive through it are counted under that partner above.
      </p>
      {orgs.map(o => (
        <div key={o.slug || o.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'6px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ fontFamily:C.sans, fontSize:12, color:C.txt, minWidth:0 }}>
            {o.short_name || o.name}
            <span style={{ display:'block', fontSize:10.5, color:C.mut, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {o.slug ? link(o) : 'No link: this organisation has no slug'}
            </span>
          </span>
          {o.slug && <Btn small ghost onClick={()=>copy(link(o), '✓ Link copied')}>Copy</Btn>}
        </div>
      ))}
    </div>
  )
}
