import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, Chip, Btn, inputStyle } from '../lib/components'

const TYPE_ICONS = { report:'📊', toolkit:'🧰', research:'🔬', policy:'📜', guide:'📘', data:'📈', video:'🎬', link:'🔗' }
const RES_TYPES = ['report','toolkit','research','policy','guide','data','video','link']
const OPP_KINDS = { funding:'💰 Funding', consultancy:'🧑‍💼 Consultancy', conference:'🎤 Conference', scholarship:'🎓 Scholarship', fellowship:'🏅 Fellowship', job:'💼 Job', other:'✨ Other' }
// links may lack a scheme ("example.com") — make them openable URLs
const withHttp = (u) => !u ? '' : (/^https?:\/\//i.test(u) ? u : 'https://' + String(u).replace(/^\/+/, ''))

export default function Exchange({ session }) {
  const { user, name, isAdmin } = session
  const [view, setView] = useState('resources')
  const [resources, setResources] = useState([])
  const [listings, setListings] = useState([])
  const [orgs, setOrgs] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [myReq, setMyReq] = useState({})      // resource_id -> status (pending|approved|denied)
  const [reqFor, setReqFor] = useState(null)  // the resource being requested
  const [opps, setOpps] = useState([])
  const [oppOpen, setOppOpen] = useState(false)

  const loadMyReq = () => {
    if (!user) return
    sb.from('resource_requests').select('resource_id,status').eq('requester_id', user.id).then(({data}) => {
      const m = {}; (data||[]).forEach(x => { if (m[x.resource_id] !== 'approved') m[x.resource_id] = x.status }); setMyReq(m)
    })
  }
  useEffect(() => {
    sb.from('resources').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(60).then(({data})=>setResources(data||[]))
    sb.from('marketplace_listings').select('*, organizations(short_name)').order('created_at',{ascending:false}).limit(40).then(({data})=>setListings(data||[]))
    sb.from('organizations').select('*').eq('approved', true).order('short_name').limit(200).then(({data})=>setOrgs(data||[]))
    sb.from('opportunities').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(60).then(({data})=>setOpps(data||[]))
  }, [])
  useEffect(() => { loadMyReq() }, [user])

  // Every open + share is logged to activity_log → quantifiable from the admin portal
  const trackOpen = (r) => logActivity('resource_upload', `📂 ${name || 'A visitor'} opened resource: ${r.title}`, r.title, 'gold')
  const share = async (r) => {
    // A stored file is private (members-only) — never hand out the file itself,
    // only a link to the hub, which requires a vetted account to open.
    if (r.file_path) {
      logActivity('resource_upload', `🔗 ${name || 'A visitor'} shared the hub link for: ${r.title}`, r.title, 'gold')
      const url = window.location.origin
      try {
        if (navigator.share) await navigator.share({ title: r.title, text: `“${r.title}” — on the ImaarishaSRHR hub`, url })
        else await navigator.clipboard.writeText(url)
      } catch {}
      toast('🔒 Members-only file — shared the hub link, not the file', 'gold')
      return
    }
    const url = r.file_url || window.location.href
    logActivity('resource_upload', `🔗 ${name || 'A visitor'} shared resource: ${r.title}`, r.title, 'gold')
    if (navigator.share) { try { await navigator.share({ title: r.title, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast('✓ Link copied — paste anywhere', 'green') } catch {} }
  }
  const openRequest = (r) => { if (!user) { toast('Sign in to request access', 'red'); return } setReqFor(r) }
  // Private files. PDFs are pulled through the edge function so each copy is
  // personally watermarked; other file types get a 60-second signed URL.
  const downloadStored = async (r) => {
    const isPdf = (r.file_type || '').toUpperCase() === 'PDF' || (r.file_path || '').toLowerCase().endsWith('.pdf')
    if (isPdf) {
      toast('Preparing your watermarked copy…', 'gold')
      const { data, error } = await sb.functions.invoke('resource-download', { body: { resource_id: r.id } })
      if (error) { toast('Could not prepare the file' + (error.message ? ': ' + error.message : ''), 'red'); return }
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = objUrl
      a.download = (r.title || 'resource').replace(/[^a-z0-9._ -]/gi, '_').slice(0, 80) + '.pdf'
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(objUrl), 15000)
      return
    }
    const { data, error } = await sb.storage.from('resources').createSignedUrl(r.file_path, 60, { download: true })
    if (error || !data?.signedUrl) { toast('Could not prepare this file. If it is restricted, you may need admin approval first.', 'red'); return }
    const a = document.createElement('a'); a.href = data.signedUrl; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove()
  }
  const btnStyle = { fontFamily:C.sans, fontSize:11, fontWeight:800, padding:'7px 14px', borderRadius:10,
    background:C.gold, color:'#171204', textDecoration:'none', border:'none', cursor:'pointer' }
  const DL = (r) => r.file_path
    ? <button onClick={()=>{ trackOpen(r); downloadStored(r) }} style={btnStyle}>🔒 Download</button>
    : <a href={r.file_url} target="_blank" rel="noopener noreferrer" onClick={()=>trackOpen(r)} style={btnStyle}>
        {r.file_url && r.file_url.startsWith('http') && !r.file_url.includes('supabase') ? '🔗 Open' : '⬇ Download'}
      </a>

  return (
    <div>
      <ScreenTitle kicker="Exchange" title="Resources, offers & the network"
        sub="Open it, share it, build with it. Every open and share is counted — evidence of a living commons."/>

      {addOpen && <AddResourceModal session={session} onClose={()=>setAddOpen(false)}/>}
      {reqFor && <RequestAccessModal session={session} resource={reqFor} isAdmin={isAdmin} onClose={()=>setReqFor(null)} onDone={loadMyReq}
        onGranted={(res)=>{ trackOpen(res); res.file_path ? downloadStored(res) : window.open(res.file_url, '_blank', 'noopener,noreferrer') }}/>}
      {oppOpen && <PostOpportunityModal session={session} onClose={()=>setOppOpen(false)}/>}

      <div style={{ display:'flex', gap:6, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[['resources','📚 Resources'],['opps','🎯 Opportunities'],['market','⇄ Marketplace'],['directory','🏛 Directory']].map(([k,l]) => (
          <Chip key={k} active={view===k} onClick={()=>setView(k)} color={C.gold}>{l}</Chip>
        ))}
        {view === 'resources' && user && (
          <button onClick={()=>setAddOpen(true)}
            style={{ marginLeft:'auto', fontFamily:C.sans, fontSize:11.5, fontWeight:800, padding:'7px 14px',
              borderRadius:16, border:'none', background:C.mint, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>
            ＋ Add resource
          </button>
        )}
        {view === 'opps' && user && (
          <button onClick={()=>setOppOpen(true)}
            style={{ marginLeft:'auto', fontFamily:C.sans, fontSize:11.5, fontWeight:800, padding:'7px 14px',
              borderRadius:16, border:'none', background:C.lilac, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>
            ＋ Post opportunity
          </button>
        )}
      </div>

      {view === 'resources' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:10 }}>
          {resources.map(r => (
            <div key={r.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:16,
              display:'flex', flexDirection:'column' }}>
              <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.08em',
                textTransform:'uppercase', color:C.sky, margin:'0 0 6px' }}>
                {(TYPE_ICONS[r.type] || '📄')} {r.type || 'document'}{r.is_restricted ? ' · 🔐 restricted' : ''}
              </p>
              <p style={{ fontFamily:C.sans, fontSize:14, fontWeight:800, color:C.txt, margin:'0 0 6px', lineHeight:1.4 }}>{r.title}</p>
              {r.description && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, margin:'0 0 10px', lineHeight:1.55, flex:1 }}>{r.description}</p>}
              <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'0 0 10px' }}>
                {r.source_org || ''}{r.file_type ? ` · ${r.file_type}` : ''}{r.file_size ? ` · ${r.file_size}` : ''} · {timeAgo(r.created_at)}
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {(r.file_url || r.file_path) && (
                  myReq[r.id] === 'approved' ? DL(r)
                  : (r.is_restricted && !isAdmin) ? (
                      myReq[r.id] === 'pending' ? <Btn small ghost disabled>⏳ Request pending</Btn>
                      : myReq[r.id] === 'denied' ? <Btn small ghost color={C.coral} onClick={()=>openRequest(r)}>Denied · ask again</Btn>
                      : <Btn small color={C.coral} onClick={()=>openRequest(r)}>🔐 Request access</Btn>
                    )
                  : <Btn small onClick={()=>openRequest(r)}>⬇ Download</Btn>
                )}
                <Btn small ghost onClick={()=>share(r)}>↗ Share</Btn>
                {isAdmin && <Btn small ghost color={C.coral} onClick={async()=>{
                  if (!confirm('Delete resource?')) return
                  const { error } = await sb.from('resources').delete().eq('id', r.id)
                  if (error) toast(error.message,'red'); else { toast('Deleted','gold'); setResources(list=>list.filter(x=>x.id!==r.id)) }
                }}>🗑</Btn>}
              </div>
            </div>
          ))}
          {resources.length === 0 && <Empty/>}
        </div>
      )}

      {view === 'opps' && (opps.length ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {opps.map(o => {
            const days = o.deadline ? Math.ceil((new Date(o.deadline) - Date.now()) / 86400000) : null
            const closed = days !== null && days < 0
            return (
              <div key={o.id}
                onClick={() => o.link && window.open(withHttp(o.link), '_blank', 'noopener,noreferrer')}
                role={o.link ? 'button' : undefined} tabIndex={o.link ? 0 : undefined}
                onKeyDown={ev => { if (o.link && ev.key === 'Enter') window.open(withHttp(o.link), '_blank', 'noopener,noreferrer') }}
                style={{ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${C.lilac}`, borderRadius:12, padding:16,
                  cursor: o.link ? 'pointer' : 'default', transition:'border-color .15s' }}
                onMouseEnter={ev => { if (o.link) ev.currentTarget.style.borderColor = C.lilac }}
                onMouseLeave={ev => { ev.currentTarget.style.borderColor = C.line }}>
                <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:C.lilac, margin:'0 0 5px' }}>
                  {OPP_KINDS[o.kind] || '✨ Opportunity'}
                </p>
                <p style={{ fontFamily:C.sans, fontSize:15, fontWeight:800, color:C.txt, margin:'0 0 5px', lineHeight:1.35 }}>{o.title}</p>
                {o.org && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 6px' }}>{o.org}</p>}
                {o.description && <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.txt, lineHeight:1.6, margin:'0 0 8px' }}>{o.description}</p>}
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  {o.deadline && <span style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, color: (closed || days<=7) ? C.coral : C.mint }}>
                    {closed ? '⛔ Closed' : (days === 0 ? '⏳ Closes today' : `⏳ ${days} days left`)} · {new Date(o.deadline).toLocaleDateString()}
                  </span>}
                  {o.link && <a href={withHttp(o.link)} target="_blank" rel="noopener noreferrer" onClick={ev => ev.stopPropagation()}
                    style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, padding:'6px 13px', borderRadius:10, background:C.lilac, color:'#fff', textDecoration:'none' }}>Apply / details ↗</a>}
                  {isAdmin && <Btn small ghost color={C.coral} onClick={async(ev)=>{ ev.stopPropagation(); if(!confirm('Delete opportunity?'))return; const {error}=await sb.from('opportunities').delete().eq('id',o.id); if(error)toast(error.message,'red'); else{toast('Deleted','gold'); setOpps(l=>l.filter(x=>x.id!==o.id))} }}>🗑</Btn>}
                </div>
              </div>
            )
          })}
        </div>
      ) : <Empty/>)}

      {view === 'market' && (listings.length ? listings.map(l => (
        <div key={l.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:14, marginBottom:8 }}>
          <p style={{ fontFamily:C.sans, fontSize:14, fontWeight:800, color:C.txt, margin:'0 0 4px' }}>{l.icon || '📦'} {l.title}</p>
          <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:0 }}>
            {l.organizations?.short_name || 'Organization'} · {l.price_type === 'free' ? '🟢 Free' : (l.price || 'Exchange')}
          </p>
        </div>
      )) : <Empty/>)}

      {view === 'directory' && (orgs.length ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10 }}>
          {orgs.map(o => (
            <div key={o.id} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:14 }}>
              <p style={{ fontFamily:C.sans, fontSize:9, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase', color:C.mint, margin:'0 0 4px' }}>{o.focus_area || 'SRHR'}</p>
              <p style={{ fontFamily:C.sans, fontSize:14, fontWeight:800, color:C.txt, margin:'0 0 4px' }}>{o.short_name || o.name}</p>
              {o.description && <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:0, lineHeight:1.5 }}>{o.description.slice(0,90)}…</p>}
            </div>
          ))}
        </div>
      ) : <Empty/>)}
    </div>
  )
}
const Empty = () => <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>Nothing here yet.</p>

// ── Add resource: file upload OR link; stays pending until an admin approves ──
function AddResourceModal({ session, onClose }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('report')
  const [desc, setDesc] = useState('')
  const [org, setOrg] = useState('')
  const [mode, setMode] = useState('file')   // 'file' | 'link'
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [restricted, setRestricted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const humanSize = (b) => b < 1048576 ? Math.max(1, Math.round(b/1024)) + ' KB' : (b/1048576).toFixed(1) + ' MB'

  const submit = async () => {
    if (!title.trim()) { setMsg('Title is required.'); return }
    setBusy(true); setMsg('')
    let file_url = url.trim() || null, file_path = null, file_type = null, file_size = null
    if (mode === 'file') {
      if (!file) { setMsg('Choose a file to upload.'); setBusy(false); return }
      if (file.size > 50 * 1048576) { setMsg('File is over 50 MB — please share a link instead.'); setBusy(false); return }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${session.user?.id || 'anon'}/${Date.now()}-${safe}`
      const { error: upErr } = await sb.storage.from('resources').upload(path, file, { upsert: false })
      if (upErr) { setMsg('Upload failed: ' + upErr.message); setBusy(false); return }
      // private bucket: store the storage key, not a public URL (downloads go
      // through a short-lived signed URL so the file can't be shared out)
      file_path = path
      file_url  = null
      file_type = (file.name.split('.').pop() || '').toUpperCase()
      file_size = humanSize(file.size)
    } else if (!file_url) {
      setMsg('Add a link, or switch to Upload file.'); setBusy(false); return
    }
    const { error } = await sb.from('resources').insert({
      title: title.trim(), type, description: desc.trim() || null,
      source_org: org.trim() || null, file_url, file_path, file_type, file_size,
      is_restricted: restricted, status: 'pending', submitted_by: session.user?.id, submitter_name: session.name || null,
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    logActivity('resource_upload', `📤 ${session.name || 'A member'} submitted a resource for review: ${title.trim()}`, title.trim(), 'gold')
    toast('✓ Submitted — an admin reviews it before it goes live', 'green')
    onClose()
  }

  const tabBtn = (k, l) => (
    <button onClick={()=>{ setMode(k); setMsg('') }}
      style={{ flex:1, fontFamily:C.sans, fontSize:11, fontWeight:800, padding:'8px 0', borderRadius:8,
        border:'none', cursor:'pointer', background: mode===k?C.gold:C.card, color: mode===k?'#171204':C.mut }}>{l}</button>
  )

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto' }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Add a resource</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.5 }}>
          Upload a file or share a link. An admin reviews it before it appears publicly.
        </p>
        <input style={inputStyle} placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)}/>
        <select style={inputStyle} value={type} onChange={e=>setType(e.target.value)}>
          {RES_TYPES.map(t => <option key={t} value={t}>{(TYPE_ICONS[t]||'📄')} {t}</option>)}
        </select>

        <div style={{ display:'flex', gap:6, margin:'2px 0 10px' }}>
          {tabBtn('file','⬆ Upload file')}
          {tabBtn('link','🔗 Paste link')}
        </div>
        {mode === 'file' ? (
          <div style={{ marginBottom:10 }}>
            <input type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt"
              onChange={e=>setFile(e.target.files?.[0] || null)}
              style={{ fontFamily:C.sans, fontSize:12, color:C.txt, width:'100%' }}/>
            {file && <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'6px 0 0' }}>{file.name} · {humanSize(file.size)}</p>}
            <p style={{ fontFamily:C.sans, fontSize:10, color:C.mut, margin:'6px 0 0', lineHeight:1.4 }}>Images, video, PDF, Word, PowerPoint, Excel, CSV · up to 50 MB.</p>
          </div>
        ) : (
          <input style={inputStyle} placeholder="Link (https://…)" value={url} onChange={e=>setUrl(e.target.value)}/>
        )}

        <input style={inputStyle} placeholder="Source organization" value={org} onChange={e=>setOrg(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:70 }} placeholder="Short description" value={desc} onChange={e=>setDesc(e.target.value)}/>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontFamily:C.sans, fontSize:12, color:C.txt, margin:'2px 0 12px', cursor:'pointer' }}>
          <input type="checkbox" checked={restricted} onChange={e=>setRestricted(e.target.checked)}/>
          🔐 Restricted — members must request access before downloading
        </label>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px' }}>{msg}</p>}
        <Btn full onClick={submit} disabled={busy || !title.trim() || (mode==='file' ? !file : !url.trim())}>
          {busy ? (mode==='file' ? 'Uploading…' : 'Submitting…') : 'Submit for review'}
        </Btn>
      </div>
    </div>
  )
}

