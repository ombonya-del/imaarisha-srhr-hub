import { useState, useEffect } from 'react'
import { sb, C, timeAgo, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Chip, Btn, inputStyle } from '../lib/components'

// ── 👑 Admin — visible only to profiles.is_admin (enforced by RLS server-side) ─
export default function Admin({ session }) {
  const [view, setView] = useState('activity')
  const [counts, setCounts] = useState({ uliza: 0, fika: 0, unado: 0, resources: 0 })

  const loadCounts = async () => {
    const head = (t, s) => sb.from(t).select('id', { count: 'exact', head: true }).eq('status', s)
    const [u, r, g, n, res, opp, ev] = await Promise.all([
      head('uliza_questions', 'pending'),
      head('fika_reviews', 'pending'),
      head('fika_suggestions', 'pending'),
      head('unado_posts', 'pending'),
      head('resources', 'pending'),
      head('opportunities', 'pending'),
      head('events', 'pending'),
    ])
    setCounts({ uliza: u.count || 0, fika: (r.count || 0) + (g.count || 0), unado: n.count || 0,
      resources: (res.count || 0) + (opp.count || 0) + (ev.count || 0) })
  }
  useEffect(() => { loadCounts() }, [view])

  return (
    <div>
      <ScreenTitle accent={C.lilac} kicker="👑 Admin · members never see this" title="The control room"
        sub="Activity, usage metrics, members, the Uliza answer desk, and Hebu Fika moderation."/>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['activity','● Activity'],['metrics','📊 Metrics'],['members','👥 Members'],
          ['resources','📚 Submissions',counts.resources],['notify','📣 Broadcast'],
          ['uliza','💬 Uliza desk',counts.uliza],['fika','📍 Hebu Fika',counts.fika],
          ['unado','📸 UnaDO?',counts.unado]].map(([k,l,n]) => (
          <Chip key={k} active={view===k} onClick={()=>setView(k)} color={C.gold}>
            {l}{n > 0 && <Badge n={n}/>}
          </Chip>
        ))}
      </div>
      {view === 'activity'  && <Activity/>}
      {view === 'metrics'   && <Metrics/>}
      {view === 'members'   && <Members/>}
      {view === 'resources' && <ResourceDesk onChange={loadCounts}/>}
      {view === 'notify'    && <Broadcast/>}
      {view === 'uliza'     && <UlizaDesk session={session} onChange={loadCounts}/>}
      {view === 'fika'      && <FikaDesk onChange={loadCounts}/>}
      {view === 'unado'     && <UnadoDesk session={session} onChange={loadCounts}/>}
    </div>
  )
}

// Small pending-count badge for the desk chips
function Badge({ n }) {
  return <span style={{ marginLeft:6, fontFamily:C.sans, fontSize:9.5, fontWeight:800, color:'#fff',
    background:C.coral, borderRadius:9, padding:'1px 6px', lineHeight:1.5 }}>{n}</span>
}

