import { useState, useEffect, useMemo } from 'react'
import { sb, C, toast } from './supabase'
import { Btn } from './components'

// ── Relevance scoring ────────────────────────────────────────────────────────
// Match an item (opportunity / resource / event) to partner organisations by the
// SRHR topics they share (item text/tags vs each org's focus area + tags). Only a
// shared topic counts: plain word overlap ("health", "women", "kenya") matched
// almost every partner, so it is no longer scored. Kept deliberately transparent:
// the admin sees the shared topics and can tick or untick anyone.

const TOPICS = [
  'contraception','family planning','abortion','post-abortion','hiv','aids','sti','prep','arv',
  'maternal','pregnancy','teenage pregnancy','adolescent','youth','young people','gbv','fgm',
  'cse','sexuality education','rights','bodily autonomy','disability','men','boys','male',
  'faith','religion','disinformation','misinformation','advocacy','policy','research','data',
  'menstrual','menstruation','wash','nutrition','mental health','counselling','clinical','service delivery',
]
const norm = (s) => String(s || '').toLowerCase()

function itemText(item) {
  return [item.title, item.description, item.org, item.source_org, (item.focus_tags || []).join(' ')].filter(Boolean).join(' ')
}
function orgText(o) {
  return [o.focus_area, (o.focus_tags || []).join(' '), o.short_name, o.name, o.description].filter(Boolean).join(' ')
}

// Whole-word test (plurals allowed), so 'men' doesn't match 'women' or 'mental'
// and 'sti' doesn't match 'institute'. Topics are plain words, so no escaping needed.
const hasTopic = (text, t) => new RegExp('(^|[^a-z])' + t + '(s|es)?([^a-z]|$)').test(text)

export function scorePartners(item, orgs) {
  const it = norm(itemText(item))
  const itTopics = TOPICS.filter(t => hasTopic(it, t))
  return orgs.map(o => {
    const ot = norm(orgText(o))
    const sharedTopics = itTopics.filter(t => hasTopic(ot, t))
    return { org: o, score: sharedTopics.length, why: sharedTopics.slice(0, 4) }
  }).sort((a, b) => b.score - a.score)
}

// ── Admin: match & notify partners ───────────────────────────────────────────
export function NotifyButton({ item, itemType }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); setOpen(true) }} title="Match & notify partners"
        style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, padding:'6px 12px', borderRadius:10,
          border:`1px solid ${C.sky}`, background:'transparent', color:C.sky, cursor:'pointer' }}>
        🔔 Notify partners
      </button>
      {open && <MatchNotifyModal item={item} itemType={itemType} onClose={() => setOpen(false)} />}
    </>
  )
}