// ── Download gate: capture who/why/what-for before any resource opens ─────────
// A normal resource logs the intent and downloads immediately (status 'approved');
// a 🔐 restricted resource stays 'pending' until an admin approves.
function RequestAccessModal({ session, resource, onClose, onDone, onGranted, isAdmin }) {
  const restricted = !!resource.is_restricted && !isAdmin  // admins log intent but skip the approval wait
  const [reqName, setReqName] = useState(session.name || '')
  const [org, setOrg] = useState('')
  const [reason, setReason] = useState('')
  const [use, setUse] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!reqName.trim() || !org.trim() || !reason.trim() || !use.trim()) { setMsg('Please fill in all four fields.'); return }
    setBusy(true); setMsg('')
    const { error } = await sb.from('resource_requests').insert({
      resource_id: String(resource.id), resource_title: resource.title,
      requester_id: session.user?.id, requester_name: reqName.trim(),
      org: org.trim(), reason: reason.trim(), intended_use: use.trim(),
      status: restricted ? 'pending' : 'approved',
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    if (restricted) {
      logActivity('resource_upload', `\u{1F510} ${reqName.trim()} (${org.trim()}) requested access to "${resource.title}"`, resource.title, 'red')
      toast('✓ Request sent — an admin will review it', 'green')
    } else {
      logActivity('resource_upload', `\u{1F4C2} ${reqName.trim()} (${org.trim()}) downloaded "${resource.title}" — ${use.trim()}`, resource.title, 'gold')
      onGranted && onGranted(resource)
      toast('✓ Thanks — your download is starting', 'green')
    }
    onDone && onDone(); onClose()
  }

  const ok = reqName.trim() && org.trim() && reason.trim() && use.trim()
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:400, maxHeight:'90vh', overflowY:'auto' }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>
          {restricted ? 'Request access' : 'Before you download'}
        </p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.5 }}>
          {restricted
            ? `“${resource.title}” is restricted. Tell us who you are and how you'll use it — an admin approves before you can download.`
            : `Tell us who you are and how you'll use “${resource.title}”. This keeps the commons trusted; your download starts right after.`}
        </p>
        <input style={inputStyle} placeholder="Your name *" value={reqName} onChange={e=>setReqName(e.target.value)}/>
        <input style={inputStyle} placeholder="Your organization (or ‘Independent’) *" value={org} onChange={e=>setOrg(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:64 }} placeholder="Why do you want this resource? *" value={reason} onChange={e=>setReason(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:64 }} placeholder="What will you use it for? *" value={use} onChange={e=>setUse(e.target.value)}/>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px' }}>{msg}</p>}
        <Btn full onClick={submit} disabled={busy || !ok}>
          {busy ? (restricted ? 'Sending…' : 'Preparing…') : (restricted ? 'Send request' : '⬇ Get the download')}
        </Btn>
      </div>
    </div>
  )
}

