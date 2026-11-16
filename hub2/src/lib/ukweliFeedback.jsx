import { useState, useEffect } from 'react'
import { sb, C, toast, timeAgo } from './supabase'
import { SectionLabel, Chip, Btn } from './components'

// ── 💬 Youth feedback from UkweliSRHR (Admin → Ukweli → Feedback) ─────────────
// Anonymous answers from the in-app "Tell us what you think" form: a 1–5 face
// rating plus what they liked, what was confusing and what's missing. Shown with
// the context it came from (section, language, county if shared, partner link).

const FACES = ['😞', '🙁', '😐', '🙂', '😍']
const SECTION_NAMES = { ask:'Uliza', myths:'Myth-busters', disinfo:'Trending', learn:'Learn', fika:'Hebu Fika' }
const LANG_NAMES = { en:'English', sw:'Kiswahili', sheng:'Sheng' }
const BAR = C.sky

export function countNewFeedback() {
  return sb.from('ukweli_feedback').select('id', { count:'exact', head:true }).eq('status', 'new')
    .then(({ count }) => count || 0, () => 0)
}

export function UkweliFeedback({ onChange }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [days, setDays] = useState(30)          // 0 = all time
  const [status, setStatus] = useState('all')   // all | new
  const [partner, setPartner] = useState('')    // '' = all, '(direct)' = no link
  const [orgs, setOrgs] = useState({})

  const load = async () => {
    setErr('')
    let q = sb.from('ukweli_feedback').select('*').order('created_at', { ascending:false }).limit(1000)
    if (days) q = q.gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
    const { data, error } = await q
    if (error) { setErr(/ukweli_feedback/.test(error.message) ? 'The feedback database update hasn’t been run yet.' : error.message); setRows([]); return }
    setRows(data || [])
  }
  useEffect(() => { load() }, [days])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    sb.from('organizations').select('slug,short_name,name').not('slug', 'is', null)
      .then(({ data }) => setOrgs(Object.fromEntries((data || []).map(o => [o.slug, o.short_name || o.name]))))
  }, [])

  const partnerName = (ref) => ref ? (orgs[ref] || ref) : 'No partner link'
  const list = (rows || []).filter(r =>
    (status === 'all' || r.status === 'new') &&
    (!partner || (partner === '(direct)' ? !r.ref : r.ref === partner)))

  const setRead = async (r, s) => {
    const { error } = await sb.from('ukweli_feedback').update({ status: s }).eq('id', r.id)
    if (error) { toast(error.message, 'red'); return }
    setRows(l => l.map(x => x.id === r.id ? { ...x, status: s } : x)); onChange?.()
  }
  const markAllRead = async () => {
    const ids = list.filter(r => r.status === 'new').map(r => r.id)
    if (!ids.length) return
    const { error } = await sb.from('ukweli_feedback').update({ status:'read' }).in('id', ids)
    if (error) { toast(error.message, 'red'); return }
    setRows(l => l.map(x => ids.includes(x.id) ? { ...x, status:'read' } : x)); onChange?.()
    toast(`✓ ${ids.length} marked as read`, 'green')
  }
  const remove = async (r) => {
    if (!confirm('Delete this feedback? This can’t be undone.')) return
    const { error } = await sb.from('ukweli_feedback').delete().eq('id', r.id)
    if (error) { toast(error.message, 'red'); return }
    setRows(l => l.filter(x => x.id !== r.id)); onChange?.()
  }

  const exportCsv = () => {
    const head = ['date', 'rating', 'liked', 'confusing', 'missing', 'section', 'language', 'county', 'partner', 'device', 'status']
    const body = list.map(r => [r.created_at.slice(0, 16).replace('T', ' '), r.rating || '', r.liked || '', r.confusing || '', r.missing || '',
      SECTION_NAMES[r.tab] || r.tab || '', LANG_NAMES[r.lang] || r.lang || '', r.county || '', partnerName(r.ref), r.device || '', r.status])
    const csv = [head, ...body].map(row => row.map(v => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }))
    a.download = `ukweli-feedback_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  if (!rows) return <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut }}>Loading…</p>

  const rated = list.filter(r => r.rating)
  const avg = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length) : null
  const dist = [1, 2, 3, 4, 5].map(n => rated.filter(r => r.rating === n).length)
  const distTop = Math.max(...dist, 1)
  const refs = [...new Set((rows || []).map(r => r.ref || '(direct)'))]
  const newCount = list.filter(r => r.status === 'new').length

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, margin:'0 0 12px', lineHeight:1.6, maxWidth:640 }}>
        Anonymous feedback from young people using UkweliSRHR ("Tell us what you think" at the foot of every section).
      </p>

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:14 }}>
        {[[7,'7 days'],[30,'30 days'],[0,'All time']].map(([d, l]) => <Chip key={d} active={days === d} color={C.sky} onClick={()=>setDays(d)}>{l}</Chip>)}
        <span style={{ width:8 }}/>
        {[['all','All'],['new','New only']].map(([k, l]) => <Chip key={k} active={status === k} color={C.lilac} onClick={()=>setStatus(k)}>{l}</Chip>)}
        <select value={partner} onChange={e=>setPartner(e.target.value)} aria-label="Partner"
          style={{ fontFamily:C.sans, fontSize:12, padding:'6px 8px', borderRadius:8, border:`1px solid ${C.line}`, background:'#fff', color:C.txt }}>
          <option value="">All partners</option>
          {refs.map(r => <option key={r} value={r}>{r === '(direct)' ? 'No partner link' : partnerName(r)}</option>)}
        </select>
        <Btn small ghost color={C.mint} onClick={exportCsv} disabled={!list.length}>⬇ Export CSV</Btn>
        {newCount > 0 && <Btn small ghost color={C.lilac} onClick={markAllRead}>✓ Mark {newCount} as read</Btn>}
      </div>

      {err && <p style={{ fontFamily:C.sans, fontSize:12, color:C.coral }}>{err}</p>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px,1fr))', gap:10, marginBottom:14 }}>
        <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontFamily:C.serif, fontSize:30, fontWeight:700, color:C.txt, lineHeight:1.1 }}>{list.length}</div>
          <div style={{ fontFamily:C.sans, fontSize:11, color:C.mut, marginTop:2 }}>responses{newCount ? ` · ${newCount} new` : ''}</div>
          <div style={{ fontFamily:C.serif, fontSize:30, fontWeight:700, color:C.txt, lineHeight:1.1, marginTop:10 }}>
            {avg ? `${avg.toFixed(1)} / 5 ${FACES[Math.round(avg) - 1]}` : '—'}
          </div>
          <div style={{ fontFamily:C.sans, fontSize:11, color:C.mut, marginTop:2 }}>average rating ({rated.length} rated)</div>
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'14px 16px' }}>
          <SectionLabel color={C.sky}>Ratings</SectionLabel>
          {[5, 4, 3, 2, 1].map(n => (
            <div key={n} title={`${n}/5: ${dist[n - 1]}`} style={{ display:'flex', alignItems:'center', gap:8, padding:'3px 0' }}>
              <span style={{ fontSize:16, width:22 }}>{FACES[n - 1]}</span>
              <div style={{ flex:1, height:6, background:C.card2, borderRadius:4 }}>
                <div style={{ width:`${dist[n - 1] ? Math.max(3, 100 * dist[n - 1] / distTop) : 0}%`, height:'100%', background:BAR, borderRadius:4 }}/>
              </div>
              <b style={{ fontFamily:C.sans, fontSize:12, color:C.txt, width:28, textAlign:'right' }}>{dist[n - 1]}</b>
            </div>
          ))}
        </div>
      </div>

      {list.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>No feedback in this view yet.</p>}
      {list.map(r => (
        <div key={r.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${r.status === 'new' ? C.lilac : C.line}`,
          borderRadius:12, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:C.sans, fontSize:11, color:C.mut }}>
              {r.rating ? <span style={{ fontSize:18, marginRight:6, verticalAlign:'middle' }} title={`${r.rating}/5`}>{FACES[r.rating - 1]}</span> : null}
              {timeAgo(r.created_at)} · {SECTION_NAMES[r.tab] || r.tab || '—'} · {LANG_NAMES[r.lang] || r.lang || '—'}
              {r.county ? ` · ${r.county}` : ''} · {partnerName(r.ref)}{r.device ? ` · ${r.device}` : ''}
            </span>
            <span style={{ display:'flex', gap:6 }}>
              {r.status === 'new'
                ? <Btn small ghost color={C.lilac} onClick={()=>setRead(r, 'read')}>✓ Read</Btn>
                : <Btn small ghost color={C.mut} onClick={()=>setRead(r, 'new')}>Mark new</Btn>}
              <Btn small ghost color={C.coral} onClick={()=>remove(r)}>🗑</Btn>
            </span>
          </div>
          {[['👍 Liked', r.liked], ['🤔 Confusing / didn’t work', r.confusing], ['➕ Missing', r.missing]].filter(([, v]) => v).map(([l, v]) => (
            <p key={l} style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, margin:'8px 0 0', lineHeight:1.55, whiteSpace:'pre-wrap' }}>
              <b style={{ color:C.mut, fontSize:11 }}>{l}:</b> {v}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
