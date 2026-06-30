import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, Chip, Btn, inputStyle } from '../lib/components'

// ── Unado? — members share photos/videos of their SRHR field activities ──────
// Members-only viewing · admin-approved before it goes live.
const ACTIVITIES = [
  ['outreach',  '📣 Outreach'],
  ['training',  '🎓 Training'],
  ['advocacy',  '✊ Advocacy'],
  ['service',   '🏥 Service delivery'],
  ['dialogue',  '🗣 Community dialogue'],
  ['campaign',  '📢 Campaign'],
  ['other',     '✨ Other'],
]
const ACT_LABEL = Object.fromEntries(ACTIVITIES)
const MAX_MB = 75

export default function Unado({ session }) {
  const { user, name, isAdmin } = session
  const [posts, setPosts] = useState([])
  const [signed, setSigned] = useState({})
  const [composing, setComposing] = useState(false)

  const load = async () => {
    const { data } = await sb.from('unado_posts').select('*')
      .order('created_at', { ascending: false }).limit(60)
    const list = data || []
    const paths = list.flatMap(p => (p.media || []).map(m => m.path)).filter(Boolean)
    const map = {}
    if (paths.length) {
      const { data: urls } = await sb.storage.from('unado').createSignedUrls(paths, 3600)
      ;(urls || []).forEach(u => { if (u.path && u.signedUrl) map[u.path] = u.signedUrl })
    }
    setSigned(map); setPosts(list)
  }
  useEffect(() => { if (user) load() }, [user])

  // Members-only gate
  if (!user) {
    return (
      <div>
        <ScreenTitle accent={C.lilac} kicker="UnaDO?" title="From the field"
          sub="Where members show the work — photos and clips from activities across the collective."/>
        <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'28px 20px', textAlign:'center' }}>
          <p style={{ fontFamily:C.sans, fontSize:13, color:C.mut, margin:0, lineHeight:1.6 }}>
            🔒 UnaDO? is members-only. Sign in (top-right) to see what the network is doing and to share your own.
          </p>
        </div>
      </div>
    )
  }

  const moderate = async (p, status) => {
    const patch = status === 'approved'
      ? { status, approved_at: new Date().toISOString(), approved_by: user.id }
      : { status }
    const { error } = await sb.from('unado_posts').update(patch).eq('id', p.id)
    if (error) { toast(error.message, 'red'); return }
    toast(status === 'approved' ? '✓ Approved — now visible to members' : 'Hidden', 'gold')
    if (status === 'approved') logActivity('discussion_start', `📸 ${p.author_name || 'A member'}'s field activity is live: ${p.caption}`, p.caption, 'green')
    load()
  }
  const remove = async (p) => {
    if (!confirm('Delete this post?')) return
    const paths = (p.media || []).map(m => m.path).filter(Boolean)
    if (paths.length) { try { await sb.storage.from('unado').remove(paths) } catch {} }
    const { error } = await sb.from('unado_posts').delete().eq('id', p.id)
    if (error) toast(error.message, 'red'); else { toast('Deleted', 'gold'); setPosts(list => list.filter(x => x.id !== p.id)) }
  }

  return (
    <div>
      <ScreenTitle accent={C.lilac} kicker="UnaDO?" title="From the field"
        sub="Where members show the work — photos and clips from activities across the collective. Posts are reviewed by an admin before they appear."/>

      <div style={{ marginBottom:14 }}>
        <Btn small color={C.lilac} onClick={() => setComposing(c => !c)}>
          {composing ? '✕ Close' : '📸 Share an activity'}
        </Btn>
      </div>
      {composing && <Composer user={user} name={name} onDone={() => { setComposing(false); load() }}/>}

      {posts.length === 0 && (
        <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>
          Nothing here yet — be the first to share what you're doing in the field.
        </p>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:12 }}>
        {posts.map(p => (
          <PostCard key={p.id} p={p} signed={signed} mine={p.author_id === user.id}
            isAdmin={isAdmin} onModerate={moderate} onDelete={remove}/>
        ))}
      </div>
    </div>
  )
}

