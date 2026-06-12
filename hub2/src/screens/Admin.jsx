import { useState, useEffect } from 'react'
import { sb, C, timeAgo, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Chip, Btn, inputStyle } from '../lib/components'

// ── 👑 Admin — visible only to profiles.is_admin (enforced by RLS server-side) ─
export default function Admin({ session }) {
  const [view, setView] = useState('activity')
  return (
    <div>
      <ScreenTitle accent={C.lilac} kicker="👑 Admin · members never see this" title="The control room"
        sub="Activity, usage metrics, members & digest, and the Uliza answer desk."/>
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['activity','● Activity'],['metrics','📊 Metrics'],['members','👥 Members'],['uliza','💬 Uliza desk']].map(([k,l]) => (
          <Chip key={k} active={view===k} onClick={()=>setView(k)} color={C.gold}>{l}</Chip>
        ))}
      </div>
      {view === 'activity' && <Activity/>}
      {view === 'metrics'  && <Metrics/>}
      {view === 'members'  && <Members/>}
      {view === 'uliza'    && <UlizaDesk session={session}/>}
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
  useEffect(() => {
    sb.from('profiles').select('*').order('created_at',{ascending:false}).limit(200)
      .then(({data}) => setProfiles(data || []))
  }, [])
  const subs = profiles.filter(p => p.digest_subscribed)
  return (
    <div>
      <SectionLabel color={C.lilac}>📧 Digest subscribers ({subs.length})</SectionLabel>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 8px', lineHeight:1.6 }}>
        {subs.map(p => p.digest_email || p.full_name).filter(Boolean).join(' · ') || 'None yet — nudge the network from the Forum.'}
      </p>
      <SectionLabel color={C.gold}>👥 All members ({profiles.length})</SectionLabel>
      {profiles.map(p => (
        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt }}>
            {p.is_admin ? '👑 ' : ''}{p.full_name || '(no name)'} {p.digest_subscribed ? '📧' : ''}
          </span>
          <span style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut }}>{timeAgo(p.created_at)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Uliza desk — answer the youth PWA's anonymous questions ──────────────────
function UlizaDesk({ session }) {
  const [pending, setPending] = useState([])
  const [answers, setAnswers] = useState({})
  const [busy, setBusy] = useState(null)
  const load = () => sb.from('uliza_questions').select('*').eq('status','pending')
    .order('created_at',{ascending:true}).limit(50).then(({data}) => setPending(data || []))
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
