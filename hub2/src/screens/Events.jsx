import { useState, useEffect } from 'react'
import { sb, C, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Btn } from '../lib/components'

const fmtDay   = (d) => new Date(d + 'T00:00:00').getDate()
const fmtMonth = (d) => new Date(d + 'T00:00:00').toLocaleString('en', { month:'short' }).toUpperCase()
const fmtFull  = (d) => new Date(d + 'T00:00:00').toLocaleDateString(['en-KE','en-GB'], { weekday:'short', day:'numeric', month:'long', year:'numeric' })

export default function Events({ session }) {
  const { user, name } = session
  const [events, setEvents] = useState([])
  const [myRsvps, setMyRsvps] = useState({})
  const [showPast, setShowPast] = useState(false)

  const load = async () => {
    const { data } = await sb.from('events').select('*').order('event_date', { ascending:true }).limit(80)
    setEvents(data || [])
    if (user) {
      const { data: r } = await sb.from('event_rsvps').select('event_id,status').eq('user_id', user.id)
      const map = {}; (r || []).forEach(x => map[x.event_id] = x.status); setMyRsvps(map)
    }
  }
  useEffect(() => { load() }, [user])

  const today = new Date().toISOString().split('T')[0]
  const upcoming = events.filter(e => (e.end_date || e.event_date) >= today)
  const past = events.filter(e => (e.end_date || e.event_date) < today).reverse()

  const rsvp = async (e, status) => {
    if (!user) { toast('Sign in to RSVP', 'red'); return }
    // delete-then-insert: works regardless of table constraints
    await sb.from('event_rsvps').delete().eq('event_id', e.id).eq('user_id', user.id)
    const { error } = await sb.from('event_rsvps').insert({ event_id: e.id, user_id: user.id, status })
    if (error) { toast(error.message, 'red'); return }
    setMyRsvps(m => ({ ...m, [e.id]: status }))
    if (status === 'going') {
      sb.from('events').update({ rsvp_count: (e.rsvp_count || 0) + 1 }).eq('id', e.id).then(()=>{})
      logActivity('discussion_start', `📅 ${name || 'A member'} is attending: ${e.title}`, e.title, 'green')
    }
    toast(status === 'going' ? '✓ See you there!' : 'Noted', 'green')
  }

  const Card = ({ e }) => (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:16,
      marginBottom:9, display:'flex', gap:14 }}>
      <div style={{ flexShrink:0, width:54, textAlign:'center', background:C.card2, borderRadius:10, padding:'8px 0', height:'fit-content' }}>
        <div style={{ fontFamily:C.serif, fontSize:24, fontWeight:700, color:C.gold, lineHeight:1 }}>{fmtDay(e.event_date)}</div>
        <div style={{ fontFamily:C.sans, fontSize:9.5, fontWeight:800, letterSpacing:'.1em', color:C.mut }}>{fmtMonth(e.event_date)}</div>
        {e.end_date && e.end_date !== e.event_date &&
          <div style={{ fontFamily:C.sans, fontSize:8.5, color:C.gold, marginTop:2 }}>–{fmtDay(e.end_date)} {fmtMonth(e.end_date)}</div>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontFamily:C.sans, fontSize:14.5, fontWeight:800, color:C.txt, margin:'0 0 4px', lineHeight:1.4 }}>{e.title}</p>
        <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 6px' }}>
          {fmtFull(e.event_date)}{e.start_time ? ` · ${e.start_time.slice(0,5)}` : ''}
          {e.is_virtual ? ' · 🌐 Online' : e.location ? ` · 📍 ${e.location}` : ''}
          {e.event_type ? ` · ${e.event_type}` : ''}
        </p>
        {e.description && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, margin:'0 0 8px', lineHeight:1.55 }}>{e.description.slice(0,180)}{e.description?.length > 180 ? '…' : ''}</p>}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <Btn small color={myRsvps[e.id] === 'going' ? C.mint : C.gold} onClick={() => rsvp(e, 'going')}>
            {myRsvps[e.id] === 'going' ? '✓ Going' : '✋ I will attend'}
          </Btn>
          <Btn small ghost onClick={() => rsvp(e, 'maybe')}>{myRsvps[e.id] === 'maybe' ? '✓ Maybe' : 'Maybe'}</Btn>
          <span style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut }}>
            {(e.rsvp_count || 0)} attending{e.capacity ? ` · cap ${e.capacity}` : ''}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <ScreenTitle accent={C.mint} kicker="Events" title="Where the collective meets"
        sub="Convenings, trainings, marches, webinars — the collaboration points that build the network."/>
      <SectionLabel color={C.mint}>Upcoming ({upcoming.length})</SectionLabel>
      {upcoming.map(e => <Card key={e.id} e={e}/>)}
      {upcoming.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic', marginBottom:14 }}>Nothing scheduled — the calendar is open.</p>}

      {past.length > 0 && (
        <>
          <button onClick={()=>setShowPast(p=>!p)} style={{ fontFamily:C.sans, fontSize:11, fontWeight:800,
            color:C.mut, background:'none', border:'none', cursor:'pointer', padding:0, margin:'10px 0' }}>
            {showPast ? '▲ Hide past events' : `▼ ${past.length} past events`}
          </button>
          {showPast && past.map(e => <div key={e.id} style={{ opacity:.55 }}><Card e={e}/></div>)}
        </>
      )}
    </div>
  )
}