// ── 📣 Broadcast a push notification to members who opted in ──────────────────
function Broadcast() {
  const [title, setTitle] = useState('📣 ImaarishaSRHR')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!body.trim()) { toast('Write a short message first.', 'red'); return }
    if (!confirm('Send this notification to every member who has notifications on?')) return
    setBusy(true)
    const { data, error } = await sb.functions.invoke('send-push', {
      body: { title: title.trim() || 'ImaarishaSRHR', body: body.trim(), url: '/#pulse', group: 'hub_members' },
    })
    setBusy(false)
    if (error) { toast(error.message, 'red'); return }
    toast(`✓ Sent to ${data?.sent ?? 0} device(s)`, 'green'); setBody('')
  }
  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
        Send a push notification to members who turned on 🔔 notifications. New events already notify automatically —
        use this for Pulse announcements, alerts or reminders. Keep it short; it lands on their lock screen.
      </p>
      <input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" maxLength={60}/>
      <textarea style={{ ...inputStyle, minHeight:90 }} value={body} onChange={e=>setBody(e.target.value)}
        placeholder="Message — e.g. “New disinformation alert on the Radar. Tap to review.”" maxLength={180}/>
      <Btn color={C.lilac} onClick={send} disabled={busy || !body.trim()}>{busy ? 'Sending…' : '📣 Send to members'}</Btn>
    </div>
  )
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

  const [invites, setInvites] = useState([])
  const loadProfiles = () => sb.from('profiles').select('*').order('created_at',{ascending:false}).limit(300).then(({data}) => setProfiles(data || []))
  const loadOrgs = () => sb.from('organizations').select('*').order('short_name').then(({data}) => setOrgs(data || []))
  const loadInvites = () => sb.from('member_invites').select('*').eq('status','pending').order('created_at',{ascending:false}).then(({data}) => setInvites(data || []))
  useEffect(() => { loadProfiles(); loadOrgs(); loadInvites() }, [])

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
  const dismissInvite = async (iv) => {
    const { error } = await sb.from('member_invites').update({ status: 'declined' }).eq('id', iv.id)
    if (error) toast(error.message,'red'); else { toast('Recommendation dismissed','gold'); loadInvites() }
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

      {/* Member recommendations put forward by existing members */}
      <SectionLabel color={C.lilac}>🤝 Member recommendations ({invites.length})</SectionLabel>
      {invites.length === 0 ? (
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
          None yet. Members put people forward with the ＋ Invite button; they appear here for context when you review the request.
        </p>
      ) : invites.map(iv => (
        <div key={iv.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:`1px solid ${C.line}` }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontFamily:C.sans, fontSize:13, fontWeight:800, color:C.txt, margin:0 }}>
              {iv.invitee_name || iv.email}{iv.org ? <span style={{ color:C.mut, fontWeight:400 }}> · {iv.org}</span> : null}
            </p>
            <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'1px 0 0' }}>
              {iv.email} · by {iv.recommender_name || 'a member'} · {timeAgo(iv.created_at)}
            </p>
            {iv.note && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'3px 0 0', lineHeight:1.5, fontStyle:'italic' }}>“{iv.note}”</p>}
          </div>
          <Btn small ghost color={C.coral} onClick={()=>dismissInvite(iv)}>✕</Btn>
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

