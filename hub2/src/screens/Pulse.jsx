import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { SectionLabel, Btn, inputStyle } from '../lib/components'

// Pulse — live home: index headline, weekly digest signup, activity feed.
export default function Pulse({ go, session }) {
  const { user, name, profile } = session
  const [idx, setIdx] = useState(null)
  const [activity, setActivity] = useState([])
  const [digestEmail, setDigestEmail] = useState('')
  const [digestDone, setDigestDone] = useState(false)

  useEffect(() => {
    sb.from('radar_index').select('*').order('date',{ascending:false}).limit(1).then(({data})=>setIdx(data?.[0]||null))
    sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(16).then(({data})=>setActivity(data||[]))
  }, [])
  useEffect(() => { if (profile?.digest_subscribed) setDigestDone(true) }, [profile])

  const subscribeDigest = async () => {
    if (!user) { toast('Sign in first — the digest is for members', 'red'); return }
    const email = digestEmail.trim() || user.email
    const { error } = await sb.from('profiles').update({ digest_subscribed: true, digest_email: email }).eq('id', user.id)
    if (!error) {
      setDigestDone(true)
      logActivity('resource_upload', `📧 ${name} subscribed to the weekly digest`, email, 'gold')
    } else toast(error.message, 'red')
  }

  const score = idx?.score ?? null
  const sev = score == null ? C.mut : score >= 60 ? C.coral : score >= 40 ? C.gold : C.mint
  const dotColor = { red: C.coral, green: C.mint, gold: C.gold }

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', color:C.gold, margin:0 }}>
        ImaarishaSRHR · Live
      </p>
      <h1 style={{ fontFamily:C.serif, fontSize:'clamp(30px, 4vw, 38px)', fontWeight:700, color:C.txt,
        margin:'4px 0 4px', lineHeight:1.08, letterSpacing:'-0.01em' }}>
        The Pulse
      </h1>
      <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.mut, margin:'0 0 16px', lineHeight:1.6 }}>
        {user && <span style={{ color:C.gold, fontWeight:700 }}>Karibu, {(name || '').split(' ')[0]} 👋 · </span>}
        The collective hub for Kenya's disruptive SRHR practitioners — intelligence, coordination, counter-narrative.
      </p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:10, marginBottom:16 }}>
        {/* Index card */}
        <button onClick={()=>go('radar')} style={{ textAlign:'left', cursor:'pointer',
          background:`linear-gradient(135deg, ${C.card}, ${C.card2})`, border:`1px solid ${C.line}`,
          borderLeft:`3px solid ${sev}`, borderRadius:14, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontFamily:C.serif, fontSize:54, fontWeight:700, color:sev, lineHeight:1,
              textShadow:`0 0 28px ${sev}55` }}>{score ?? '—'}</div>
            <div>
              <p style={{ fontFamily:C.sans, fontSize:12.5, fontWeight:800, color:C.txt, margin:0 }}>SRHR Narrative Index</p>
              <p style={{ fontFamily:C.sans, fontSize:11, color:C.gold, margin:'2px 0 0' }}>⦿ Open the Radar →</p>
            </div>
          </div>
        </button>

        {/* Ukweli card */}
        <div style={{ background:`linear-gradient(135deg, ${C.card}, #E9F4EA)`,
          border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.mint}`, borderRadius:14, padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <p style={{ fontFamily:C.sans, fontSize:12.5, fontWeight:800, color:C.txt, margin:0 }}>✦ UkweliSRHR — Fresh & Friendly</p>
            <span style={{ fontFamily:C.sans, fontSize:8.5, fontWeight:800, letterSpacing:'.1em',
              background:C.mint, color:'#fff', borderRadius:10, padding:'2px 8px' }}>LAUNCHING SOON</span>
          </div>
          <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'4px 0 0', lineHeight:1.5 }}>
            for young people: anonymous Q&A, myth-busters, real talk →
          </p>
        </div>
      </div>

      {/* Weekly digest */}
      {!digestDone ? (
        <div style={{ background:C.card, border:`1px solid ${C.gold}44`, borderRadius:14, padding:16, marginBottom:16 }}>
          <p style={{ fontFamily:C.serif, fontSize:17, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>
            📧 Subscribe to the <span style={{ color:C.gold }}>Weekly Digest</span>
          </p>
          <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 10px' }}>
            New discussions, resources and upcoming events — one email, every week.
          </p>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input style={{ ...inputStyle, flex:1, minWidth:200, marginBottom:0 }}
              placeholder={user?.email || 'your@email.org'} value={digestEmail} onChange={e=>setDigestEmail(e.target.value)}/>
            <Btn onClick={subscribeDigest}>Subscribe</Btn>
          </div>
        </div>
      ) : (
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mint, margin:'0 0 16px' }}>✓ Weekly digest: subscribed</p>
      )}

      {/* Live activity feed — the heartbeat */}
      <SectionLabel color={C.mint}>● Live activity</SectionLabel>
      {activity.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>Quiet for now — post something and watch this come alive.</p>}
      {activity.map((a, i) => (
        <div key={a.id || i} style={{ display:'flex', gap:10, alignItems:'flex-start',
          padding:'9px 0', borderBottom:`1px solid ${C.line}` }}>
          <span style={{ width:8, height:8, borderRadius:'50%', marginTop:5, flexShrink:0,
            background: dotColor[a.dot_color] || C.gold }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, margin:0, lineHeight:1.5 }}>{a.description}</p>
            <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'1px 0 0' }}>{timeAgo(a.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
