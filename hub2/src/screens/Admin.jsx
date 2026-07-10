import { useState, useEffect } from 'react'
import { sb, C, timeAgo, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Chip, Btn, inputStyle } from '../lib/components'

// ── 👑 Admin — visible only to profiles.is_admin (enforced by RLS server-side) ─
export default function Admin({ session }) {
  const [view, setView] = useState('activity')
  const [counts, setCounts] = useState({ uliza: 0, fika: 0, unado: 0 })

  const loadCounts = async () => {
    const head = (t, s) => sb.from(t).select('id', { count: 'exact', head: true }).eq('status', s)
    const [u, r, g, n] = await Promise.all([
      head('uliza_questions', 'pending'),
      head('fika_reviews', 'pending'),
      head('fika_suggestions', 'pending'),
      head('unado_posts', 'pending'),
    ])
    setCounts({ uliza: u.count || 0, fika: (r.count || 0) + (g.count || 0), unado: n.count || 0 })
  }
  useEffect(() => { loadCounts() }, [view])

  return (
    <div>
      <ScreenTitle accent={C.lilac} kicker="👑 Admin · members never see this" title="The control room"
        sub="Activity, usage metrics, members, the Uliza answer desk, and Hebu Fika moderation."/>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['activity','● Activity'],['metrics','📊 Metrics'],['members','👥 Members'],
          ['uliza','💬 Uliza desk',counts.uliza],['fika','📍 Hebu Fika',counts.fika],
          ['unado','📸 UnaDO?',counts.unado]].map(([k,l,n]) => (
          <Chip key={k} active={view===k} onClick={()=>setView(k)} color={C.gold}>
            {l}{n > 0 && <Badge n={n}/>}
          </Chip>
        ))}
      </div>
      {view === 'activity' && <Activity/>}
      {view === 'metrics'  && <Metrics/>}
      {view === 'members'  && <Members/>}
      {view === 'uliza'    && <UlizaDesk session={session} onChange={loadCounts}/>}
      {view === 'fika'     && <FikaDesk onChange={loadCounts}/>}
      {view === 'unado'    && <UnadoDesk session={session} onChange={loadCounts}/>}
    </div>
  )
}

// Small pending-count badge for the desk chips
function Badge({ n }) {
  return <span style={{ marginLeft:6, fontFamily:C.sans, fontSize:9.5, fontWeight:800, color:'#fff',
    background:C.coral, borderRadius:9, padding:'1px 6px', lineHeight:1.5 }}>{n}</span>
}

// ── Full activity log with filters — who posted/uploaded/did what ────────────
function Activity() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')
  useEffect(() => {
    sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(150)
      .then(({data}) => setRows(data || []))
  }, [])
  const kinds = [['all','All'],['discussion_start','Discussions'],['resource_upload','Resources & alerts'],['campaign_launch','Campaigns']]
  const visible = filter === 'all' ? rows : rows.filter(r => r.activity_type === filter)
  const dot = { red:C.coral, green:C.mint, gold:C.gold }
  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
        {kinds.map(([k,l]) => <Chip key={k} active={filter===k} onClick={()=>setFilter(k)} color={C.sky}>{l}</Chip>)}
      </div>
      {visible.map((a,i) => (
        <div key={a.id || i} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ width:8, height:8, borderRadius:'50%', marginTop:5, flexShrink:0, background:dot[a.dot_color] || C.gold }}/>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, margin:0, lineHeight:1.5 }}>{a.description}</p>
            <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'1px 0 0' }}>{timeAgo(a.created_at)}{a.entity_title ? ` · ${a.entity_title}` : ''}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Metrics — resource usage + forum vitality, quantified from activity_log ──
