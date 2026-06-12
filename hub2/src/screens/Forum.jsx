import { useState, useEffect, useRef } from 'react'
import { sb, C, GRADS, timeAgo, initialsOf, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Chip, Btn, inputStyle, BodyView } from '../lib/components'

const CATEGORIES = ['General','Programmes','Policy & Advocacy','Research & Data','Funding','Social Updates']

// Upload forum media to the existing storage bucket, return [IMAGE:url]/[VIDEO:url] markers
async function uploadMedia(files) {
  const markers = []
  for (const file of files) {
    const safe = file.name.replace(/[^\w.\-]/g, '_')
    const path = `forum/${Date.now()}_${safe}`
    const { error } = await sb.storage.from('imaarisha-resources').upload(path, file)
    if (error) { toast('Upload failed: ' + error.message, 'red'); continue }
    const url = sb.storage.from('imaarisha-resources').getPublicUrl(path).data.publicUrl
    markers.push(`[${file.type.startsWith('video') ? 'VIDEO' : 'IMAGE'}:${url}]`)
  }
  return markers.join('\n')
}

export default function Forum({ session }) {
  const { user, name, isAdmin } = session
  const [discs, setDiscs] = useState([])
  const [cat, setCat] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [composing, setComposing] = useState(false)

  const load = () => sb.from('discussions')
    .select('*, profiles(full_name), organizations(short_name)')
    .order('created_at', { ascending:false }).limit(80)
    .then(({ data }) => setDiscs(data || []))
  useEffect(() => { load() }, [])

  const filtered = cat === 'all' ? discs : discs.filter(d => d.category === cat)
  const open = discs.find(d => d.id === openId)

  if (open) return <Thread d={open} session={session} onBack={() => { setOpenId(null); load() }}/>

  return (
    <div>
      <ScreenTitle accent={C.sky} kicker="Forum · live" title="Where the collective talks"
        sub="Post anytime — text, links, images, video. The network sees it instantly."/>

      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
        <Btn onClick={() => user ? setComposing(c=>!c) : toast('Sign in to post', 'red')} small>
          {composing ? '✕ Close' : '✍️ Start a discussion'}
        </Btn>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <Chip active={cat==='all'} onClick={()=>setCat('all')}>All</Chip>
          {CATEGORIES.map(c => <Chip key={c} active={cat===c} onClick={()=>setCat(c)} color={C.sky}>{c}</Chip>)}
        </div>
      </div>

      {composing && <Composer user={user} name={name} onDone={() => { setComposing(false); load() }}/>}

      {filtered.map((d, i) => {
        const author = d.profiles?.full_name || ''
        return (
          <div key={d.id} onClick={()=>setOpenId(d.id)}
            style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12,
              padding:'14px 16px', marginBottom:8, cursor:'pointer', display:'flex', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0, background:GRADS[i % GRADS.length],
              display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.sans,
              fontSize:12, fontWeight:800, color:'#fff' }}>
              {d.category === 'Social Updates' ? '📣' : initialsOf(author)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
                <span style={{ fontFamily:C.sans, fontSize:14.5, fontWeight:800, color:C.txt }}>{d.subject}</span>
                <span style={{ fontFamily:C.sans, fontSize:9, fontWeight:800, letterSpacing:'.05em',
                  textTransform:'uppercase', color:C.sky }}>{d.category || ''}</span>
                {isAdmin && <AdminDel table="discussions" id={d.id} onDone={load}/>}
              </div>
              {d.preview && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, margin:'0 0 6px', lineHeight:1.5,
                overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{d.preview}</p>}
              <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:0 }}>
                {author && <b style={{ color:C.txt, opacity:.8 }}>{author} · </b>}
                {d.organizations?.short_name ? d.organizations.short_name + ' · ' : ''}{timeAgo(d.created_at)}
                &nbsp; 💬 {d.reply_count || 0} · 👁 {d.view_count || 0}
              </p>
            </div>
          </div>
        )
      })}
      {filtered.length === 0 && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>No discussions in this category yet — start one.</p>}
    </div>
  )
}

function AdminDel({ table, id, onDone }) {
  return (
    <button onClick={async (e) => { e.stopPropagation()
        if (!confirm('Delete this item?')) return
        const { error } = await sb.from(table).delete().eq('id', id)
        if (error) toast(error.message, 'red'); else { toast('Deleted', 'gold'); onDone() } }}
      style={{ fontFamily:C.sans, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:6,
        border:`1px solid ${C.coral}`, background:'transparent', color:C.coral, cursor:'pointer' }}>
      🗑 admin
    </button>
  )
}

