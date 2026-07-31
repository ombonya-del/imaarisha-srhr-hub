import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, Chip, Btn, inputStyle } from '../lib/components'

// ── Unado? — members share photos/videos of their SRHR field activities ──────
// Members-only viewing · admin-approved before it goes live. The feed is a
// horizontal accordion: compact rows that expand in place, each with likes and
// a comment thread so the network can react to the work.
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
  const [reactions, setReactions] = useState({})   // { post_id: { count, mine } }
  const [cCounts, setCCounts] = useState({})        // { post_id: n }
  const [composing, setComposing] = useState(false)
  const [expanded, setExpanded] = useState(null)    // one open at a time (accordion)

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
    loadSocial(list.map(p => p.id))
  }

  // Like counts (+ whether I liked) and comment counts, in two light queries.
  const loadSocial = async (ids) => {
    if (!ids.length) { setReactions({}); setCCounts({}); return }
    const [{ data: rx }, { data: cm }] = await Promise.all([
      sb.from('unado_reactions').select('post_id,user_id').in('post_id', ids),
      sb.from('unado_comments').select('post_id').in('post_id', ids),
    ])
    const rmap = {}
    ;(rx || []).forEach(r => {
      rmap[r.post_id] = rmap[r.post_id] || { count: 0, mine: false }
      rmap[r.post_id].count++
      if (r.user_id === user.id) rmap[r.post_id].mine = true
    })
    const cmap = {}
    ;(cm || []).forEach(c => { cmap[c.post_id] = (cmap[c.post_id] || 0) + 1 })
    setReactions(rmap); setCCounts(cmap)
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

  const toggleLike = async (p) => {
    const cur = reactions[p.id] || { count: 0, mine: false }
    // optimistic
    setReactions(m => ({ ...m, [p.id]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine } }))
    if (cur.mine) {
      await sb.from('unado_reactions').delete().eq('post_id', p.id).eq('user_id', user.id)
    } else {
      const { error } = await sb.from('unado_reactions').insert({ post_id: p.id, user_id: user.id })
      if (error && !/duplicate/i.test(error.message)) { toast(error.message, 'red'); setReactions(m => ({ ...m, [p.id]: cur })) }
    }
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
        sub="Where members show the work — photos and clips from activities across the collective. Posts are reviewed by an admin before they appear. Tap a row to open it, then like or comment."/>

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

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {posts.map(p => (
          <PostRow key={p.id} p={p} signed={signed} user={user} name={name}
            mine={p.author_id === user.id} isAdmin={isAdmin}
            open={expanded === p.id} onToggle={() => setExpanded(x => x === p.id ? null : p.id)}
            react={reactions[p.id] || { count: 0, mine: false }} onLike={() => toggleLike(p)}
            commentCount={cCounts[p.id] || 0} onCommentCount={(n)=>setCCounts(m=>({ ...m, [p.id]: n }))}
            onModerate={moderate} onDelete={remove}/>
        ))}
      </div>
    </div>
  )
}