// ── Resource submissions desk — approve members' resource uploads ────────────
function ResourceDesk({ onChange }) {
  const [pending, setPending] = useState([])
  const [reqs, setReqs] = useState([])
  const [opps, setOpps] = useState([])
  const [showHiddenOpps, setShowHiddenOpps] = useState(false)
  const [evs, setEvs] = useState([])
  const [unhosted, setUnhosted] = useState([])
  const [busy, setBusy] = useState(null)
  const [openSec, setOpenSec] = useState('resources')   // accordion: one section open at a time
  const load = () => {
    sb.from('resources').select('*').eq('status','pending').order('created_at',{ascending:true})
      .then(({data}) => { setPending(data || []); onChange?.() })
    sb.from('resource_requests').select('*').eq('status','pending').order('created_at',{ascending:true})
      .then(({data}) => setReqs(data || []))
    sb.from('opportunities').select('*').eq('status','pending').order('created_at',{ascending:true})
      .then(({data}) => setOpps(data || []))
    sb.from('events').select('*').eq('status','pending').order('event_date',{ascending:true})
      .then(({data}) => setEvs(data || []))
    // Approved document resources still stored as external links (not hosted as
    // watermarked files) — usually because the source site blocks auto-download.
    sb.from('resources').select('id,title,type,file_url,source_org')
      .eq('status','approved').is('file_path',null).not('file_url','is',null)
      .in('type',['report','policy','research','guide','toolkit','data']).order('title')
      .then(({data}) => setUnhosted(data || []))
  }
  useEffect(() => { load() }, [])
  const decideEvent = async (e, approve) => {
    setBusy(e.id)
    if (approve) {
      const { error } = await sb.from('events').update({ status:'approved' }).eq('id', e.id)
      if (error) toast(error.message,'red')
      else {
        toast('✓ Published to the Events calendar','green'); load(); onChange?.()
        // notify members who opted in (fire-and-forget; ignore if push not set up)
        sb.functions.invoke('send-push', { body: { title:'📅 New event', body: e.title, url:'/#event/'+e.id, tag:'event-'+e.id, group:'hub_members' } }).catch(()=>{})
      }
    } else {
      if (!confirm(`Reject "${e.title}"?`)) { setBusy(null); return }
      const { error } = await sb.from('events').delete().eq('id', e.id)
      if (error) toast(error.message,'red'); else { toast('Rejected','gold'); load(); onChange?.() }
    }
    setBusy(null)
  }
  const decideOpp = async (o, approve) => {
    setBusy(o.id)
    if (approve) {
      const { error } = await sb.from('opportunities').update({ status:'approved' }).eq('id', o.id)
      if (error) toast(error.message,'red'); else { toast('✓ Published to the Opportunity Desk','green'); load() }
    } else {
      if (!confirm(`Reject "${o.title}"?`)) { setBusy(null); return }
      const { error } = await sb.from('opportunities').delete().eq('id', o.id)
      if (error) toast(error.message,'red'); else { toast('Rejected','gold'); load() }
    }
    setBusy(null)
  }
  const decideReq = async (rq, status) => {
    setBusy(rq.id)
    const { error } = await sb.from('resource_requests').update({ status, decided_at: new Date().toISOString() }).eq('id', rq.id)
    if (error) toast(error.message,'red'); else { toast(status==='approved'?'✓ Access granted':'Denied', status==='approved'?'green':'gold'); load() }
    setBusy(null)
  }
  const approve = async (r) => {
    setBusy(r.id)
    const { error } = await sb.from('resources').update({ status:'approved' }).eq('id', r.id)
    if (error) toast(error.message,'red')
    else {
      toast('✓ Published to the Exchange','green'); load()
      // Auto-host document links as private, watermarked files (fire-and-forget;
      // skips videos/web pages that have no PDF). No manual conversion needed.
      if (r.file_url && !r.file_path) sb.functions.invoke('ingest-resource', { body:{ resource_id: r.id } }).catch(()=>{})
    }
    setBusy(null)
  }
  const reject = async (r) => {
    if (!confirm(`Reject "${r.title}"? This deletes the submission.`)) return
    setBusy(r.id)
    const { error } = await sb.from('resources').delete().eq('id', r.id)
    if (error) toast(error.message,'red'); else { toast('Rejected','gold'); load() }
    setBusy(null)
  }
  // ── Opportunity queue triage: hide off-region / expired / off-topic pending
  //    submissions so only the relevant ones (Kenya + current + SRHR) need review.
  const OPP_KENYA = ['kenya','kenyan','east africa','eastern africa','nairobi','mombasa','kisumu','nakuru','eldoret']
  const OPP_OTHER = ['nigeria','ghana','south africa','southern africa','west africa','central africa','north africa','egypt','ethiopia','uganda','tanzania','rwanda','burundi','south sudan','somalia','sudan','zimbabwe','zambia','malawi','mozambique','angola','cameroon','senegal','mali','niger','morocco','tunisia','algeria','gambia','liberia','sierra leone','guinea','ivory coast','cote d','togo','benin','burkina','chad','congo','drc','gabon','madagascar','namibia','botswana','lesotho','eswatini','swaziland','mauritius','seychelles','djibouti','eritrea','comoros','cape verde','mauritania','india','pakistan','bangladesh','nepal','sri lanka','philippines','indonesia','vietnam','cambodia','myanmar','thailand','china','laos','mongolia','kazakhstan','uzbekistan','kyrgyz','tajikistan','brazil','mexico','colombia','peru','argentina','bolivia','ecuador','venezuela','guatemala','honduras','haiti','jamaica','trinidad','dominican','ukraine','moldova','georgia','armenia','azerbaijan','belarus','serbia','kosovo','albania','bosnia','croatia','romania','bulgaria','turkey','turkiye','syria','yemen','iraq','iran','afghanistan','palestine','lebanon','jordan','oman','kuwait','bahrain','qatar','saudi','uae','emirates','canada','australia','united states','usa','united kingdom','new zealand','japan','singapore','south korea','ireland','germany','france','italy','spain','netherlands','sweden','norway','switzerland','fiji','papua','timor','asia','europe','european','caribbean','pacific','latin america','mena','middle east','south asia','southeast asia','balkans','sahel']
  const OPP_TLD = /\.(gm|ng|za|gh|ug|tz|rw|et|zm|zw|mw|mz|ao|cm|sn|ml|ne|ma|tn|dz|lr|sl|gn|ci|tg|bj|bf|td|cg|cd|ga|mg|na|bw|ls|sz|mu|sc|dj|er|km|cv|mr|in|pk|bd|np|ph|id|vn|au|ca|us|uk|nz|jp|sg)\b/
  const OPP_SIGNAL = ['call for','grant','fund','fellowship','scholarship','apply','proposal','award','opportunit','vacancy','consultanc','deadline','inviting','nominations open','expression of interest','request for','submissions open','open for applications','cash prize']
  const OPP_JUNK = /\btop \d+|\b\d+ best|\bbest \d+|\b\d+ (grant|funding|fellowship|opportunit)|roundup|list of|^how to |how to (get|access|apply|find|win|secure)/
  const OPP_CORE = ['reproductive','sexual health','srhr','family planning','contracept','maternal','abortion','hiv','hpv','adolescent','teen pregnancy','teenage pregnancy','gender-based violence','gender based violence','gbv','femicide','sexual violence','sexual assault','rape','harassment','gender equality','gender justice','women','girls','fgm','female genital','child marriage','patriarch','masculinit','disinformation','online violence','reproductive rights','bodily autonomy','youth','fellowship','scholarship']
  const oppRelevant = (o) => {
    const s = `${o.title||''} ${o.org||''} ${o.description||''}`.toLowerCase()
    // Geo: Kenya/East-Africa explicit wins; a specific OTHER country/region excludes;
    // global / pan-African / no-geography keeps. (Bare "africa" is NOT a keeper — it
    // was matching "south/west/southern africa".)
    const geoOK = OPP_KENYA.some(k=>s.includes(k)) ? true : (!OPP_OTHER.some(k=>s.includes(k)) && !OPP_TLD.test(s))
    // Stale: a past year (2010-2024) in the text with no 2025-2029 present => old cohort.
    const stale = /\b20(1\d|2[0-4])\b/.test(s) && !/\b202[5-9]\b/.test(s)
    const current = (!o.deadline || new Date(o.deadline).getTime() >= Date.now() - 2*86400000) && !stale
    const onTopic = OPP_CORE.some(k=>s.includes(k))
    // Must read as a real opportunity (grant/fellowship/call…), not a news article or listicle.
    const isOpp = OPP_SIGNAL.some(k=>s.includes(k)) && !OPP_JUNK.test(s)
    return geoOK && current && onTopic && isOpp
  }
  const oppsRelevant = opps.filter(oppRelevant)
  const oppsHidden   = opps.filter(o => !oppRelevant(o))
  const bulkRejectHiddenOpps = async () => {
    if (!oppsHidden.length) return
    if (!confirm(`Reject ${oppsHidden.length} off-region / expired / off-topic submission(s)? This clears them from the queue.`)) return
    setBusy('bulk')
    const { error } = await sb.from('opportunities').delete().in('id', oppsHidden.map(o=>o.id))
    if (error) toast(error.message,'red'); else { toast(`Cleared ${oppsHidden.length} irrelevant`,'gold'); load() }
    setBusy(null)
  }

  const total = pending.length + reqs.length + oppsRelevant.length + evs.length
  const secProps = { openSec, setOpenSec }

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.6 }}>
        Everything members submit — resources, opportunities and events — lands here first. Nothing goes live until you approve it.
        {total === 0 ? ' Every queue is clear right now. 🎉' : ` ${total} item${total===1?'':'s'} waiting — tap a section to review.`}
      </p>

      <Section id="resources" color={C.sky} icon="📚" label="Resource submissions" count={pending.length} {...secProps}>
        {pending.map(r => (
          <div key={r.id} style={cardS(C.sky)}>
            <p style={ttlS}>{r.title}{r.is_restricted ? ' · 🔐' : ''}</p>
            <p style={metaS}>{r.type || 'document'} · {r.source_org || '—'} · by {r.submitter_name || 'a member'} · {timeAgo(r.created_at)}</p>
            {r.description && <p style={descS}>{r.description}</p>}
            {r.file_path
              ? <button onClick={async()=>{ const {data,error}=await sb.storage.from('resources').createSignedUrl(r.file_path,60); if(error||!data?.signedUrl){toast('Could not open file','red');return} window.open(data.signedUrl,'_blank','noopener') }}
                  style={{ ...linkS(C.sky), background:'none', border:'none', cursor:'pointer', padding:0 }}>Preview file ↗</button>
              : r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={linkS(C.sky)}>Preview link ↗</a>}
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <Btn small color={C.mint} onClick={()=>approve(r)} disabled={busy===r.id}>{busy===r.id ? '…' : '✓ Approve'}</Btn>
              <Btn small ghost color={C.coral} onClick={()=>reject(r)} disabled={busy===r.id}>✕ Reject</Btn>
            </div>
          </div>
        ))}
      </Section>

      <Section id="reqs" color={C.coral} icon="🔐" label="Download access requests" count={reqs.length} {...secProps}>
        {reqs.map(rq => (
          <div key={rq.id} style={cardS(C.coral)}>
            <p style={ttlS}>{rq.resource_title || 'Resource'}</p>
            <p style={metaS}>{rq.requester_name || 'A member'}{rq.org ? ` · ${rq.org}` : ''} · {timeAgo(rq.created_at)}</p>
            {rq.reason && <p style={descS}>“{rq.reason}”</p>}
            <div style={{ display:'flex', gap:8 }}>
              <Btn small color={C.mint} onClick={()=>decideReq(rq,'approved')} disabled={busy===rq.id}>{busy===rq.id ? '…' : '✓ Grant access'}</Btn>
              <Btn small ghost color={C.coral} onClick={()=>decideReq(rq,'denied')} disabled={busy===rq.id}>✕ Deny</Btn>
            </div>
          </div>
        ))}
      </Section>

      <Section id="opps" color={C.lilac} icon="🎯" label="Opportunity submissions" count={oppsRelevant.length} {...secProps}>
        {oppsHidden.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:12, padding:'8px 12px', background:'#f6f0fa', borderRadius:8 }}>
            <span style={{ fontFamily:C.sans, fontSize:12, color:C.mut }}>{oppsHidden.length} hidden - off-region / expired / off-topic</span>
            <Btn small ghost color={C.coral} onClick={bulkRejectHiddenOpps} disabled={busy==='bulk'}>{busy==='bulk' ? '...' : 'Reject all ' + oppsHidden.length}</Btn>
            <Btn small ghost color={C.lilac} onClick={()=>setShowHiddenOpps(v=>!v)}>{showHiddenOpps ? 'Hide them' : 'Show them'}</Btn>
          </div>
        )}
        {(showHiddenOpps ? opps : oppsRelevant).map(o => (
          <div key={o.id} style={cardS(C.lilac)}>
            <p style={ttlS}>{o.title}</p>
            <p style={metaS}>{o.kind || 'opportunity'}{o.org ? ` · ${o.org}` : ''}{o.deadline ? ` · deadline ${o.deadline}` : ''} · by {o.submitter_name || 'a member'}</p>
            {o.description && <p style={descS}>{o.description}</p>}
            {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" style={linkS(C.lilac)}>Preview link ↗</a>}
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <Btn small color={C.mint} onClick={()=>decideOpp(o,true)} disabled={busy===o.id}>{busy===o.id ? '…' : '✓ Approve'}</Btn>
              <Btn small ghost color={C.coral} onClick={()=>decideOpp(o,false)} disabled={busy===o.id}>✕ Reject</Btn>
            </div>
          </div>
        ))}
      </Section>

      <Section id="evs" color={C.mint} icon="📅" label="Event submissions" count={evs.length} {...secProps}>
        {evs.map(e => (
          <div key={e.id} style={cardS(C.mint)}>
            <p style={ttlS}>{e.title}</p>
            <p style={metaS}>
              {e.event_type || 'Event'} · {e.event_date}{e.end_date && e.end_date !== e.event_date ? `–${e.end_date}` : ''}
              {e.start_time ? ` · ${String(e.start_time).slice(0,5)}` : ''}
              {e.is_virtual ? ' · 🌐 Online' : e.location ? ` · 📍 ${e.location}` : ''} · by {e.submitter_name || 'a member'}
            </p>
            {e.description && <p style={descS}>{e.description}</p>}
            {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" style={linkS(C.mint)}>Registration link ↗</a>}
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <Btn small color={C.mint} onClick={()=>decideEvent(e,true)} disabled={busy===e.id}>{busy===e.id ? '…' : '✓ Approve'}</Btn>
              <Btn small ghost color={C.coral} onClick={()=>decideEvent(e,false)} disabled={busy===e.id}>✕ Reject</Btn>
            </div>
          </div>
        ))}
      </Section>

      <Section id="unhosted" color={C.gold} icon="📥" label="Documents needing manual upload" count={unhosted.length} {...secProps}>
        <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 10px', lineHeight:1.5 }}>
          These are document links the hub couldn’t auto-host as watermarked files — usually because the source site blocks automated downloads (e.g. IPPF, some govt/NGO portals).
          To fix: open the source, download the PDF, then re-add it via <strong>＋ Add resource → Upload file</strong> and delete the old link. (Try the ✏️ Edit → 📥 Host button first — cooperative sites will just work.)
        </p>
        {unhosted.map(r => (
          <div key={r.id} style={cardS(C.gold)}>
            <p style={ttlS}>{r.title}</p>
            <p style={metaS}>{r.type || 'document'}{r.source_org ? ` · ${r.source_org}` : ''}</p>
            {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={linkS(C.gold)}>Open source ↗</a>}
          </div>
        ))}
      </Section>
    </div>
  )
}