function Composer({ user, name, onDone }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('General')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)

  const post = async () => {
    if (!subject.trim() || !body.trim()) { toast('Subject and body required', 'red'); return }
    setBusy(true)
    const media = files.length ? '\n' + await uploadMedia(files) : ''
    const finalBody = body.trim() + media
    const { error } = await sb.from('discussions').insert({
      subject: subject.trim(), preview: body.trim().slice(0,200), body: finalBody,
      category, author_id: user?.id || null,
    })
    if (!error) {
      logActivity('discussion_start', `${name || 'A member'} started a new ${category} discussion: "${subject.trim()}"`, subject.trim(), 'green')
      onDone()
    } else toast(error.message, 'red')
    setBusy(false)
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.gold}44`, borderRadius:12, padding:16, marginBottom:14 }}>
      <input style={inputStyle} placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)}/>
      <textarea style={{ ...inputStyle, minHeight:110, resize:'vertical', lineHeight:1.6 }}
        placeholder="What's happening? Links become clickable; attach images/video below."
        value={body} onChange={e=>setBody(e.target.value)}/>
      <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:10 }}>
        <select value={category} onChange={e=>setCategory(e.target.value)}
          style={{ ...inputStyle, width:'auto', marginBottom:0 }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <label style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, cursor:'pointer' }}>
          📎 {files.length ? `${files.length} file(s)` : 'Attach media'}
          <input type="file" accept="image/*,video/*" multiple style={{ display:'none' }}
            onChange={e=>setFiles([...e.target.files])}/>
        </label>
      </div>
      <Btn onClick={post} disabled={busy}>{busy ? 'Posting…' : '🚀 Post discussion'}</Btn>
    </div>
  )
}

// ── Thread view — live replies ────────────────────────────────────────────────
function Thread({ d, session, onBack }) {
  const { user, name, isAdmin } = session
  const [replies, setReplies] = useState([])
  const [reply, setReply] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const pollRef = useRef(null)

  const load = () => sb.from('discussion_replies')
    .select('*, profiles(full_name)').eq('discussion_id', d.id)
    .order('created_at', { ascending:true })
    .then(({ data }) => setReplies(data || []))

  useEffect(() => {
    load()
    sb.from('discussions').update({ view_count: (d.view_count || 0) + 1 }).eq('id', d.id).then(()=>{})
    // realtime if available + 20s polling so the thread feels alive either way
    let chan
    try {
      chan = sb.channel('thread-' + d.id)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'discussion_replies', filter:`discussion_id=eq.${d.id}` }, load)
        .subscribe()
    } catch {}
    pollRef.current = setInterval(load, 20000)
    return () => { clearInterval(pollRef.current); if (chan) sb.removeChannel(chan) }
  }, [d.id])

  const send = async () => {
    if (!user) { toast('Sign in to reply', 'red'); return }
    if (!reply.trim() && !files.length) return
    setBusy(true)
    const media = files.length ? '\n' + await uploadMedia(files) : ''
    const { error } = await sb.from('discussion_replies').insert({
      discussion_id: d.id, author_id: user.id, body: reply.trim() + media,
    })
    if (!error) {
      await sb.from('discussions').update({ reply_count: replies.length + 1 }).eq('id', d.id)
      logActivity('discussion_start', `${name || 'A member'} replied to "${d.subject}"`, d.subject, 'green')
      setReply(''); setFiles([]); load()
    } else toast(error.message, 'red')
    setBusy(false)
  }

  return (
    <div>
      <button onClick={onBack} style={{ fontFamily:C.sans, fontSize:12, fontWeight:800, color:C.gold,
        background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:10 }}>← All discussions</button>
      <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <h1 style={{ fontFamily:C.sans, fontSize:19, fontWeight:800, color:C.txt, margin:'0 0 4px' }}>{d.subject}</h1>
        {isAdmin && <AdminDel table="discussions" id={d.id} onDone={onBack}/>}
      </div>
      <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 14px' }}>
        {d.profiles?.full_name ? d.profiles.full_name + ' · ' : ''}{d.category} · {timeAgo(d.created_at)} · updates live
      </p>

      <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:16, marginBottom:10 }}>
        <BodyView body={d.body || d.preview}/>
      </div>

      <SectionLabel color={C.mint}>{replies.length} repl{replies.length === 1 ? 'y' : 'ies'}</SectionLabel>
      {replies.map((r, i) => (
        <div key={r.id} style={{ display:'flex', gap:10, marginBottom:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:GRADS[(i+1) % GRADS.length],
            display:'flex', alignItems:'center', justifyContent:'center', fontFamily:C.sans, fontSize:11, fontWeight:800, color:'#fff' }}>
            {initialsOf(r.profiles?.full_name)}
          </div>
          <div style={{ flex:1, background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'10px 14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8, marginBottom:4, alignItems:'center' }}>
              <span style={{ fontFamily:C.sans, fontSize:11.5, fontWeight:800, color:C.txt }}>{r.profiles?.full_name || 'Member'}</span>
              <span style={{ fontFamily:C.sans, fontSize:10, color:C.mut }}>{timeAgo(r.created_at)} {isAdmin && <AdminDel table="discussion_replies" id={r.id} onDone={load}/>}</span>
            </div>
            <BodyView body={r.body}/>
          </div>
        </div>
      ))}

      <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:14, marginTop:14 }}>
        <textarea style={{ ...inputStyle, minHeight:70 }} placeholder={user ? 'Write a reply…' : 'Sign in to join the conversation'}
          value={reply} onChange={e=>setReply(e.target.value)} disabled={!user}/>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Btn onClick={send} disabled={busy || !user} small>{busy ? 'Sending…' : 'Reply'}</Btn>
          <label style={{ fontFamily:C.sans, fontSize:11, color:C.mut, cursor:'pointer' }}>
            📎 {files.length ? `${files.length} file(s)` : 'media'}
            <input type="file" accept="image/*,video/*" multiple style={{ display:'none' }} onChange={e=>setFiles([...e.target.files])}/>
          </label>
        </div>
      </div>
    </div>
  )
}