function Metrics() {
  const [stats, setStats] = useState(null)
  useEffect(() => { (async () => {
    const since30 = new Date(Date.now() - 30*24*60*60*1000).toISOString()
    const [act, discs, res, subs] = await Promise.all([
      sb.from('activity_log').select('description,entity_title,created_at').gte('created_at', since30).limit(1000),
      sb.from('discussions').select('subject,reply_count,view_count').order('view_count',{ascending:false}).limit(8),
      sb.from('resources').select('id', { count:'exact', head:true }),
      sb.from('profiles').select('id', { count:'exact', head:true }).eq('digest_subscribed', true),
    ])
    const rows = act.data || []
    const opens  = rows.filter(r => r.description?.includes('opened resource'))
    const shares = rows.filter(r => r.description?.includes('shared resource'))
    const topResources = {}
    ;[...opens, ...shares].forEach(r => { if (r.entity_title) topResources[r.entity_title] = (topResources[r.entity_title]||0)+1 })
    setStats({
      actions30: rows.length, opens: opens.length, shares: shares.length,
      resourceCount: res.count || 0, digestSubs: subs.count || 0,
      topResources: Object.entries(topResources).sort((a,b)=>b[1]-a[1]).slice(0,8),
      topDiscs: discs.data || [],
    })
  })() }, [])
  if (!stats) return <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut }}>Crunching…</p>
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:8, marginBottom:18 }}>
        {[[stats.actions30,'actions · 30 days',C.gold],[stats.opens,'resource opens',C.sky],
          [stats.shares,'resource shares',C.mint],[stats.digestSubs,'digest subscribers',C.lilac],
          [stats.resourceCount,'resources live',C.coral]].map(([v,l,c],i) => (
          <div key={i} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontFamily:C.serif, fontSize:28, fontWeight:700, color:c }}>{v}</div>
            <div style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:10 }}>
        <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:16 }}>
          <SectionLabel color={C.sky}>Most used resources (30d)</SectionLabel>
          {stats.topResources.length === 0 && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, fontStyle:'italic' }}>No opens logged yet.</p>}
          {stats.topResources.map(([t,n],i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'6px 0', borderBottom:`1px solid ${C.line}` }}>
              <span style={{ fontFamily:C.sans, fontSize:12, color:C.txt }}>{t.slice(0,48)}</span>
              <b style={{ fontFamily:C.serif, fontSize:15, color:C.sky }}>{n}</b>
            </div>
          ))}
        </div>
        <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:16 }}>
          <SectionLabel color={C.mint}>Top discussions</SectionLabel>
          {stats.topDiscs.map((d,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'6px 0', borderBottom:`1px solid ${C.line}` }}>
              <span style={{ fontFamily:C.sans, fontSize:12, color:C.txt }}>{(d.subject||'').slice(0,44)}</span>
              <span style={{ fontFamily:C.sans, fontSize:11, color:C.mut, whiteSpace:'nowrap' }}>💬{d.reply_count||0} 👁{d.view_count||0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Members & digest list ────────────────────────────────────────────────────
function Members() {
  const [profiles, setProfiles] = useState([])
  const [orgs, setOrgs] = useState([])
  const [editOrg, setEditOrg] = useState(null)       // { id, name, short_name, focus_area }
  const [editMember, setEditMember] = useState(null) // { id, full_name }

  const loadProfiles = () => sb.from('profiles').select('*').order('created_at',{ascending:false}).limit(300).then(({data}) => setProfiles(data || []))
  const loadOrgs = () => sb.from('organizations').select('*').order('short_name').then(({data}) => setOrgs(data || []))
  useEffect(() => { loadProfiles(); loadOrgs() }, [])

  const eIn = { fontFamily:C.sans, fontSize:12, padding:'5px 8px', borderRadius:7, border:`1px solid ${C.line}`, background:'#fff', color:C.txt, minWidth:0 }

  // ── Organization actions ──
  const approveOrg = async (o) => {
    const { error } = await sb.from('organizations').update({ approved: true }).eq('id', o.id)
    if (error) toast(error.message,'red'); else { toast('✓ Approved — now in the Directory','green'); loadOrgs() }
  }
  const deleteOrg = async (o) => {
    if (!confirm(`Delete the organization "${o.name}" from the Directory?`)) return
    const { error } = await sb.from('organizations').delete().eq('id', o.id)
    if (error) toast(error.message,'red'); else { toast('Organization deleted','gold'); loadOrgs() }
  }
  const saveOrg = async () => {
    const { id, name, short_name, focus_area } = editOrg
    if (!name.trim()) { toast('Name cannot be empty','red'); return }
    const { error } = await sb.from('organizations').update({ name:name.trim(), short_name:(short_name||'').trim()||name.trim(), focus_area:(focus_area||'').trim()||null }).eq('id', id)
    if (error) toast(error.message,'red'); else { toast('✓ Saved','green'); setEditOrg(null); loadOrgs() }
  }

  // ── Member actions ──
  const toggleAdmin = async (p) => {
    const { error } = await sb.from('profiles').update({ is_admin: !p.is_admin }).eq('id', p.id)
    if (error) toast(error.message,'red'); else { toast(p.is_admin ? 'Admin removed' : '👑 Made admin','gold'); loadProfiles() }
  }
  const saveMember = async () => {
    const { id, full_name } = editMember
    const { error } = await sb.from('profiles').update({ full_name: full_name.trim() || null }).eq('id', id)
    if (error) toast(error.message,'red'); else { toast('✓ Saved','green'); setEditMember(null); loadProfiles() }
  }
  const deleteMember = async (p) => {
    if (!confirm(`Remove "${p.full_name || 'this member'}" from the members list?\n\n(This deletes their profile. Their login still exists — fully remove it from Supabase → Authentication if needed.)`)) return
    const { error } = await sb.from('profiles').delete().eq('id', p.id)
    if (error) toast(error.message,'red'); else { toast('Member removed','gold'); loadProfiles() }
  }

  // ── Membership vetting ──
  const approveMember = async (p) => {
    const { error } = await sb.from('profiles').update({ approved: true }).eq('id', p.id)
    if (error) toast(error.message,'red'); else { toast('✓ Member approved — they can enter the hub','green'); loadProfiles() }
  }
  const rejectMember = async (p) => {
    if (!confirm(`Reject the request from "${p.full_name || 'this person'}"? This deletes their profile.`)) return
    const { error } = await sb.from('profiles').delete().eq('id', p.id)
    if (error) toast(error.message,'red'); else { toast('Request rejected','gold'); loadProfiles() }
  }

  const pending = orgs.filter(o => !o.approved)
  const approved = orgs.filter(o => o.approved)
  const subs = profiles.filter(p => p.digest_subscribed)
  const pendingMembers = profiles.filter(p => !p.approved && !p.is_admin)

  return (
    <div>
      {/* Members awaiting approval — the vetting gate */}
      <SectionLabel color={C.coral}>👥 Members awaiting approval ({pendingMembers.length})</SectionLabel>
      {pendingMembers.length === 0 ? (
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
          None waiting. New sign-ups appear here to vet before they can enter the hub.
        </p>
      ) : pendingMembers.map(p => (
        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:`1px solid ${C.line}` }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontFamily:C.sans, fontSize:13, fontWeight:800, color:C.txt, margin:0 }}>
              {p.full_name || '(no name)'} <span style={{ color:C.mut, fontWeight:400, fontSize:10.5 }}>· {timeAgo(p.created_at)}</span>
            </p>
            {p.reason && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'2px 0 0', lineHeight:1.5 }}>“{p.reason}”</p>}
          </div>
          <span style={{ display:'flex', gap:6, flexShrink:0 }}>
            <Btn small color={C.mint} onClick={()=>approveMember(p)}>✓ Approve</Btn>
            <Btn small ghost color={C.coral} onClick={()=>rejectMember(p)}>✕ Reject</Btn>
          </span>
        </div>
      ))}
      <div style={{ height:16 }}/>

      {/* Pending approvals */}
      <SectionLabel color={C.coral}>🏛 Organizations awaiting approval ({pending.length})</SectionLabel>
      {pending.length === 0 ? (
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
          None pending. New sign-ups land here for approval before joining the public Directory.
        </p>
      ) : pending.map(o => (
        <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt }}>{o.name}{o.focus_area ? ` · ${o.focus_area}` : ''}</span>
          <span style={{ display:'flex', gap:6 }}>
            <Btn small color={C.mint} onClick={()=>approveOrg(o)}>✓ Approve</Btn>
            <Btn small ghost color={C.coral} onClick={()=>deleteOrg(o)}>✕</Btn>
          </span>
        </div>
      ))}

      {/* Approved orgs — edit / delete */}
      <div style={{ height:14 }}/>
      <SectionLabel color={C.mint}>🏛 Member organizations ({approved.length})</SectionLabel>
      {approved.map(o => editOrg?.id === o.id ? (
        <div key={o.id} style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <input style={{ ...eIn, flex:'2 1 120px' }} value={editOrg.name} onChange={e=>setEditOrg({ ...editOrg, name:e.target.value })} placeholder="Name"/>
          <input style={{ ...eIn, flex:'1 1 80px' }} value={editOrg.short_name} onChange={e=>setEditOrg({ ...editOrg, short_name:e.target.value })} placeholder="Short"/>
          <input style={{ ...eIn, flex:'2 1 120px' }} value={editOrg.focus_area} onChange={e=>setEditOrg({ ...editOrg, focus_area:e.target.value })} placeholder="Focus area"/>
          <Btn small color={C.mint} onClick={saveOrg}>Save</Btn>
          <Btn small ghost onClick={()=>setEditOrg(null)}>Cancel</Btn>
        </div>
      ) : (
        <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, minWidth:0 }}>{o.short_name || o.name}{o.focus_area ? <span style={{ color:C.mut }}> · {o.focus_area}</span> : null}</span>
          <span style={{ display:'flex', gap:6, flexShrink:0 }}>
            <Btn small ghost onClick={()=>setEditOrg({ id:o.id, name:o.name||'', short_name:o.short_name||'', focus_area:o.focus_area||'' })}>Edit</Btn>
            <Btn small ghost color={C.coral} onClick={()=>deleteOrg(o)}>🗑</Btn>
          </span>
        </div>
      ))}

      {/* Digest subscribers */}
      <div style={{ height:14 }}/>
      <SectionLabel color={C.lilac}>📧 Digest subscribers ({subs.length})</SectionLabel>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 8px', lineHeight:1.6 }}>
        {subs.map(p => p.digest_email || p.full_name).filter(Boolean).join(' · ') || 'None yet — nudge the network from the Forum.'}
      </p>

      {/* All members — edit / delete / admin toggle */}
      <SectionLabel color={C.gold}>👥 All members ({profiles.length})</SectionLabel>
      {profiles.map(p => editMember?.id === p.id ? (
        <div key={p.id} style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <input style={{ ...eIn, flex:'2 1 140px' }} value={editMember.full_name} onChange={e=>setEditMember({ ...editMember, full_name:e.target.value })} placeholder="Full name"/>
          <Btn small color={C.mint} onClick={saveMember}>Save</Btn>
          <Btn small ghost onClick={()=>setEditMember(null)}>Cancel</Btn>
        </div>
      ) : (
        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, minWidth:0 }}>
            {p.is_admin ? '👑 ' : ''}{p.full_name || '(no name)'} {p.digest_subscribed ? '📧' : ''}
            <span style={{ color:C.mut, fontSize:10.5 }}> · {timeAgo(p.created_at)}</span>
          </span>
          <span style={{ display:'flex', gap:6, flexShrink:0 }}>
            <Btn small ghost color={p.is_admin ? C.coral : C.lilac} onClick={()=>toggleAdmin(p)}>{p.is_admin ? '↓ Unadmin' : '👑 Admin'}</Btn>
            <Btn small ghost onClick={()=>setEditMember({ id:p.id, full_name:p.full_name || '' })}>Edit</Btn>
            <Btn small ghost color={C.coral} onClick={()=>deleteMember(p)}>🗑</Btn>
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Uliza desk — answer the youth PWA's anonymous questions ──────────────────
function UlizaDesk({ session, onChange }) {
  const [pending, setPending] = useState([])
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(null)
  const load = () => sb.from('uliza_questions').select('*').eq('status','pending')
    .order('created_at',{ascending:true}).limit(50).then(({data}) => { setPending(data || []); onChange?.() })
  useEffect(() => { load() }, [])

  const publish = async (q) => {
    const text = (answers[q.id] || '').trim()
    if (text.length < 20) { toast('Write a fuller answer — a young person is trusting this', 'red'); return }
    setBusy(q.id)
    const { error } = await sb.from('uliza_questions').update({
      status:'answered', answer:text,
      answered_by: (session.name || 'Verified health professional'),
      answered_at: new Date().toISOString(),
    }).eq('id', q.id)
    if (error) toast(error.message,'red')
    else { toast('✓ Published to Ukweli','green'); load() }
    setBusy(null)
  }
  const hide = async (q) => {
    await sb.from('uliza_questions').update({ status:'hidden' }).eq('id', q.id)
    toast('Hidden','gold'); load()
  }

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 12px', lineHeight:1.6 }}>
        Anonymous questions from the Ukweli youth PWA. Published answers appear there instantly,
        credited to the answering professional — never to the asker.
      </p>
      {pending.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>Queue empty — every question answered. 🎉</p>}
      {pending.map(q => (
        <div key={q.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.mint}`,
          borderRadius:12, padding:16, marginBottom:10 }}>
          <p style={{ fontFamily:C.sans, fontSize:14, fontWeight:800, color:C.txt, margin:'0 0 4px' }}>{q.question}</p>
          <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'0 0 10px' }}>asked {timeAgo(q.created_at)} · {q.language || 'en'}</p>
          <textarea style={{ ...inputStyle, minHeight:90 }} placeholder="Write the answer a trusted health worker would give…"
            value={answers[q.id] || ''} onChange={e=>setAnswers(a=>({ ...a, [q.id]: e.target.value }))}/>
          <div style={{ display:'flex', gap:8 }}>
            <Btn small onClick={()=>publish(q)} disabled={busy===q.id} color={C.mint}>
              {busy===q.id ? 'Publishing…' : '✓ Publish answer'}
            </Btn>
            <Btn small ghost onClick={()=>hide(q)}>Hide</Btn>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Hebu Fika desk — moderate youth facility reviews & suggestions ───────────
const FIKA_ATTR = {
  private:'🔒 Private', friendly:'😊 Friendly', affordable:'💰 Affordable',
  fast:'⏱️ Short wait', nonjudgmental:'🤝 Non-judgmental', stocked:'📦 Well stocked',
}
const slugify = (s) => 'f-sug-' + (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) + '-' + Math.random().toString(36).slice(2,6)

function FikaDesk({ onChange }) {
  const [facMap, setFacMap] = useState({})
  const [reviews, setReviews] = useState([])
  const [suggs, setSuggs] = useState([])
  const [busy, setBusy] = useState(null)

  const load = async () => {
    const [f, r, s] = await Promise.all([
      sb.from('fika_facilities').select('id,name,county'),
      sb.from('fika_reviews').select('*').eq('status','pending').order('created_at',{ascending:true}).limit(80),
      sb.from('fika_suggestions').select('*').eq('status','pending').order('created_at',{ascending:true}).limit(80),
    ])
    const m = {}; (f.data||[]).forEach(x => { m[x.id] = x.name }); setFacMap(m)
    setReviews(r.data || []); setSuggs(s.data || [])
    onChange?.()
  }
  useEffect(() => { load() }, [])

  const setReview = async (id, status) => {
    setBusy(id)
    const { error } = await sb.from('fika_reviews').update({ status }).eq('id', id)
    if (error) toast(error.message,'red'); else { toast(status==='published'?'✓ Published to Ukweli':'Hidden', status==='published'?'green':'gold'); load() }
    setBusy(null)
  }
  const addSuggestion = async (s) => {
    setBusy(s.id)
    const { error: e1 } = await sb.from('fika_facilities').insert({
      id: slugify(s.name), name: s.name, county: s.county, area: s.area || null,
      kind: 'ngo', services: [], verified: false, active: true,
    })
    if (e1) { toast(e1.message,'red'); setBusy(null); return }
    await sb.from('fika_suggestions').update({ status:'added' }).eq('id', s.id)
    toast('✓ Added to Hebu Fika','green'); load(); setBusy(null)
  }
  const rejectSuggestion = async (s) => {
    await sb.from('fika_suggestions').update({ status:'rejected' }).eq('id', s.id)
    toast('Rejected','gold'); load()
  }

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
        Anonymous facility reviews and suggested places from the Ukweli youth PWA. Published reviews
        appear in Hebu Fika instantly and feed each facility’s rating; added suggestions become new listings.
      </p>

      <SectionLabel color={C.mint}>⭐ Pending reviews ({reviews.length})</SectionLabel>
      {reviews.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic', marginBottom:18 }}>No reviews waiting.</p>}
      {reviews.map(r => (
        <div key={r.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.mint}`,
          borderRadius:12, padding:14, marginBottom:9 }}>
          <p style={{ fontFamily:C.sans, fontSize:13, fontWeight:800, color:C.txt, margin:'0 0 3px' }}>
            {facMap[r.facility_id] || r.facility_id}
          </p>
          <p style={{ fontFamily:C.sans, fontSize:12, color:C.gold, margin:'0 0 6px' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</p>
          {(r.attributes||[]).length > 0 && (
            <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 6px' }}>
              {r.attributes.map(a => FIKA_ATTR[a] || a).join(' · ')}
            </p>
          )}
          {r.comment && <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, lineHeight:1.6, margin:'0 0 8px' }}>“{r.comment}”</p>}
          <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'0 0 10px' }}>{timeAgo(r.created_at)} · {r.language || 'en'}</p>
          <div style={{ display:'flex', gap:8 }}>
            <Btn small onClick={()=>setReview(r.id,'published')} disabled={busy===r.id} color={C.mint}>
              {busy===r.id ? 'Working…' : '✓ Publish'}
            </Btn>
            <Btn small ghost onClick={()=>setReview(r.id,'hidden')}>Hide</Btn>
          </div>
        </div>
      ))}

      <SectionLabel color={C.gold}>📍 Suggested places ({suggs.length})</SectionLabel>
      {suggs.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>No suggestions waiting.</p>}
      {suggs.map(s => (
        <div key={s.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.gold}`,
          borderRadius:12, padding:14, marginBottom:9 }}>
          <p style={{ fontFamily:C.sans, fontSize:13.5, fontWeight:800, color:C.txt, margin:'0 0 2px' }}>{s.name}</p>
          <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 6px' }}>📍 {s.area ? s.area + ' · ' : ''}{s.county}</p>
          {s.note && <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, lineHeight:1.6, margin:'0 0 8px' }}>{s.note}</p>}
          <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'0 0 10px' }}>{timeAgo(s.created_at)} · {s.language || 'en'}</p>
          <div style={{ display:'flex', gap:8 }}>
            <Btn small onClick={()=>addSuggestion(s)} disabled={busy===s.id} color={C.mint}>
              {busy===s.id ? 'Adding…' : '＋ Add to map'}
            </Btn>
            <Btn small ghost onClick={()=>rejectSuggestion(s)}>Reject</Btn>
          </div>
          <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'8px 0 0', fontStyle:'italic' }}>
            Added as an unverified NGO listing — edit services/type in Supabase if needed.
          </p>
        </div>
      ))}
    </div>
  )
}

// ── UnaDO? desk — approve members' field-activity photos & videos ────────────
const ACT_LABEL = {
  outreach:'📣 Outreach', training:'🎓 Training', advocacy:'✊ Advocacy', service:'🏥 Service delivery',
  dialogue:'🗣 Community dialogue', campaign:'📢 Campaign', other:'✨ Other',
}

function UnadoDesk({ session, onChange }) {
  const [posts, setPosts] = useState([])
  const [signed, setSigned] = useState({})
  const [busy, setBusy] = useState(null)

  const load = async () => {
    const { data } = await sb.from('unado_posts').select('*').eq('status','pending')
      .order('created_at',{ascending:true}).limit(80)
    const list = data || []
    const paths = list.flatMap(p => (p.media||[]).map(m=>m.path)).filter(Boolean)
    const map = {}
    if (paths.length) {
      const { data: urls } = await sb.storage.from('unado').createSignedUrls(paths, 3600)
      ;(urls||[]).forEach(u => { if (u.path && u.signedUrl) map[u.path] = u.signedUrl })
    }
    setSigned(map); setPosts(list); onChange?.()
  }
  useEffect(() => { load() }, [])

  const approve = async (p) => {
    setBusy(p.id)
    const { error } = await sb.from('unado_posts').update({
      status:'approved', approved_at:new Date().toISOString(), approved_by: session?.user?.id || null,
    }).eq('id', p.id)
    if (error) toast(error.message,'red')
    else { toast('✓ Approved — now visible to members','green'); load() }
    setBusy(null)
  }
  const hide = async (p) => {
    setBusy(p.id)
    await sb.from('unado_posts').update({ status:'hidden' }).eq('id', p.id)
    toast('Hidden','gold'); load(); setBusy(null)
  }
  const del = async (p) => {
    if (!confirm('Delete this post permanently?')) return
    setBusy(p.id)
    const paths = (p.media||[]).map(m=>m.path).filter(Boolean)
    if (paths.length) { try { await sb.storage.from('unado').remove(paths) } catch {} }
    const { error } = await sb.from('unado_posts').delete().eq('id', p.id)
    if (error) toast(error.message,'red'); else { toast('Deleted','gold'); load() }
    setBusy(null)
  }

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
        Photos and videos members submitted from the field. Approved posts become visible to all
        signed-in members in the UnaDO? tab; nothing appears until you approve it.
      </p>
      <SectionLabel color={C.lilac}>📸 Pending posts ({posts.length})</SectionLabel>
      {posts.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>Queue empty — nothing waiting for review. 🎉</p>}
      {posts.map(p => (
        <div key={p.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.lilac}`,
          borderRadius:12, padding:14, marginBottom:10 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
            {(p.media||[]).map((m,i) => {
              const url = signed[m.path]
              if (!url) return null
              return m.kind === 'video'
                ? <video key={i} src={url} controls style={{ width:160, height:160, objectFit:'cover', borderRadius:8, background:'#000' }}/>
                : <img key={i} src={url} alt="" loading="lazy" style={{ width:160, height:160, objectFit:'cover', borderRadius:8 }}/>
            })}
          </div>
          {p.activity_type && (
            <span style={{ fontFamily:C.sans, fontSize:9.5, fontWeight:800, color:C.lilac,
              border:`1px solid ${C.lilac}`, borderRadius:5, padding:'1px 7px' }}>{ACT_LABEL[p.activity_type] || p.activity_type}</span>
          )}
          <p style={{ fontFamily:C.sans, fontSize:14, fontWeight:800, color:C.txt, margin:'8px 0 4px', lineHeight:1.4 }}>{p.caption}</p>
          {p.description && <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.mut, margin:'0 0 6px', lineHeight:1.6 }}>{p.description}</p>}
          <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'0 0 10px' }}>
            {p.author_name || 'A member'}{p.org_name ? ` · ${p.org_name}` : ''}{p.location ? ` · ${p.location}` : ''} · {timeAgo(p.created_at)}
          </p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <Btn small onClick={()=>approve(p)} disabled={busy===p.id} color={C.mint}>{busy===p.id ? 'Working…' : '✓ Approve'}</Btn>
            <Btn small ghost onClick={()=>hide(p)}>🚫 Hide</Btn>
            <Btn small ghost color={C.coral} onClick={()=>del(p)}>🗑 Delete</Btn>
          </div>
        </div>
      ))}
    </div>
  )
}