function PostCard({ p, signed, mine, isAdmin, onModerate, onDelete }) {
  const media = p.media || []
  const badge = p.status === 'pending' ? ['⏳ Pending review', C.gold]
    : p.status === 'hidden' ? ['🚫 Hidden', C.mut] : null
  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.lilac}`,
      borderRadius:12, padding:14, display:'flex', flexDirection:'column' }}>
      {media.map((m, i) => {
        const url = signed[m.path]
        if (!url) return null
        return m.kind === 'video'
          ? <video key={i} src={url} controls style={{ width:'100%', maxHeight:340, borderRadius:10, marginBottom:8, background:'#000' }}/>
          : <img key={i} src={url} alt="" loading="lazy" style={{ width:'100%', maxHeight:340, objectFit:'cover', borderRadius:10, marginBottom:8 }}/>
      })}

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
        {p.activity_type && (
          <span style={{ fontFamily:C.sans, fontSize:9.5, fontWeight:800, letterSpacing:'.04em',
            color:C.lilac, border:`1px solid ${C.lilac}`, borderRadius:5, padding:'1px 7px' }}>
            {ACT_LABEL[p.activity_type] || p.activity_type}
          </span>
        )}
        {badge && (
          <span style={{ fontFamily:C.sans, fontSize:9.5, fontWeight:800, color:badge[1],
            border:`1px solid ${badge[1]}`, borderRadius:5, padding:'1px 7px' }}>{badge[0]}</span>
        )}
      </div>

      <p style={{ fontFamily:C.sans, fontSize:14.5, fontWeight:800, color:C.txt, margin:'0 0 5px',
        lineHeight:1.4, overflowWrap:'anywhere', wordBreak:'break-word' }}>{p.caption}</p>
      {p.description && (
        <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.mut, margin:'0 0 8px', lineHeight:1.6,
          overflowWrap:'anywhere', wordBreak:'break-word' }}>{p.description}</p>
      )}
      <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'0 0 4px' }}>
        {p.author_name || 'A member'}{p.org_name ? ` · ${p.org_name}` : ''}{p.location ? ` · ${p.location}` : ''} · {timeAgo(p.created_at)}
      </p>

      {(isAdmin || mine) && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
          {isAdmin && p.status !== 'approved' && <Btn small color={C.mint} onClick={() => onModerate(p, 'approved')}>✓ Approve</Btn>}
          {isAdmin && p.status === 'approved' && <Btn small ghost onClick={() => onModerate(p, 'hidden')}>🚫 Hide</Btn>}
          <Btn small ghost color={C.coral} onClick={() => onDelete(p)}>🗑 Delete</Btn>
        </div>
      )}
    </div>
  )
}

function Composer({ user, name, onDone }) {
  const [caption, setCaption] = useState('')
  const [desc, setDesc] = useState('')
  const [org, setOrg] = useState('')
  const [location, setLocation] = useState('')
  const [activity, setActivity] = useState('')
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  const pick = (e) => setFiles(Array.from(e.target.files || []))

  const submit = async () => {
    if (caption.trim().length < 3) { toast('Add a short caption', 'red'); return }
    if (!files.length) { toast('Add at least one photo or video', 'red'); return }
    setBusy(true)
    const media = []
    let n = 0
    for (const f of files) {
      n++
      if (f.size > MAX_MB * 1024 * 1024) { toast(`${f.name} is over ${MAX_MB}MB — skipped`, 'red'); continue }
      setProgress(`Uploading ${n}/${files.length}…`)
      const ext = (f.name.split('.').pop() || 'bin').toLowerCase()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await sb.storage.from('unado').upload(path, f, { contentType: f.type, upsert: false })
      if (error) { toast(error.message, 'red'); continue }
      media.push({ path, kind: (f.type || '').startsWith('video') ? 'video' : 'image' })
    }
    if (!media.length) { setBusy(false); setProgress(''); return }
    const { error } = await sb.from('unado_posts').insert({
      author_id: user.id, author_name: name, org_name: org.trim() || null,
      caption: caption.trim(), description: desc.trim() || null,
      activity_type: activity || null, location: location.trim() || null,
      media, status: 'pending',
    })
    setBusy(false); setProgress('')
    if (error) { toast(error.message, 'red'); return }
    logActivity('discussion_start', `📸 ${name || 'A member'} submitted a field activity for review`, caption.slice(0, 60), 'gold')
    toast('✓ Submitted — an admin will review it shortly', 'green')
    onDone()
  }

  return (
    <div style={{ background:C.card, border:`1px solid ${C.lilac}55`, borderRadius:12, padding:14, marginBottom:14 }}>
      <input style={inputStyle} placeholder="Caption — what's happening here?" value={caption} onChange={e => setCaption(e.target.value)}/>
      <textarea style={{ ...inputStyle, minHeight:70 }} placeholder="Tell the story (optional) — what was the activity, where, who took part?"
        value={desc} onChange={e => setDesc(e.target.value)}/>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <input style={{ ...inputStyle, flex:1, minWidth:140 }} placeholder="Organisation (optional)" value={org} onChange={e => setOrg(e.target.value)}/>
        <input style={{ ...inputStyle, flex:1, minWidth:140 }} placeholder="Location / county (optional)" value={location} onChange={e => setLocation(e.target.value)}/>
      </div>

      <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:C.mut, margin:'4px 0 8px' }}>Activity type</p>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {ACTIVITIES.map(([k, l]) => (
          <Chip key={k} active={activity === k} color={C.lilac} onClick={() => setActivity(activity === k ? '' : k)}>{l}</Chip>
        ))}
      </div>

      <label style={{ display:'block', fontFamily:C.sans, fontSize:12, fontWeight:700, color:C.txt, marginBottom:8 }}>
        <span style={{ display:'inline-block', background:C.card2, border:`1px dashed ${C.line}`, borderRadius:10,
          padding:'10px 14px', cursor:'pointer' }}>📎 Choose photos / videos (up to {MAX_MB}MB each)</span>
        <input type="file" accept="image/*,video/*" multiple onChange={pick} style={{ display:'none' }}/>
      </label>
      {files.length > 0 && (
        <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 10px' }}>
          {files.length} file{files.length > 1 ? 's' : ''} selected
        </p>
      )}

      <Btn small color={C.lilac} onClick={submit} disabled={busy}>{busy ? (progress || 'Submitting…') : '📤 Submit for review'}</Btn>
    </div>
  )
}
