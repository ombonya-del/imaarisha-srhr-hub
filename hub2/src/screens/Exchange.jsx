import { useState, useEffect } from 'react'
import { sb, C, timeAgo, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, Chip, Btn } from '../lib/components'

const TYPE_ICONS = { report:'📊', toolkit:'🧰', research:'🔬', policy:'📜', guide:'📘', data:'📈', video:'🎬', link:'🔗' }

export default function Exchange({ session }) {
  const { user, name, isAdmin } = session
  const [view, setView] = useState('resources')
  const [resources, setResources] = useState([])
  const [listings, setListings] = useState([])
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    sb.from('resources').select('*').order('created_at',{ascending:false}).limit(60).then(({data})=>setResources(data||[]))
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

      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['resources','📚 Resources'],['market','⇄ Marketplace'],['directory','🏛 Directory']].map(([k,l]) => (
          <Chip key={k} active={view===k} onClick={()=>setView(k)} color={C.gold}>{l}</Chip>
        ))}
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