// Collapsible queue section for the submissions desk (one open at a time)
function Section({ id, color, icon, label, count, children, openSec, setOpenSec }) {
  const open = openSec === id
  return (
    <div style={{ border:`1px solid ${C.line}`, borderRadius:12, marginBottom:10, overflow:'hidden' }}>
      <button onClick={() => setOpenSec(open ? null : id)}
        aria-expanded={open}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:10, textAlign:'left', cursor:'pointer',
          background: open ? C.card2 : C.card, border:'none', borderLeft:`3px solid ${color}`, padding:'13px 14px' }}>
        <span style={{ fontSize:15, flexShrink:0 }}>{icon}</span>
        <span style={{ fontFamily:C.sans, fontSize:13, fontWeight:800, color:C.txt, flex:1 }}>{label}</span>
        <span style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, color:'#fff', borderRadius:20,
          padding:'1px 9px', background: count > 0 ? color : C.line, minWidth:18, textAlign:'center' }}>{count}</span>
        <span style={{ color:C.mut, fontSize:11, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .15s' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding:'12px 14px 4px' }}>
          {count === 0
            ? <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic', margin:'0 0 10px' }}>Nothing waiting here.</p>
            : children}
        </div>
      )}
    </div>
  )
}

// shared card styles for the desk
const cardS = (c) => ({ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${c}`, borderRadius:12, padding:14, marginBottom:10 })
const ttlS  = { fontFamily:C.sans, fontSize:13.5, fontWeight:800, color:C.txt, margin:'0 0 2px' }
const metaS = { fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'0 0 6px' }
const descS = { fontFamily:C.sans, fontSize:12.5, color:C.txt, lineHeight:1.55, margin:'0 0 8px' }
const linkS = (c) => ({ fontFamily:C.sans, fontSize:11.5, fontWeight:800, color:c, textDecoration:'none' })
