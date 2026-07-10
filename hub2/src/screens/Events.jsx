import { useState, useEffect } from 'react'
import { sb, C, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Btn, inputStyle } from '../lib/components'

const fmtDay   = (d) => new Date(d + 'T00:00:00').getDate()
const fmtMonth = (d) => new Date(d + 'T00:00:00').toLocaleString('en', { month:'short' }).toUpperCase()
const fmtFull  = (d) => new Date(d + 'T00:00:00').toLocaleDateString(['en-KE','en-GB'], { weekday:'short', day:'numeric', month:'long', year:'numeric' })

const EVENT_TYPES = ['Convening','Training','Webinar','Workshop','Conference','March / action','Launch','Community dialogue','Other']
const mapsUrl = (loc) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`

export default function Events({ session }) {
  const { user, name } = session
  const [events, setEvents] = useState([])
  const [myRsvps, setMyRsvps] = useState({})
  const [showPast, setShowPast] = useState(false)
  const [open, setOpen] = useState(null)     // event being viewed in detail
  const [posting, setPosting] = useState(false)

  const load = async () => {
    const { data } = await sb.from('events').select('*').eq('status','approved')
      .order('event_date', { ascending:true }).limit(80)
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
    await sb.from('event_rsvps').delete().eq('event_id', e.id).eq('user_id', user.id)
    const { error } = await sb.from('event_rsvps').insert({ event_id: e.id, user_id: user.id, status })
    if (error) { toast(error.message, 'red'); return }
    setMyRsvps(m => ({ ...m, [e.id]: status }))
    if (status === 'going') {
      const next = (e.rsvp_count || 0) + 1
      sb.from('events').update({ rsvp_count: next }).eq('id', e.id).then(()=>{})
      setEvents(list => list.map(x => x.id === e.id ? { ...x, rsvp_count: next } : x))
      if (open?.id === e.id) setOpen(o => ({ ...o, rsvp_count: next }))
      logActivity('discussion_start', `📅 ${name || 'A member'} is attending: ${e.title}`, e.title, 'green')
    }
    toast(status === 'going' ? '✓ See you there!' : 'Noted', 'green')
  }

  const RsvpRow = ({ e }) => (
    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
      <Btn small color={myRsvps[e.id] === 'going' ? C.mint : C.gold} onClick={() => rsvp(e, 'going')}>
        {myRsvps[e.id] === 'going' ? '✓ Going' : '✋ I will attend'}
      </Btn>
      <Btn small ghost onClick={() => rsvp(e, 'maybe')}>{myRsvps[e.id] === 'maybe' ? '✓ Maybe' : 'Maybe'}</Btn>
      <span style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut }}>
        {(e.rsvp_count || 0)} attending{e.capacity ? ` · cap ${e.capacity}` : ''}
      </span>
    </div>
  )

  const Card = ({ e }) => (
    <div onClick={() => setOpen(e)} role="button" tabIndex={0}
      onKeyDown={ev => { if (ev.key === 'Enter') setOpen(e) }}
      style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:16,
        marginBottom:9, display:'flex', gap:14, cursor:'pointer', transition:'border-color .15s' }}
      onMouseEnter={ev => ev.currentTarget.style.borderColor = C.mint}
      onMouseLeave={ev => ev.currentTarget.style.borderColor = C.line}>
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
        {e.description && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, margin:'0 0 8px', lineHeight:1.55 }}>{e.description.slice(0,150)}{e.description?.length > 150 ? '…' : ''}</p>}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }} onClick={ev => ev.stopPropagation()}>
          <RsvpRow e={e}/>
          <span style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, color:C.mint }}>Details →</span>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
        <div style={{ flex:1 }}>
          <ScreenTitle accent={C.mint} kicker="Events" title="Where the collective meets"
            sub="Convenings, trainings, marches, webinars — the collaboration points that build the network."/>
        </div>
        <div style={{ paddingTop:6, flexShrink:0 }}>
          <Btn small color={C.mint} onClick={() => setPosting(true)}>＋ Post event</Btn>
        </div>
      </div>

      <SectionLabel color={C.mint}>Upcoming ({upcoming.length})</SectionLabel>
      {upcoming.map(e => <Card key={e.id} e={e}/>)}
      {upcoming.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic', marginBottom:14 }}>Nothing scheduled — the calendar is open. Be the first to post one.</p>}

      {past.length > 0 && (
        <>
          <button onClick={()=>setShowPast(p=>!p)} style={{ fontFamily:C.sans, fontSize:11, fontWeight:800,
            color:C.mut, background:'none', border:'none', cursor:'pointer', padding:0, margin:'10px 0' }}>
            {showPast ? '▲ Hide past events' : `▼ ${past.length} past events`}
          </button>
          {showPast && past.map(e => <div key={e.id} style={{ opacity:.55 }}><Card e={e}/></div>)}
        </>
      )}

      {open && <EventDetail e={open} myStatus={myRsvps[open.id]} onRsvp={rsvp} onClose={() => setOpen(null)}/>}
      {posting && <PostEventModal session={session} onClose={() => setPosting(false)}/>}
    </div>
  )
}

// ── Full event detail (clicking a card opens this) ───────────────────────────
function EventDetail({ e, myStatus, onRsvp, onClose }) {
  const dates = e.end_date && e.end_date !== e.event_date
    ? `${fmtFull(e.event_date)} – ${fmtFull(e.end_date)}`
    : fmtFull(e.event_date)
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={ev => ev.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:460, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <span style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase',
            color:C.mint }}>{e.event_type || 'Event'}{e.is_virtual ? ' · 🌐 Online' : ''}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.mut, fontSize:22, cursor:'pointer', lineHeight:1, padding:0 }}>×</button>
        </div>
        <h2 style={{ fontFamily:C.serif, fontSize:24, fontWeight:700, color:C.txt, margin:'6px 0 10px', lineHeight:1.15 }}>{e.title}</h2>

        <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
          <Row icon="📅" text={dates + (e.start_time ? ` · ${e.start_time.slice(0,5)}` : '')}/>
          {!e.is_virtual && e.location && (
            <Row icon="📍" text={<a href={mapsUrl(e.location)} target="_blank" rel="noopener noreferrer"
              style={{ color:C.sky, fontWeight:700, textDecoration:'none' }}>{e.location} ↗</a>}/>
          )}
          {e.is_virtual && <Row icon="🌐" text="Online event"/>}
          {e.capacity ? <Row icon="👥" text={`${e.rsvp_count || 0} attending · capacity ${e.capacity}`}/>
                      : <Row icon="👥" text={`${e.rsvp_count || 0} attending`}/>}
          {e.submitter_name && <Row icon="✍️" text={`Posted by ${e.submitter_name}`}/>}
        </div>

        {e.description && <p style={{ fontFamily:C.sans, fontSize:13.5, color:C.txt, lineHeight:1.7, margin:'0 0 14px', whiteSpace:'pre-wrap' }}>{e.description}</p>}

        {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer"
          style={{ display:'inline-block', fontFamily:C.sans, fontSize:12, fontWeight:800, color:C.mint,
            textDecoration:'none', marginBottom:14 }}>🔗 Registration / more info ↗</a>}

        <div style={{ borderTop:`1px solid ${C.line}`, paddingTop:14, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <Btn small color={myStatus === 'going' ? C.mint : C.gold} onClick={() => onRsvp(e, 'going')}>
            {myStatus === 'going' ? '✓ Going' : '✋ I will attend'}
          </Btn>
          <Btn small ghost onClick={() => onRsvp(e, 'maybe')}>{myStatus === 'maybe' ? '✓ Maybe' : 'Maybe'}</Btn>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, text }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'baseline' }}>
      <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
      <span style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, lineHeight:1.5 }}>{text}</span>
    </div>
  )
}

// ── Member posts an event → PENDING until an admin approves ───────────────────
function PostEventModal({ session, onClose }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Convening')
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [time, setTime] = useState('')
  const [virtual, setVirtual] = useState(false)
  const [location, setLocation] = useState('')
  const [link, setLink] = useState('')
  const [capacity, setCapacity] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!title.trim()) { setMsg('Title is required.'); return }
    if (!date) { setMsg('Pick a date.'); return }
    if (endDate && endDate < date) { setMsg('End date can’t be before the start date.'); return }
    setBusy(true); setMsg('')
    const { error } = await sb.from('events').insert({
      title: title.trim(), event_type: type,
      event_date: date, end_date: endDate || null, start_time: time || null,
      is_virtual: virtual, location: virtual ? null : (location.trim() || null),
      link: link.trim() || null, capacity: capacity ? Number(capacity) : null,
      description: desc.trim() || null, rsvp_count: 0,
      status: 'pending', submitted_by: session.user?.id, submitter_name: session.name || null,
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    logActivity('discussion_start', `📅 ${session.name || 'A member'} submitted an event for review: ${title.trim()}`, title.trim(), 'gold')
    toast('✓ Submitted — an admin reviews it before it appears', 'green')
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={ev => ev.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:440, maxHeight:'90vh', overflowY:'auto' }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Post an event</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.5 }}>
          Share a convening, training, march or webinar. An admin reviews it before it appears on the calendar.
        </p>
        <input style={inputStyle} placeholder="Event title *" value={title} onChange={e=>setTitle(e.target.value)}/>
        <select style={inputStyle} value={type} onChange={e=>setType(e.target.value)}>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <div style={{ display:'flex', gap:8 }}>
          <label style={{ flex:1 }}>
            <span style={lbl}>Start date *</span>
            <input type="date" style={inputStyle} value={date} onChange={e=>setDate(e.target.value)}/>
          </label>
          <label style={{ flex:1 }}>
            <span style={lbl}>End date</span>
            <input type="date" style={inputStyle} value={endDate} onChange={e=>setEndDate(e.target.value)}/>
          </label>
          <label style={{ width:110 }}>
            <span style={lbl}>Time</span>
            <input type="time" style={inputStyle} value={time} onChange={e=>setTime(e.target.value)}/>
          </label>
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:8, fontFamily:C.sans, fontSize:12, color:C.txt, margin:'2px 0 10px', cursor:'pointer' }}>
          <input type="checkbox" checked={virtual} onChange={e=>setVirtual(e.target.checked)}/>
          🌐 This is an online event
        </label>
        {!virtual && <input style={inputStyle} placeholder="📍 Location (venue, city)" value={location} onChange={e=>setLocation(e.target.value)}/>}
        <input style={inputStyle} placeholder={virtual ? 'Join / registration link (https://…)' : 'Registration / more-info link (optional)'} value={link} onChange={e=>setLink(e.target.value)}/>
        <input style={inputStyle} type="number" min="0" placeholder="Capacity (optional)" value={capacity} onChange={e=>setCapacity(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:80 }} placeholder="What's it about? Who should come?" value={desc} onChange={e=>setDesc(e.target.value)}/>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px' }}>{msg}</p>}
        <Btn full color={C.mint} onClick={submit} disabled={busy || !title.trim() || !date}>
          {busy ? 'Submitting…' : 'Submit for review'}
        </Btn>
      </div>
    </div>
  )
}

const lbl = { display:'block', fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.08em',
  textTransform:'uppercase', color:C.mut, margin:'0 0 4px' }