export function MatchNotifyModal({ item, itemType, onClose }) {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState({})       // org_id -> bool
  const [email, setEmail] = useState(true)
  // Members already get a push when the item is approved, so this is off by default.
  const [push, setPush] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    sb.from('organizations').select('id,name,short_name,focus_area,focus_tags,contact_email,notify_opt_in,website')
      .eq('approved', true).order('short_name').limit(400)
      .then(({ data }) => {
        const list = data || []
        setOrgs(list)
        setLoading(false)
      }, () => setLoading(false))
  }, [])

  const ranked = useMemo(() => scorePartners(item, orgs), [item, orgs])
  // pre-check everything scoring a match once orgs load
  useEffect(() => {
    if (!ranked.length) return
    const init = {}; ranked.forEach(r => { if (r.score > 0) init[r.org.id] = true })
    setPicked(init)
  }, [orgs]) // eslint-disable-line

  const matched = ranked.filter(r => r.score > 0)
  const rest = ranked.filter(r => r.score === 0)
  const shown = showAll ? ranked : (matched.length ? matched : ranked.slice(0, 12))
  const chosen = ranked.filter(r => picked[r.org.id])
  const chosenWithEmail = chosen.filter(r => (r.org.contact_email || '').trim() && r.org.notify_opt_in !== false)

  const send = async () => {
    const org_ids = chosen.map(r => r.org.id)
    if (!org_ids.length && !push) { toast('Pick at least one partner, or enable push', 'red'); return }
    setBusy(true)
    const { data, error } = await sb.functions.invoke('notify-partners', {
      body: { item_type: itemType, item_id: item.id, org_ids, channels: { email, push }, note: note.trim() },
    })
    setBusy(false)
    if (error) { toast('Could not notify: ' + (error.message || 'the notify service is not deployed yet'), 'red'); return }
    const bits = []
    if (data?.emailed) bits.push(`${data.emailed} emailed`)
    if (data?.pushed) bits.push('members pushed')
    if (data?.skipped) bits.push(`${data.skipped} skipped`)
    if (data?.failed) bits.push(`${data.failed} failed`)
    toast('✓ ' + (bits.join(' · ') || 'Notifications sent'), 'green')
    onClose()
  }

  const row = (r) => {
    const on = !!picked[r.org.id]
    const hasEmail = (r.org.contact_email || '').trim()
    const optedOut = r.org.notify_opt_in === false
    return (
      <label key={r.org.id} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'9px 10px', borderRadius:10,
        border:`1px solid ${on ? C.sky+'66' : C.line}`, background: on ? C.sky+'0f' : C.card, cursor:'pointer', marginBottom:6 }}>
        <input type="checkbox" checked={on} onChange={e => setPicked(p => ({ ...p, [r.org.id]: e.target.checked }))} style={{ marginTop:3 }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:C.sans, fontSize:13, fontWeight:800, color:C.txt }}>{r.org.short_name || r.org.name}</span>
            {r.score > 0 && <span style={{ fontFamily:C.sans, fontSize:9.5, fontWeight:800, color:C.mint, background:C.mint+'1a', borderRadius:20, padding:'1px 8px' }}>match {r.score}</span>}
            {!hasEmail && <span style={{ fontFamily:C.sans, fontSize:9.5, color:C.mut }}>no email → push only</span>}
            {optedOut && <span style={{ fontFamily:C.sans, fontSize:9.5, color:C.coral }}>opted out</span>}
          </div>
          {r.org.focus_area && <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'2px 0 0' }}>{r.org.focus_area}</p>}
          {r.why.length > 0 && <p style={{ fontFamily:C.sans, fontSize:10, color:C.sky, margin:'2px 0 0' }}>↳ {r.why.join(' · ')}</p>}
        </div>
      </label>
    )
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:60,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:20, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Match &amp; notify partners</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 8px', lineHeight:1.5 }}>
          “{item.title}” — partners are ranked by how well their focus area matches. Confirm who to notify.
        </p>

        <div style={{ display:'flex', gap:8, margin:'6px 0 12px', flexWrap:'wrap' }}>
          <label style={{ display:'flex', gap:6, alignItems:'center', fontFamily:C.sans, fontSize:12, color:C.txt, cursor:'pointer' }}>
            <input type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)}/> ✉️ Email partners
          </label>
          <label style={{ display:'flex', gap:6, alignItems:'center', fontFamily:C.sans, fontSize:12, color:C.txt, cursor:'pointer' }}>
            <input type="checkbox" checked={push} onChange={e=>setPush(e.target.checked)}/> 🔔 Push to members again (already sent on approval)
          </label>
        </div>

        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional note to include in the email…"
          style={{ width:'100%', boxSizing:'border-box', fontFamily:C.sans, fontSize:12.5, color:C.txt, background:C.card,
            border:`1px solid ${C.line}`, borderRadius:10, padding:'9px 11px', minHeight:52, marginBottom:12 }}/>

        {loading ? <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut }}>Loading partners…</p> : (
          <>
            <p style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:C.mut, margin:'0 0 8px' }}>
              {matched.length ? `${matched.length} matched · ${chosen.length} selected` : 'No strong matches — pick manually'}
            </p>
            {shown.map(row)}
            {!showAll && rest.length > 0 && matched.length > 0 && (
              <button onClick={()=>setShowAll(true)} style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, color:C.sky, background:'none', border:'none', cursor:'pointer', padding:'6px 0' }}>
                ▼ Show all {ranked.length} partners
              </button>
            )}
          </>
        )}

        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <Btn full color={C.sky} onClick={send} disabled={busy || loading}>
            {busy ? 'Sending…' : `Notify ${chosen.length} partner${chosen.length===1?'':'s'}${push ? ' + members' : ''}`}
          </Btn>
          <Btn ghost onClick={onClose}>Cancel</Btn>
        </div>
        {email && chosen.length > 0 && chosenWithEmail.length < chosen.length && (
          <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'8px 0 0' }}>
            {chosen.length - chosenWithEmail.length} selected partner(s) have no contact email yet — add one in the Directory to email them.
          </p>
        )}
      </div>
    </div>
  )
}