// ── One accordion row: compact header always shown; body expands in place ────
function PostRow({ p, signed, user, name, mine, isAdmin, open, onToggle, react, onLike, commentCount, onCommentCount, onModerate, onDelete }) {
  const media = p.media || []
  const thumb = media.map(m => signed[m.path]).find(Boolean)
  const firstIsVideo = media[0]?.kind === 'video'
  const badge = p.status === 'pending' ? ['⏳ Pending', C.gold]
    : p.status === 'hidden' ? ['🚫 Hidden', C.mut] : null

  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.lilac}`, borderRadius:12, overflow:'hidden' }}>
      {/* Header — horizontal, click to expand */}
      <button onClick={onToggle} style={{ width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer',
        display:'flex', alignItems:'center', gap:12, padding:10 }}>
        <div style={{ width:56, height:56, borderRadius:9, flexShrink:0, background:C.card2, overflow:'hidden',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
          {thumb && !firstIsVideo ? <img src={thumb} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : thumb && firstIsVideo ? <span>🎬</span> : <span>📸</span>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:2 }}>
            {p.activity_type && (
              <span style={{ fontFamily:C.sans, fontSize:9, fontWeight:800, color:C.lilac, border:`1px solid ${C.lilac}`, borderRadius:5, padding:'0 6px' }}>
                {ACT_LABEL[p.activity_type] || p.activity_type}
              </span>
            )}
            {badge && <span style={{ fontFamily:C.sans, fontSize:9, fontWeight:800, color:badge[1], border:`1px solid ${badge[1]}`, borderRadius:5, padding:'0 6px' }}>{badge[0]}</span>}
          </div>
          <p style={{ fontFamily:C.sans, fontSize:13.5, fontWeight:800, color:C.txt, margin:0, lineHeight:1.35,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.caption}</p>
          <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'1px 0 0' }}>
            {p.author_name || 'A member'}{p.location ? ` · ${p.location}` : ''} · {timeAgo(p.created_at)}
          </p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
          <span style={{ fontFamily:C.sans, fontSize:11, color:C.mut }}>{react.mine ? '❤️' : '🤍'} {react.count} · 💬 {commentCount}</span>
          <span style={{ fontFamily:C.sans, fontSize:15, color:C.lilac }}>{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:`1px solid ${C.line}` }}>
          {media.map((m, i) => {
            const url = signed[m.path]
            if (!url) return null
            return m.kind === 'video'
              ? <video key={i} src={url} controls style={{ width:'100%', maxHeight:420, borderRadius:10, margin:'12px 0 0', background:'#000' }}/>
              : <img key={i} src={url} alt="" loading="lazy" style={{ width:'100%', maxHeight:460, objectFit:'cover', borderRadius:10, margin:'12px 0 0' }}/>
          })}

          <p style={{ fontFamily:C.sans, fontSize:15, fontWeight:800, color:C.txt, margin:'12px 0 4px', lineHeight:1.4, overflowWrap:'anywhere' }}>{p.caption}</p>
          {p.description && <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.mut, margin:'0 0 6px', lineHeight:1.6, overflowWrap:'anywhere' }}>{p.description}</p>}
          <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'0 0 10px' }}>
            {p.author_name || 'A member'}{p.org_name ? ` · ${p.org_name}` : ''}{p.location ? ` · ${p.location}` : ''} · {timeAgo(p.created_at)}
          </p>

          {/* Like + moderation row */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', paddingTop:4, borderTop:`1px solid ${C.line}` }}>
            <button onClick={onLike} style={{ fontFamily:C.sans, fontSize:12.5, fontWeight:800, cursor:'pointer',
              background: react.mine ? `${C.lilac}18` : 'none', color: react.mine ? C.lilac : C.mut,
              border:`1px solid ${react.mine ? C.lilac : C.line}`, borderRadius:20, padding:'6px 13px', marginTop:8 }}>
              {react.mine ? '❤️ Liked' : '🤍 Like'}{react.count ? ` · ${react.count}` : ''}
            </button>
            {isAdmin && p.status !== 'approved' && <Btn small color={C.mint} onClick={() => onModerate(p, 'approved')}>✓ Approve</Btn>}
            {isAdmin && p.status === 'approved' && <Btn small ghost onClick={() => onModerate(p, 'hidden')}>🚫 Hide</Btn>}
            {(isAdmin || mine) && <Btn small ghost color={C.coral} onClick={() => onDelete(p)}>🗑 Delete</Btn>}
          </div>

          <Comments post={p} user={user} name={name} isAdmin={isAdmin} onCount={onCommentCount}/>
        </div>
      )}
    </div>
  )
}

// ── Comment thread — loads on expand, add inline ───────────────────────────
function Comments({ post, user, name, isAdmin, onCount }) {
  const [list, setList] = useState(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await sb.from('unado_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true })
    setList(data || []); onCount && onCount((data || []).length)
  }
  useEffect(() => { load() }, [post.id])

  const add = async () => {
    const text = body.trim()
    if (text.length < 1) return
    setBusy(true)
    const { error } = await sb.from('unado_comments').insert({ post_id: post.id, author_id: user.id, author_name: name || 'A member', body: text })
    setBusy(false)
    if (error) { toast(error.message, 'red'); return }
    setBody(''); load()
  }
  const del = async (c) => {
    if (!confirm('Delete this comment?')) return
    const { error } = await sb.from('unado_comments').delete().eq('id', c.id)
    if (error) toast(error.message, 'red'); else load()
  }

  return (
    <div style={{ marginTop:12 }}>
      <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:C.mut, margin:'0 0 8px' }}>
        💬 Comments{list ? ` (${list.length})` : ''}
      </p>
      {list && list.map(c => (
        <div key={c.id} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'6px 0', borderBottom:`1px solid ${C.line}` }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, margin:0, lineHeight:1.5, overflowWrap:'anywhere' }}>{c.body}</p>
            <p style={{ fontFamily:C.sans, fontSize:9.5, color:C.mut, margin:'1px 0 0' }}>{c.author_name || 'A member'} · {timeAgo(c.created_at)}</p>
          </div>
          {(isAdmin || c.author_id === user.id) && (
            <button onClick={() => del(c)} title="Delete" style={{ background:'none', border:'none', cursor:'pointer', color:C.mut, fontSize:12, padding:0 }}>✕</button>
          )}
        </div>
      ))}
      {list && list.length === 0 && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, fontStyle:'italic', margin:'0 0 8px' }}>No comments yet — say something kind.</p>}
      <div style={{ display:'flex', gap:8, marginTop:8 }}>
        <input style={{ ...inputStyle, flex:1, marginBottom:0 }} placeholder="Add a comment…" value={body}
          onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}/>
        <Btn small color={C.lilac} onClick={add} disabled={busy || !body.trim()}>{busy ? '…' : 'Post'}</Btn>
      </div>
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
