import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, Chip, Btn, inputStyle } from '../lib/components'

const TYPE_ICONS = { report:'📊', toolkit:'🧰', research:'🔬', policy:'📜', guide:'📘', data:'📈', video:'🎬', link:'🔗' }
const RES_TYPES = ['report','toolkit','research','policy','guide','data','video','link']

export default function Exchange({ session }) {
  const { user, name, isAdmin } = session
  const [view, setView] = useState('resources')
  const [resources, setResources] = useState([])
  const [listings, setListings] = useState([])
  const [orgs, setOrgs] = useState([])
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    sb.from('resources').select('*').eq('status','approved').order('created_at',{ascending:false}).limit(60).then(({data})=>setResources(data||[]))
    sb.from('marketplace_listings').select('*, organizations(short_name)').order('created_at',{ascending:false}).limit(40).then(({data})=>setListings(data||[]))
    sb.from('organizations').select('*').eq('approved', true).order('short_name').limit(200).then(({data})=>setOrgs(data||[]))
  }, [])

  // Every open + share is logged to activity_log → quantifiable from the admin portal
  const trackOpen = (r) => logActivity('resource_upload', `📂 ${name || 'A visitor'} opened resource: ${r.title}`, r.title, 'gold')
  const share = async (r) => {
    const url = r.file_url || window.location.href
    logActivity('resource_upload', `🔗 ${name || 'A visitor'} shared resource: ${r.title}`, r.title, 'gold')
    if (navigator.share) { try { await navigator.share({ title: r.title, url }) } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast('✓ Link copied — paste anywhere', 'green') } catch {} }
  }
  const requestAccess = async (r) => {
    if (!user) { toast('Sign in to request access', 'red'); return }
    await logActivity('resource_upload', `🔐 Access request: ${name} requested access to "${r.title}"`, r.title, 'red')
    toast('✓ Request sent — the admin will be in touch', 'green')
  }

  return (
    <div>
      <ScreenTitle kicker="Exchange" title="Resources, offers & the network"
        sub="Open it, share it, build with it. Every open and share is counted — evidence of a living commons."/>

      {addOpen && <AddResourceModal session={session} onClose={()=>setAddOpen(false)}/>}

      <div style={{ display:'flex', gap:6, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[['resources','📚 Resources'],['market','⇄ Marketplace'],['directory','🏛 Directory']].map(([k,l]) => (
          <Chip key={k} active={view===k} onClick={()=>setView(k)} color={C.gold}>{l}</Chip>
        ))}
        {view === 'resources' && user && (
          <button onClick={()=>setAddOpen(true)}
            style={{ marginLeft:'auto', fontFamily:C.sans, fontSize:11.5, fontWeight:800, padding:'7px 14px',
              borderRadius:16, border:'none', background:C.mint, color:'#fff', cursor:'pointer', whiteSpace:'nowrap' }}>
            ＋ Add resource
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
                {r.is_restricted
                  ? <Btn small color={C.coral} onClick={()=>requestAccess(r)}>🔐 Request access</Btn>
                  : r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" onClick={()=>trackOpen(r)}
                      style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, padding:'7px 14px', borderRadius:10,
                        background:C.gold, color:'#171204', textDecoration:'none' }}>
                      {r.file_url.startsWith('http') && !r.file_url.includes('supabase') ? '🔗 Open' : '⬇ Download'}
                    </a>}
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

// ── Add resource: any member submits; it stays pending until an admin approves ─
function AddResourceModal({ session, onClose }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('report')
  const [desc, setDesc] = useState('')
  const [org, setOrg] = useState('')
  const [url, setUrl] = useState('')
  const [restricted, setRestricted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!title.trim() || !url.trim()) { setMsg('Title and a link are required.'); return }
    setBusy(true); setMsg('')
    const { error } = await sb.from('resources').insert({
      title: title.trim(), type, description: desc.trim() || null,
      source_org: org.trim() || null, file_url: url.trim(), is_restricted: restricted,
      status: 'pending', submitted_by: session.user?.id, submitter_name: session.name || null,
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    logActivity('resource_upload', `📤 ${session.name || 'A member'} submitted a resource for review: ${title.trim()}`, title.trim(), 'gold')
    toast('✓ Submitted — an admin reviews it before it goes live', 'green')
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto' }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Add a resource</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.5 }}>
          Share a report, toolkit, dataset or link with the collective. An admin reviews it before it appears publicly.
        </p>
        <input style={inputStyle} placeholder="Title *" value={title} onChange={e=>setTitle(e.target.value)}/>
        <select style={inputStyle} value={type} onChange={e=>setType(e.target.value)}>
          {RES_TYPES.map(t => <option key={t} value={t}>{(TYPE_ICONS[t]||'📄')} {t}</option>)}
        </select>
        <input style={inputStyle} placeholder="Link (https://…) *" value={url} onChange={e=>setUrl(e.target.value)}/>
        <input style={inputStyle} placeholder="Source organization" value={org} onChange={e=>setOrg(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:70 }} placeholder="Short description" value={desc} onChange={e=>setDesc(e.target.value)}/>
        <label style={{ display:'flex', alignItems:'center', gap:8, fontFamily:C.sans, fontSize:12, color:C.txt, margin:'2px 0 12px', cursor:'pointer' }}>
          <input type="checkbox" checked={restricted} onChange={e=>setRestricted(e.target.checked)}/>
          🔐 Restricted — members must request access before downloading
        </label>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px' }}>{msg}</p>}
        <Btn full onClick={submit} disabled={busy || !title.trim() || !url.trim()}>{busy ? 'Submitting…' : 'Submit for review'}</Btn>
      </div>
    </div>
  )
}