// ── Post an opportunity: member submits; admin approves before it appears ─────
function PostOpportunityModal({ session, onClose }) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('funding')
  const [org, setOrg] = useState('')
  const [desc, setDesc] = useState('')
  const [deadline, setDeadline] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!title.trim()) { setMsg('Title is required.'); return }
    setBusy(true); setMsg('')
    const { error } = await sb.from('opportunities').insert({
      title: title.trim(), kind, org: org.trim() || null, description: desc.trim() || null,
      deadline: deadline || null, link: link.trim() || null,
      status: 'pending', submitted_by: session.user?.id, submitter_name: session.name || null,
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    logActivity('resource_upload', `\u{1F3AF} ${session.name || 'A member'} posted an opportunity: ${title.trim()}`, title.trim(), 'gold')
    toast('✓ Submitted — an admin reviews it before it appears', 'green')
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto' }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Post an opportunity</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.5 }}>
          Share a funding call, consultancy, conference or scholarship. An admin reviews it before it appears.
        </p>
        <input style={inputStyle} placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)}/>
        <select style={inputStyle} value={kind} onChange={e=>setKind(e.target.value)}>
          {Object.entries(OPP_KINDS).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input style={inputStyle} placeholder="Organization / funder" value={org} onChange={e=>setOrg(e.target.value)}/>
        <input style={inputStyle} placeholder="Link to apply / details" value={link} onChange={e=>setLink(e.target.value)}/>
        <label style={{ display:'block', fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 4px' }}>Deadline (optional)</label>
        <input style={inputStyle} type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:70 }} placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)}/>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px' }}>{msg}</p>}
        <Btn full onClick={submit} disabled={busy || !title.trim()}>{busy ? 'Submitting…' : 'Submit for review'}</Btn>
      </div>
    </div>
  )
}
