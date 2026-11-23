import { useState, useEffect, useMemo } from 'react'
import { sb, C, toast, timeAgo } from './supabase'
import { SectionLabel, Chip, Btn, inputStyle } from './components'

// ── 📢 Digital campaign — admin desks ─────────────────────────────────────────
// Library (master assets + cut-downs, review & release), Voices & links
// (influencers / partners / stations and their tracked links), Reports
// (platform numbers, partner check-ins, message tests), Rapid response
// (surge log + brief builder) and the KPI dashboard. Backed by the campaign_*
// tables; hub admins are campaign staff automatically.

export const HUB_URL = 'https://hub.imaarishasrhr.org'
export const UKWELI_URL = 'https://ukweli.imaarishasrhr.org'
export const goLink = (code) => `${HUB_URL}/go/${code}`
export const ukweliAssetUrl = (slug) => `${UKWELI_URL}/#learn/m-${slug}`
export const STORAGE_PUBLIC = (import.meta.env.VITE_SUPABASE_URL || '') + '/storage/v1/object/public/campaign-media/'
export const assetFileUrl = (a) => a.storage_path ? STORAGE_PUBLIC + a.storage_path.replace(/^\/+/, '') : a.url
export const youtubeUrl = (a) => a.host === 'youtube' && a.external_id ? `https://www.youtube.com/watch?v=${a.external_id}` : null

export const KINDS = [['toolkit','Toolkit'],['toolkit_section','Toolkit section'],['video','Video'],['podcast_episode','Podcast episode'],
  ['clip','Clip'],['voice_note','Voice note'],['radio_insert','Radio insert'],['card','Card'],['graphic','Graphic'],
  ['message_card','Message card'],['audiogram','Audiogram'],['other','Other']]
export const KIND_LABEL = Object.fromEntries(KINDS)
export const LANGS = [['en','English'],['sw','Kiswahili'],['sheng','Sheng'],['maa','Maa'],['luo','Dholuo'],['multi','Mixed']]
export const LANG_LABEL = Object.fromEntries(LANGS)
const AUDIENCES = [['youth','18–24'],['mothers','Mothers & aunties'],['men','Men'],['practitioners','Health workers'],['partners','Partners'],['faith','Faith']]
const HOSTS = [['youtube','YouTube'],['podcast_host','Podcast host'],['supabase_storage','File (upload)'],['web','Web page'],['external','Other link']]
const STATUS = { draft:['Draft', C.mut], in_review:['In review', C.sky], changes_requested:['Changes requested', C.coral], approved:['Approved', C.mint] }
const VIS = { private:['Private', C.mut], test:['Test run', C.lilac], public:['Public', C.mint] }
export const VOICE_TYPES = [['nano','Nano influencer'],['micro','Micro influencer'],['macro','Macro / celebrity'],['partner_org','Partner organisation'],
  ['radio_station','Radio station'],['healthcare_worker','Health worker'],['faith_leader','Faith leader'],['male_champion','Male champion'],
  ['mother_champion','Mother / aunty champion'],['internal','CoMeT team']]
const VOICE_LABEL = Object.fromEntries(VOICE_TYPES)
const STAGES = [['identified','Identified'],['briefed','Briefed'],['message_tested','Message-tested'],['co_creating','Co-creating'],['active','Active'],['paused','Paused'],['exited','Exited']]
export const CHANNELS = [['whatsapp','WhatsApp'],['tiktok','TikTok'],['facebook','Facebook'],['instagram','Instagram'],['youtube','YouTube'],['x','X'],['radio','Radio'],['sms','SMS'],['print','Print'],['email','Email'],['other','Other']]
export const PLATFORMS = [['tiktok','TikTok'],['whatsapp','WhatsApp'],['whatsapp_channel','WhatsApp Channel'],['facebook','Facebook'],['instagram','Instagram'],
  ['youtube','YouTube'],['x','X'],['radio','Radio'],['podcast','Podcast'],['other','Other']]
const PLATFORM_LABEL = Object.fromEntries(PLATFORMS)
const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-KE')
const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
const short = () => Math.random().toString(36).slice(2, 6)
export const ytIdFrom = (v) => {
  const s = (v || '').trim()
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : s
}
export async function copyText(t, label = 'Copied') {
  try { await navigator.clipboard.writeText(t); toast('✓ ' + label, 'green') }
  catch { window.prompt('Copy this:', t) }
}

const card = (c = C.gold) => ({ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${c}`, borderRadius:12, padding:14, marginBottom:10 })
const ttl = { fontFamily:C.sans, fontSize:13.5, fontWeight:800, color:C.txt, margin:'0 0 2px', overflowWrap:'anywhere' }
const meta = { fontFamily:C.sans, fontSize:11, color:C.mut, margin:'0 0 6px' }
const lbl = { display:'block', fontFamily:C.sans, fontSize:10.5, fontWeight:800, color:C.mut, letterSpacing:'.04em', margin:'2px 0 4px' }
const sel = { ...inputStyle, padding:'9px 10px' }
const grid2 = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'0 10px' }
const pill = (c) => ({ display:'inline-block', fontFamily:C.sans, fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:10,
  background:c + '1f', color:c, marginRight:5, whiteSpace:'nowrap' })
const Empty = ({ children }) => <p style={{ fontFamily:C.sans, fontSize:12.5, color:C.mut, margin:'8px 0 16px' }}>{children}</p>
const errMsg = (e) => /campaign_/.test(e?.message || '') && /does not exist|not find/.test(e?.message || '')
  ? 'The campaign database update hasn’t been run on this project yet.' : (e?.message || String(e))

function Field({ label, children }) { return <label style={{ display:'block' }}><span style={lbl}>{label}</span>{children}</label> }
function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} style={sel}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
function MultiChips({ value = [], options, onChange, color = C.sky }) {
  const set = new Set(value)
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
      {options.map(([v, l]) => (
        <Chip key={v} active={set.has(v)} color={color}
          onClick={() => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); onChange([...n]) }}>{l}</Chip>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// 1. LIBRARY
// ══════════════════════════════════════════════════════════════════════════
export function CampaignLibrary({ session }) {
  const [assets, setAssets] = useState(null)
  const [myths, setMyths] = useState([])
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)     // asset object (new ones have no id)
  const [openIds, setOpenIds] = useState({})
  const [err, setErr] = useState('')

  const load = async () => {
    const [a, m] = await Promise.all([
      sb.from('campaign_assets').select('*').order('series', { nullsFirst:true }).order('episode_no').order('created_at'),
      sb.from('campaign_myths').select('slug,label').order('label'),
    ])
    if (a.error) { setErr(errMsg(a.error)); setAssets([]); return }
    setAssets(a.data || []); setMyths(m.data || [])
  }
  useEffect(() => { load() }, [])

  const masters = (assets || []).filter(a => !a.parent_id)
  const kids = useMemo(() => {
    const k = {}; (assets || []).filter(a => a.parent_id).forEach(a => (k[a.parent_id] = k[a.parent_id] || []).push(a)); return k
  }, [assets])
  const test = (f) => (a) => f === 'all' ? true
    : f === 'review' ? ['in_review','changes_requested'].includes(a.review_status)
    : f === 'draft' ? a.review_status === 'draft'
    : a.visibility === f
  const match = test(filter)
  const count = (f) => (assets || []).filter(test(f)).length
  const shown = masters.filter(m => match(m) || (kids[m.id] || []).some(match))

  const newAsset = (parent) => setEditing(parent ? {
    parent_id: parent.id, kind: 'clip', language: parent.language === 'multi' ? 'sheng' : parent.language, title: parent.title + ' — clip',
    slug: (parent.slug + '-clip-' + short()).slice(0, 80), audiences: parent.audiences || [], myth_slugs: parent.myth_slugs || [],
    audience_facing: parent.audience_facing, host: 'supabase_storage', sources: parent.sources || [], review_status: 'draft', visibility: 'private',
  } : { kind: 'video', language: 'en', title: '', slug: '', audiences: [], myth_slugs: [], audience_facing: 'public', host: 'youtube',
    sources: [], review_status: 'draft', visibility: 'private' })

  if (editing) return <AssetEditor asset={editing} myths={myths} session={session}
    onClose={(changed) => { setEditing(null); if (changed) load() }}/>

  return (
    <div>
      <SectionLabel color={C.lilac}>Campaign library</SectionLabel>
      <p style={{ ...meta, fontSize:12.5, lineHeight:1.6, maxWidth:640 }}>
        The toolkit, the five videos and the Imaarisha Conversations episodes are the masters; every clip, voice note,
        card or radio insert cut from them sits underneath. Nothing reaches partners or the public until it is
        <b> approved</b> and set to <b>Test run</b> or <b>Public</b>.
      </p>
      {err && <p style={{ ...meta, color:C.coral }}>{err}</p>}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'6px 0 14px', alignItems:'center' }}>
        {[['all','All'],['review','Needs review'],['draft','Drafts'],['test','Test run'],['public','Public']].map(([k, l]) =>
          <Chip key={k} active={filter === k} color={C.lilac} onClick={() => setFilter(k)}>{l} ({count(k)})</Chip>)}
        <span style={{ flex:1 }}/>
        <Btn small onClick={() => newAsset(null)}>＋ New master asset</Btn>
      </div>
      {assets === null && <Empty>Loading…</Empty>}
      {assets && shown.length === 0 && <Empty>Nothing here for this filter.</Empty>}
      {shown.map(m => {
        const children = kids[m.id] || []
        const open = !!openIds[m.id]
        return (
          <div key={m.id} style={card(STATUS[m.review_status]?.[1])}>
            <AssetLine a={m} onEdit={() => setEditing(m)}/>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
              <Btn small ghost onClick={() => setOpenIds(s => ({ ...s, [m.id]: !open }))}>
                {open ? '▾' : '▸'} Cut-downs ({children.length})</Btn>
              <Btn small ghost onClick={() => newAsset(m)}>＋ Add cut-down</Btn>
            </div>
            {open && (
              <div style={{ marginTop:10, paddingLeft:12, borderLeft:`2px solid ${C.line}` }}>
                {children.length === 0 && <Empty>No cut-downs yet.</Empty>}
                {children.map(c => <div key={c.id} style={{ padding:'8px 0', borderBottom:`1px solid ${C.line}` }}>
                  <AssetLine a={c} onEdit={() => setEditing(c)}/></div>)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AssetLine({ a, onEdit }) {
  const [sl, sc] = STATUS[a.review_status] || ['?', C.mut]
  const [vl, vc] = VIS[a.visibility] || ['?', C.mut]
  const link = youtubeUrl(a) || assetFileUrl(a)
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={ttl}>{a.title}</p>
        <p style={meta}>{KIND_LABEL[a.kind] || a.kind} · {LANG_LABEL[a.language] || a.language}
          {a.series ? ` · ${a.series}` : ''}{a.episode_no ? ` #${a.episode_no}` : ''} · <code style={{ fontSize:10.5 }}>{a.slug}</code></p>
        <span style={pill(sc)}>{sl}</span><span style={pill(vc)}>{vl}</span>
        {a.audience_facing === 'partners' && <span style={pill(C.gold)}>Partners only</span>}
        {(a.myth_slugs || []).length > 0 && <span style={pill(C.sky)}>{a.myth_slugs.length} myth{a.myth_slugs.length > 1 ? 's' : ''}</span>}
        {!link && <span style={pill(C.coral)}>No media yet</span>}
        {a.review_notes && a.review_status === 'changes_requested' && <p style={{ ...meta, color:C.coral, margin:'6px 0 0' }}>“{a.review_notes}”</p>}
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ ...meta, margin:0, color:C.sky, fontWeight:800, textDecoration:'none', alignSelf:'center' }}>Open ↗</a>}
        <Btn small ghost onClick={onEdit}>Edit</Btn>
      </div>
    </div>
  )
}

function AssetEditor({ asset, myths, session, onClose }) {
  const [a, setA] = useState({ ...asset, sourcesText: (asset.sources || []).join('\n') })
  const [busy, setBusy] = useState(false)
  const [upPct, setUpPct] = useState('')
  const isNew = !asset.id
  const set = (k) => (v) => setA(s => ({ ...s, [k]: v && v.target ? v.target.value : v }))
  const approved = a.review_status === 'approved'

  const payload = () => {
    const p = {
      slug: slugify(a.slug || a.title), parent_id: a.parent_id || null, kind: a.kind, series: a.series || null,
      episode_no: a.episode_no ? Number(a.episode_no) : null, title: (a.title || '').trim(), summary: a.summary || null,
      language: a.language, audiences: a.audiences || [], myth_slugs: a.myth_slugs || [], audience_facing: a.audience_facing,
      host: a.host, external_id: a.host === 'youtube' ? ytIdFrom(a.external_id) || null : (a.external_id || null),
      url: a.url || null, storage_path: a.storage_path || null, duration_seconds: a.duration_seconds ? Number(a.duration_seconds) : null,
      sources: (a.sourcesText || '').split('\n').map(s => s.trim()).filter(Boolean),
    }
    return p
  }
  const save = async (extra = {}, msg = '✓ Saved') => {
    const p = { ...payload(), ...extra }
    if (!p.title) { toast('Add a title first', 'red'); return false }
    if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(p.slug)) { toast('Slug: lowercase letters, numbers and dashes', 'red'); return false }
    setBusy(true)
    const res = isNew ? await sb.from('campaign_assets').insert(p).select().single()
                      : await sb.from('campaign_assets').update(p).eq('id', asset.id).select().single()
    setBusy(false)
    if (res.error) { toast(errMsg(res.error), 'red'); return false }
    toast(msg, 'green'); onClose(true); return true
  }

  const upload = async (file) => {
    if (!file) return
    const slug = slugify(a.slug || a.title) || 'asset'
    const path = `${a.kind}/${slug}-${Date.now().toString(36)}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`
    setUpPct('Uploading…')
    const { error } = await sb.storage.from('campaign-media').upload(path, file, { upsert: false, contentType: file.type || undefined })
    if (error) { setUpPct(''); toast(error.message, 'red'); return }
    setA(s => ({ ...s, storage_path: path, host: s.host === 'youtube' ? s.host : 'supabase_storage' })); setUpPct('✓ Uploaded')
  }

  return (
    <div>
      <SectionLabel color={C.lilac}>{isNew ? (a.parent_id ? 'New cut-down' : 'New master asset') : 'Edit asset'}</SectionLabel>
      <div style={card(STATUS[a.review_status]?.[1])}>
        <div style={grid2}>
          <Field label="Title"><input value={a.title || ''} onChange={set('title')} style={inputStyle}/></Field>
          <Field label="Slug (used in links — keep it short)">
            <input value={a.slug || ''} onChange={e => set('slug')(slugify(e.target.value))} placeholder={slugify(a.title)} style={inputStyle}/></Field>
          <Field label="Type"><Select value={a.kind} onChange={set('kind')} options={KINDS}/></Field>
          <Field label="Language"><Select value={a.language} onChange={set('language')} options={LANGS}/></Field>
          <Field label="Series"><input value={a.series || ''} onChange={set('series')} placeholder="e.g. Imaarisha Conversations (Sheng)" style={inputStyle}/></Field>
          <Field label="Episode / number"><input type="number" min="1" value={a.episode_no || ''} onChange={set('episode_no')} style={inputStyle}/></Field>
        </div>
        <Field label="Short description (shown on Ukweli and in the Campaign Kit)">
          <textarea value={a.summary || ''} onChange={set('summary')} rows={3} style={{ ...inputStyle, resize:'vertical' }}/></Field>
        <span style={lbl}>Audience</span>
        <MultiChips value={a.audiences} options={AUDIENCES} onChange={set('audiences')}/>
        <span style={lbl}>Myths it counters (drives the rapid-response brief)</span>
        <MultiChips value={a.myth_slugs} options={myths.map(m => [m.slug, m.label])} onChange={set('myth_slugs')} color={C.coral}/>
        <div style={grid2}>
          <Field label="Who it’s for"><Select value={a.audience_facing} onChange={set('audience_facing')}
            options={[['public','Public (Ukweli + partners)'],['partners','Partners & influencers only']]}/></Field>
          <Field label="Where it’s hosted"><Select value={a.host} onChange={set('host')} options={HOSTS}/></Field>
        </div>
        {a.host === 'youtube' && <Field label="YouTube link or video ID (upload as Unlisted until launch)">
          <input value={a.external_id || ''} onChange={set('external_id')} placeholder="https://youtu.be/…" style={inputStyle}/></Field>}
        {['podcast_host','web','external'].includes(a.host) && <Field label="Link (podcast episode, page…)">
          <input value={a.url || ''} onChange={set('url')} placeholder="https://…" style={inputStyle}/></Field>}
        <Field label="File (PDF, MP3 clip, image) — stored in campaign-media">
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
            <input type="file" accept=".pdf,.mp3,.m4a,.mp4,.png,.jpg,.jpeg,.webp" onChange={e => upload(e.target.files?.[0])}
              style={{ fontFamily:C.sans, fontSize:12 }}/>
            <span style={{ ...meta, margin:0 }}>{upPct || (a.storage_path ? a.storage_path : 'No file')}</span>
          </div>
        </Field>
        <Field label="Sources (WHO / MoH Kenya / NASCOP — one per line)">
          <textarea value={a.sourcesText} onChange={set('sourcesText')} rows={2} style={{ ...inputStyle, resize:'vertical' }}/></Field>

        <div style={{ borderTop:`1px solid ${C.line}`, marginTop:6, paddingTop:12 }}>
          <span style={lbl}>Review & release</span>
          <p style={{ ...meta, lineHeight:1.55 }}>
            Status: <b style={{ color:STATUS[a.review_status]?.[1] }}>{STATUS[a.review_status]?.[0]}</b>
            {asset.reviewed_at ? ` · approved ${timeAgo(asset.reviewed_at)}` : ''}.
            Editing approved content as a non-reviewer sends it back to review.
          </p>
          {a.review_status === 'changes_requested' || a.review_status === 'in_review'
            ? <Field label="Reviewer notes"><textarea value={a.review_notes || ''} onChange={set('review_notes')} rows={2} style={{ ...inputStyle, resize:'vertical' }}/></Field> : null}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <Btn disabled={busy} onClick={() => save()}>Save</Btn>
            {!approved && a.review_status !== 'in_review' &&
              <Btn disabled={busy} color={C.sky} onClick={() => save({ review_status:'in_review' }, '✓ Sent for accuracy review')}>Send for review</Btn>}
            {!approved && session?.isAdmin &&
              <Btn disabled={busy} color={C.mint} onClick={() => save({ review_status:'approved' }, '✓ Approved')}>Approve</Btn>}
            {!approved && session?.isAdmin && a.review_status === 'in_review' &&
              <Btn disabled={busy} color={C.coral} onClick={() => save({ review_status:'changes_requested', review_notes: a.review_notes || null }, 'Changes requested')}>Request changes</Btn>}
            <Btn ghost onClick={() => onClose(false)}>Cancel</Btn>
          </div>
          {approved && !isNew && (
            <div style={{ marginTop:12 }}>
              <span style={lbl}>Who can see it</span>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {Object.entries(VIS).map(([k, [l, c]]) => (
                  <Chip key={k} active={a.visibility === k} color={c}
                    onClick={() => save({ visibility:k }, k === 'public' ? '✓ Live on Ukweli and in the Campaign Kit' : k === 'test' ? '✓ Visible to the test-run cohort' : '✓ Back to private')}>{l}</Chip>
                ))}
              </div>
              <p style={{ ...meta, marginTop:6 }}>Test run = signed-in hub members only. Public = Ukweli (if public-facing) and every member.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// 2. VOICES & LINKS
// ══════════════════════════════════════════════════════════════════════════
export function CampaignVoices() {
  const [voices, setVoices] = useState(null)
  const [links, setLinks] = useState([])
  const [stats, setStats] = useState({})
  const [assets, setAssets] = useState([])
  const [members, setMembers] = useState([])
  const [type, setType] = useState('all')
  const [open, setOpen] = useState(null)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState('')

  const load = async () => {
    const [v, l, s, a, m] = await Promise.all([
      sb.from('campaign_voices').select('*').order('display_name'),
      sb.from('campaign_links').select('*').order('created_at', { ascending:false }),
      sb.from('campaign_kpi_links').select('code,clicks,unique_daily_visitors,sessions_landed,last_click'),
      sb.from('campaign_assets').select('id,slug,title,kind,language,host,external_id,url,storage_path,audience_facing,visibility').eq('review_status','approved').order('title'),
      sb.rpc('campaign_member_directory'),
    ])
    if (v.error) { setErr(errMsg(v.error)); setVoices([]); return }
    setVoices(v.data || []); setLinks(l.data || []); setAssets(a.data || []); setMembers(m.data || [])
    setStats(Object.fromEntries((s.data || []).map(r => [r.code, r])))
  }
  useEffect(() => { load() }, [])

  const shown = (voices || []).filter(v => type === 'all' ? true : type === 'influencers'
    ? !['partner_org','radio_station','internal'].includes(v.voice_type) : v.voice_type === type)
  const active = (voices || []).filter(v => v.onboarding_stage === 'active' && !['partner_org','radio_station','internal'].includes(v.voice_type)).length

  return (
    <div>
      <SectionLabel color={C.lilac}>Voices & tracked links</SectionLabel>
      <p style={{ ...meta, fontSize:12.5, lineHeight:1.6, maxWidth:640 }}>
        Every influencer, partner organisation and radio station gets its own short links
        (<code>hub.imaarishasrhr.org/go/…</code>), so you can see who drives what. Partners from the directory are added automatically.
        Give a voice its hub login and they can see their links and send their monthly numbers from the Campaign tab.
      </p>
      {err && <p style={{ ...meta, color:C.coral }}>{err}</p>}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', margin:'6px 0 14px', alignItems:'center' }}>
        {[['all','All'],['influencers','Influencers'],['partner_org','Partners'],['radio_station','Radio']].map(([k, l]) =>
          <Chip key={k} active={type === k} color={C.lilac} onClick={() => setType(k)}>{l}</Chip>)}
        <span style={{ ...meta, margin:'0 0 0 6px' }}>{active} active influencer voice{active === 1 ? '' : 's'} · target 15</span>
        <span style={{ flex:1 }}/>
        <Btn small onClick={() => setAdding(true)}>＋ Add voice</Btn>
      </div>
      {adding && <VoiceForm members={members} onClose={(ch) => { setAdding(false); if (ch) load() }}/>}
      {voices === null && <Empty>Loading…</Empty>}
      {shown.map(v => {
        const vLinks = links.filter(l => l.voice_id === v.id)
        const isOpen = open === v.id
        const clicks = vLinks.reduce((s, l) => s + (stats[l.code]?.clicks || 0), 0)
        return (
          <div key={v.id} style={card(v.onboarding_stage === 'active' ? C.mint : C.line)}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-start', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:200 }}>
                <p style={ttl}>{v.display_name}</p>
                <p style={meta}>{VOICE_LABEL[v.voice_type]} · <code>{v.code}</code>{v.county ? ` · ${v.county}` : ''}
                  {(v.primary_platforms || []).length ? ` · ${(v.primary_platforms).map(p => PLATFORM_LABEL[p] || p).join(', ')}` : ''}</p>
                <span style={pill(v.onboarding_stage === 'active' ? C.mint : C.mut)}>{STAGES.find(s => s[0] === v.onboarding_stage)?.[1]}</span>
                <span style={pill(C.sky)}>{vLinks.length} link{vLinks.length === 1 ? '' : 's'} · {fmt(clicks)} clicks</span>
                {v.contact_user_id ? <span style={pill(C.gold)}>Has hub login</span> : <span style={pill(C.mut)}>No login yet</span>}
              </div>
              <Btn small ghost onClick={() => setOpen(isOpen ? null : v.id)}>{isOpen ? 'Close' : 'Manage'}</Btn>
            </div>
            {isOpen && <VoicePanel v={v} links={vLinks} stats={stats} assets={assets} members={members} onChange={load}/>}
          </div>
        )
      })}
    </div>
  )
}

function VoiceForm({ members, onClose }) {
  const [f, setF] = useState({ display_name:'', code:'', voice_type:'nano', county:'', primary_platforms:[], contact_user_id:'' })
  const save = async () => {
    const code = slugify(f.code || f.display_name).replace(/-+/g, '-').slice(0, 40)
    if (!f.display_name || !code) { toast('Name needed', 'red'); return }
    const { error } = await sb.from('campaign_voices').insert({ display_name:f.display_name.trim(), code, voice_type:f.voice_type,
      county:f.county || null, primary_platforms:f.primary_platforms, contact_user_id:f.contact_user_id || null })
    if (error) { toast(/duplicate/.test(error.message) ? 'That code is taken — try another' : errMsg(error), 'red'); return }
    toast('✓ Voice added', 'green'); onClose(true)
  }
  return (
    <div style={card(C.gold)}>
      <div style={grid2}>
        <Field label="Name (as you know them)"><input value={f.display_name} onChange={e => setF({ ...f, display_name:e.target.value })} style={inputStyle}/></Field>
        <Field label="Link code"><input value={f.code} placeholder={slugify(f.display_name)} onChange={e => setF({ ...f, code:slugify(e.target.value) })} style={inputStyle}/></Field>
        <Field label="Type"><Select value={f.voice_type} onChange={v => setF({ ...f, voice_type:v })} options={VOICE_TYPES}/></Field>
        <Field label="County"><input value={f.county} onChange={e => setF({ ...f, county:e.target.value })} style={inputStyle}/></Field>
      </div>
      <span style={lbl}>Platforms</span>
      <MultiChips value={f.primary_platforms} options={PLATFORMS} onChange={v => setF({ ...f, primary_platforms:v })}/>
      <Field label="Hub login (optional — lets them report)">
        <Select value={f.contact_user_id} onChange={v => setF({ ...f, contact_user_id:v })} placeholder="— none —"
          options={members.map(m => [m.id, `${m.full_name || '(no name)'} · ${m.email}`])}/></Field>
      <div style={{ display:'flex', gap:8 }}><Btn onClick={save}>Add voice</Btn><Btn ghost onClick={() => onClose(false)}>Cancel</Btn></div>
    </div>
  )
}

function VoicePanel({ v, links, stats, assets, members, onChange }) {
  const [stage, setStage] = useState(v.onboarding_stage)
  const [login, setLogin] = useState(v.contact_user_id || '')
  const [nl, setNl] = useState({ asset_id:'', channel:(v.primary_platforms || [])[0] && CHANNELS.some(c => c[0] === v.primary_platforms[0]) ? v.primary_platforms[0] : 'whatsapp', target:'ukweli', custom:'' })
  const asset = assets.find(a => a.id === nl.asset_id)

  const saveVoice = async () => {
    const { error } = await sb.from('campaign_voices').update({ onboarding_stage:stage, contact_user_id:login || null,
      onboarded_at: stage === 'active' && !v.onboarded_at ? new Date().toISOString().slice(0, 10) : v.onboarded_at }).eq('id', v.id)
    if (error) toast(errMsg(error), 'red'); else { toast('✓ Updated', 'green'); onChange() }
  }
  const destination = () => {
    if (nl.target === 'custom') return nl.custom.trim()
    if (!asset) return `${UKWELI_URL}/`
    if (nl.target === 'direct') return youtubeUrl(asset) || assetFileUrl(asset) || ukweliAssetUrl(asset.slug)
    return asset.audience_facing === 'public' ? ukweliAssetUrl(asset.slug) : `${HUB_URL}/#campaign`
  }
  const createLink = async () => {
    const dest = destination()
    if (!/^https:\/\//.test(dest)) { toast('Destination must start with https://', 'red'); return }
    const base = [v.code, asset ? asset.slug.replace(/^conversations-/, 'conv-').slice(0, 18) : 'ukweli', nl.channel.slice(0, 2)].join('-')
    const code = (base.replace(/[^a-z0-9_-]/g, '').slice(0, 56) + '-' + short()).toLowerCase()
    const { error } = await sb.from('campaign_links').insert({ code, destination_url:dest, asset_id:asset?.id || null, voice_id:v.id, channel:nl.channel })
    if (error) { toast(errMsg(error), 'red'); return }
    copyText(goLink(code), 'Link created and copied'); onChange()
  }
  const toggleLink = async (l) => {
    const { error } = await sb.from('campaign_links').update({ active: !l.active }).eq('code', l.code)
    if (error) toast(errMsg(error), 'red'); else onChange()
  }

  return (
    <div style={{ marginTop:12, borderTop:`1px solid ${C.line}`, paddingTop:12 }}>
      <div style={grid2}>
        <Field label="Onboarding stage"><Select value={stage} onChange={setStage} options={STAGES}/></Field>
        <Field label="Hub login"><Select value={login} onChange={setLogin} placeholder="— none —"
          options={members.map(m => [m.id, `${m.full_name || '(no name)'} · ${m.email}`])}/></Field>
      </div>
      <Btn small onClick={saveVoice}>Save</Btn>

      <p style={{ ...lbl, marginTop:14 }}>Links</p>
      {links.length === 0 && <Empty>No links yet.</Empty>}
      {links.map(l => {
        const s = stats[l.code] || {}
        const a = assets.find(x => x.id === l.asset_id)
        return (
          <div key={l.code} style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', padding:'7px 0', borderBottom:`1px solid ${C.line}`, opacity: l.active ? 1 : .5 }}>
            <div style={{ flex:1, minWidth:200 }}>
              <p style={{ ...ttl, fontSize:12.5 }}>{a ? a.title : 'Ukweli home'} <span style={{ ...meta, fontWeight:400 }}>· {CHANNELS.find(c => c[0] === l.channel)?.[1]}</span></p>
              <p style={{ ...meta, margin:0, overflowWrap:'anywhere' }}><code>{goLink(l.code)}</code></p>
              <p style={{ ...meta, margin:0 }}>{fmt(s.clicks || 0)} clicks · {fmt(s.unique_daily_visitors || 0)} people · {fmt(s.sessions_landed || 0)} arrived on Ukweli{s.last_click ? ` · last ${timeAgo(s.last_click)}` : ''}</p>
            </div>
            <Btn small ghost onClick={() => copyText(goLink(l.code), 'Link copied')}>Copy</Btn>
            <Btn small ghost onClick={() => toggleLink(l)}>{l.active ? 'Switch off' : 'Switch on'}</Btn>
          </div>
        )
      })}
      <div style={{ marginTop:12, background:C.card2, borderRadius:10, padding:12 }}>
        <p style={{ ...lbl, marginTop:0 }}>New tracked link</p>
        <div style={grid2}>
          <Field label="What it points to"><Select value={nl.asset_id} onChange={x => setNl({ ...nl, asset_id:x || '' })} placeholder="Ukweli home page"
            options={assets.map(a => [a.id, `${a.title} (${LANG_LABEL[a.language] || a.language})${a.visibility === 'private' ? ' — not released yet' : ''}`])}/></Field>
          <Field label="Where they’ll post it"><Select value={nl.channel} onChange={x => setNl({ ...nl, channel:x })} options={CHANNELS}/></Field>
          <Field label="Send people to"><Select value={nl.target} onChange={x => setNl({ ...nl, target:x })}
            options={[['ukweli','The Ukweli page (recommended — measured in full)'],['direct','Straight to YouTube / the file'],['custom','A custom address']]}/></Field>
        </div>
        {nl.target === 'custom' && <input value={nl.custom} onChange={e => setNl({ ...nl, custom:e.target.value })} placeholder="https://…" style={inputStyle}/>}
        <p style={{ ...meta, overflowWrap:'anywhere' }}>→ {destination() || '…'}</p>
        <Btn small onClick={createLink}>Create & copy link</Btn>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// 3. REPORTS — platform numbers, partner check-ins, message tests
// ══════════════════════════════════════════════════════════════════════════
export function CampaignReports() {
  const [tab, setTab] = useState('numbers')
  return (
    <div>
      <SectionLabel color={C.lilac}>Reports</SectionLabel>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        {[['numbers','Platform numbers'],['checkins','Partner check-ins'],['tests','Message tests']].map(([k, l]) =>
          <Chip key={k} active={tab === k} color={C.lilac} onClick={() => setTab(k)}>{l}</Chip>)}
      </div>
      {tab === 'numbers' && <Numbers/>}
      {tab === 'checkins' && <Checkins/>}
      {tab === 'tests' && <Tests/>}
    </div>
  )
}

export const METRIC_FIELDS = [['impressions','Impressions'],['views','Views / plays'],['unique_reach','Unique reach'],['engagements','Engagements'],
  ['shares','Shares'],['saves','Saves'],['comments','Comments'],['forwards','WhatsApp forwards'],['followers','Followers / subscribers'],['listeners','Listeners / downloads']]

function Numbers() {
  const [rows, setRows] = useState(null)
  const [voices, setVoices] = useState({})
  const [adding, setAdding] = useState(false)
  const load = async () => {
    const [r, v] = await Promise.all([
      sb.from('campaign_channel_metrics').select('*').order('period_start', { ascending:false }).limit(200),
      sb.from('campaign_voices').select('id,display_name'),
    ])
    setRows(r.data || []); setVoices(Object.fromEntries((v.data || []).map(x => [x.id, x.display_name])))
  }
  useEffect(() => { load() }, [])
  const verify = async (r) => {
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await sb.from('campaign_channel_metrics').update({ verified: !r.verified, verified_by: !r.verified ? user?.id : null }).eq('id', r.id)
    if (error) toast(errMsg(error), 'red'); else load()
  }
  const shot = async (path) => {
    const { data, error } = await sb.storage.from('campaign-reports').createSignedUrl(path, 300)
    if (error) toast(error.message, 'red'); else window.open(data.signedUrl, '_blank', 'noopener')
  }
  const pending = (rows || []).filter(r => !r.verified).length
  return (
    <div>
      <p style={{ ...meta, fontSize:12.5, lineHeight:1.6, maxWidth:640 }}>
        Influencers and stations send monthly numbers from their Campaign tab; add your own channels (YouTube, WhatsApp Channel,
        Facebook page) here each week. Check the screenshots, then mark a row verified — only verified numbers reach the public pulse.
      </p>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <span style={pill(pending ? C.coral : C.mint)}>{pending} waiting for verification</span>
        <span style={{ flex:1 }}/>
        <Btn small onClick={() => setAdding(!adding)}>{adding ? 'Close' : '＋ Add own-channel numbers'}</Btn>
      </div>
      {adding && <MetricsForm source="own_channel" onDone={() => { setAdding(false); load() }}/>}
      {rows === null && <Empty>Loading…</Empty>}
      {rows && rows.length === 0 && <Empty>No numbers yet.</Empty>}
      {(rows || []).map(r => (
        <div key={r.id} style={card(r.verified ? C.mint : C.gold)}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:220 }}>
              <p style={ttl}>{r.voice_id ? voices[r.voice_id] || 'Voice' : 'Own channel'} · {PLATFORM_LABEL[r.platform] || r.platform}</p>
              <p style={meta}>{r.period_start} → {r.period_end} · {r.source.replace('_', ' ')}</p>
              <p style={{ ...meta, color:C.txt }}>
                {METRIC_FIELDS.filter(([k]) => r[k] != null).map(([k, l]) => `${l}: ${fmt(r[k])}`).join(' · ') || 'No numbers'}
                {r.completion_rate != null ? ` · Completion ${r.completion_rate}%` : ''}
              </p>
              {r.notes && <p style={{ ...meta, fontStyle:'italic' }}>“{r.notes}”</p>}
              {(r.screenshot_paths || []).map((p, i) => <button key={p} onClick={() => shot(p)}
                style={{ ...pill(C.sky), border:'none', cursor:'pointer' }}>Screenshot {i + 1}</button>)}
            </div>
            <Btn small color={r.verified ? undefined : C.mint} ghost={r.verified} onClick={() => verify(r)}>{r.verified ? '✓ Verified' : 'Verify'}</Btn>
          </div>
        </div>
      ))}
    </div>
  )
}

// Shared by admin (own_channel) and the member Campaign tab (influencer_report / radio_report)
export function MetricsForm({ source, voiceId, onDone }) {
  const today = new Date()
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const iso = (d) => d.toISOString().slice(0, 10)
  const [f, setF] = useState({ period_start: iso(first), period_end: iso(today), platform: 'tiktok', notes:'', posts_count:'', completion_rate:'' })
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    const { data: { user } } = await sb.auth.getUser()
    const paths = []
    for (const file of files) {
      const p = `${user.id}/${Date.now().toString(36)}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`
      const { error } = await sb.storage.from('campaign-reports').upload(p, file)
      if (error) { setBusy(false); toast(error.message, 'red'); return }
      paths.push(p)
    }
    const row = { period_start:f.period_start, period_end:f.period_end, source, voice_id:voiceId || null, platform:f.platform,
      notes:f.notes || null, screenshot_paths:paths, posts_count: f.posts_count ? Number(f.posts_count) : null,
      completion_rate: f.completion_rate ? Number(f.completion_rate) : null }
    METRIC_FIELDS.forEach(([k]) => { if (f[k] !== undefined && f[k] !== '') row[k] = Number(String(f[k]).replace(/[, ]/g, '')) })
    const { error } = await sb.from('campaign_channel_metrics').insert(row)
    setBusy(false)
    if (error) { toast(errMsg(error), 'red'); return }
    toast('✓ Numbers sent — thank you', 'green'); onDone && onDone()
  }
  return (
    <div style={card(C.sky)}>
      <div style={grid2}>
        <Field label="From"><input type="date" value={f.period_start} onChange={e => setF({ ...f, period_start:e.target.value })} style={inputStyle}/></Field>
        <Field label="To"><input type="date" value={f.period_end} onChange={e => setF({ ...f, period_end:e.target.value })} style={inputStyle}/></Field>
        <Field label="Platform"><Select value={f.platform} onChange={v => setF({ ...f, platform:v })} options={PLATFORMS}/></Field>
        <Field label="Campaign posts in this period"><input inputMode="numeric" value={f.posts_count} onChange={e => setF({ ...f, posts_count:e.target.value })} style={inputStyle}/></Field>
        {METRIC_FIELDS.map(([k, l]) => (
          <Field key={k} label={l}><input inputMode="numeric" value={f[k] ?? ''} onChange={e => setF({ ...f, [k]:e.target.value })} placeholder="—" style={inputStyle}/></Field>
        ))}
        <Field label="Average completion %"><input inputMode="decimal" value={f.completion_rate} onChange={e => setF({ ...f, completion_rate:e.target.value })} placeholder="—" style={inputStyle}/></Field>
      </div>
      <Field label="Screenshots of your analytics (they stay private to the CoMeT team)">
        <input type="file" accept="image/*,.pdf" multiple onChange={e => setFiles([...(e.target.files || [])].slice(0, 6))} style={{ fontFamily:C.sans, fontSize:12, marginBottom:10 }}/></Field>
      <Field label="Anything worth knowing (comments, questions people asked, pushback)">
        <textarea value={f.notes} onChange={e => setF({ ...f, notes:e.target.value })} rows={2} style={{ ...inputStyle, resize:'vertical' }}/></Field>
      <Btn disabled={busy} onClick={save}>{busy ? 'Sending…' : 'Send numbers'}</Btn>
    </div>
  )
}

function Checkins() {
  const [rows, setRows] = useState(null)
  const [voices, setVoices] = useState({})
  useEffect(() => {
    Promise.all([
      sb.from('campaign_partner_checkins').select('*').order('month', { ascending:false }).limit(200),
      sb.from('campaign_voices').select('id,display_name'),
    ]).then(([r, v]) => { setRows(r.data || []); setVoices(Object.fromEntries((v.data || []).map(x => [x.id, x.display_name]))) })
  }, [])
  const months = [...new Set((rows || []).map(r => r.month))]
  return (
    <div>
      <p style={{ ...meta, fontSize:12.5, lineHeight:1.6, maxWidth:640 }}>Partners send one check-in a month from their Campaign tab. Target: 8 partners distributing every month.</p>
      {rows === null && <Empty>Loading…</Empty>}
      {rows && rows.length === 0 && <Empty>No check-ins yet.</Empty>}
      {months.map(m => {
        const list = rows.filter(r => r.month === m)
        return (
          <div key={m} style={{ marginBottom:14 }}>
            <p style={{ ...lbl }}>{new Date(m + 'T00:00:00').toLocaleDateString('en-KE', { month:'long', year:'numeric' })} · {list.filter(r => r.distributed).length} distributing</p>
            {list.map(r => (
              <div key={r.id} style={card(r.distributed ? C.mint : C.coral)}>
                <p style={ttl}>{voices[r.voice_id] || 'Partner'}</p>
                <p style={meta}>{r.distributed ? 'Distributed content' : 'Did not distribute'} · {fmt(r.items_distributed)} items · ~{fmt(r.people_reached_est)} people · {fmt(r.service_referrals)} referrals</p>
                {r.evidence_used_in && <p style={{ ...meta, color:C.txt }}><b>Evidence used in:</b> {r.evidence_used_in}</p>}
                {r.observations && <p style={{ ...meta, color:C.txt }}><b>Hearing:</b> {r.observations}</p>}
                {r.testimonials && <p style={{ ...meta, color:C.txt, fontStyle:'italic' }}>“{r.testimonials}”</p>}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

const DIMENSIONS = [['language','Language'],['frame','Frame'],['voice','Voice'],['format','Format'],['faith_framing','Faith framing'],['other','Other']]
const ARM_FIELDS = [['group_size','Group size'],['reached','Reached'],['forwards','Forwards'],['saves','Saves'],['shares','Shares'],['completions','Completions'],['responses','Responses'],['trust_rating','Trust (1–5)']]
function Tests() {
  const [tests, setTests] = useState(null)
  const [arms, setArms] = useState([])
  const [assets, setAssets] = useState([])
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ theme:'', dimension:'frame', decision_metric:'Forward rate + saves', a:'', b:'' })
  const load = async () => {
    const [t, a, s] = await Promise.all([
      sb.from('campaign_message_tests').select('*').order('created_at', { ascending:false }),
      sb.from('campaign_message_test_arms').select('*'),
      sb.from('campaign_assets').select('id,title').order('title'),
    ])
    setTests(t.data || []); setArms(a.data || []); setAssets(s.data || [])
  }
  useEffect(() => { load() }, [])
  const create = async () => {
    if (!f.theme || !f.a || !f.b) { toast('Theme and both arms needed', 'red'); return }
    const { data, error } = await sb.from('campaign_message_tests').insert({ theme:f.theme, dimension:f.dimension, decision_metric:f.decision_metric,
      status:'running', start_date:new Date().toISOString().slice(0, 10) }).select().single()
    if (error) { toast(errMsg(error), 'red'); return }
    await sb.from('campaign_message_test_arms').insert([{ test_id:data.id, arm:'A', description:f.a }, { test_id:data.id, arm:'B', description:f.b }])
    setAdding(false); setF({ theme:'', dimension:'frame', decision_metric:'Forward rate + saves', a:'', b:'' }); load()
  }
  const updArm = async (arm, patch) => {
    const { error } = await sb.from('campaign_message_test_arms').update(patch).eq('id', arm.id)
    if (error) toast(errMsg(error), 'red'); else load()
  }
  const decide = async (t, w) => {
    const arm = arms.find(a => a.test_id === t.id && a.arm === w)
    const { error } = await sb.from('campaign_message_tests').update({ status:'decided', winning_arm:w, end_date:new Date().toISOString().slice(0, 10) }).eq('id', t.id)
    if (error) { toast(errMsg(error), 'red'); return }
    if (arm?.asset_id) await sb.from('campaign_assets').update({ winning_frame: `${t.dimension}: ${arm.description}` }).eq('id', arm.asset_id)
    toast(`✓ Arm ${w} wins — build the next round on it`, 'green'); load()
  }
  return (
    <div>
      <p style={{ ...meta, fontSize:12.5, lineHeight:1.6, maxWidth:640 }}>Two versions, one difference, 30–50 people per arm in WhatsApp groups, 7 days. Enter the counts, then pick the winner.</p>
      <Btn small onClick={() => setAdding(!adding)}>{adding ? 'Close' : '＋ New test'}</Btn>
      {adding && (
        <div style={{ ...card(C.sky), marginTop:10 }}>
          <div style={grid2}>
            <Field label="Theme"><input value={f.theme} onChange={e => setF({ ...f, theme:e.target.value })} placeholder="Contraceptive safety" style={inputStyle}/></Field>
            <Field label="What changes between A and B"><Select value={f.dimension} onChange={v => setF({ ...f, dimension:v })} options={DIMENSIONS}/></Field>
            <Field label="How you’ll decide"><input value={f.decision_metric} onChange={e => setF({ ...f, decision_metric:e.target.value })} style={inputStyle}/></Field>
          </div>
          <Field label="Arm A"><input value={f.a} onChange={e => setF({ ...f, a:e.target.value })} placeholder="Sheng + emoji" style={inputStyle}/></Field>
          <Field label="Arm B"><input value={f.b} onChange={e => setF({ ...f, b:e.target.value })} placeholder="Formal Kiswahili" style={inputStyle}/></Field>
          <Btn onClick={create}>Start test</Btn>
        </div>
      )}
      <div style={{ marginTop:12 }}>
        {tests === null && <Empty>Loading…</Empty>}
        {tests && tests.length === 0 && <Empty>No tests yet.</Empty>}
        {(tests || []).map(t => (
          <div key={t.id} style={card(t.status === 'decided' ? C.mint : C.sky)}>
            <p style={ttl}>{t.theme} <span style={{ ...meta, fontWeight:400 }}>· {DIMENSIONS.find(d => d[0] === t.dimension)?.[1]} · decide on {t.decision_metric}</span></p>
            <p style={meta}>{t.status === 'decided' ? `Winner: arm ${t.winning_arm}` : 'Running'}{t.start_date ? ` · started ${t.start_date}` : ''}</p>
            {['A','B'].map(w => {
              const arm = arms.find(a => a.test_id === t.id && a.arm === w)
              if (!arm) return null
              return (
                <div key={w} style={{ background:C.card2, borderRadius:10, padding:10, marginBottom:8, border: t.winning_arm === w ? `2px solid ${C.mint}` : 'none' }}>
                  <p style={{ ...ttl, fontSize:12.5 }}>Arm {w}: {arm.description}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(96px, 1fr))', gap:'0 8px' }}>
                    {ARM_FIELDS.map(([k, l]) => (
                      <Field key={k} label={l}><input inputMode="decimal" defaultValue={arm[k] ?? ''} style={{ ...inputStyle, padding:'7px 8px' }}
                        onBlur={e => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== arm[k]) updArm(arm, { [k]: v }) }}/></Field>
                    ))}
                  </div>
                  <Field label="Asset used"><Select value={arm.asset_id || ''} onChange={v => updArm(arm, { asset_id:v || null })} placeholder="—"
                    options={assets.map(a => [a.id, a.title])}/></Field>
                  {t.status !== 'decided' && <Btn small color={C.mint} onClick={() => decide(t, w)}>Arm {w} wins</Btn>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// 4. RAPID RESPONSE
// ══════════════════════════════════════════════════════════════════════════
const TYPO_LABEL = { contraceptive_myth:'Contraceptive myth', fertility_abortion:'Fertility & abortion', anti_cse:'Anti-CSE', faith_healing:'Faith healing', other:'Other' }
const STEPS = [['verified_at','Verified','verified'],['briefed_at','Influencers briefed','briefed'],['first_counter_post_at','Counter-post live','amplified']]

export function CampaignRapid() {
  const [surges, setSurges] = useState(null)
  const [myths, setMyths] = useState([])
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState(null)
  const [brief, setBrief] = useState(null)
  const load = async () => {
    const [s, m, r] = await Promise.all([
      sb.from('campaign_kpi_rapid_response').select('*').order('detected_at', { ascending:false }).limit(60),
      sb.from('campaign_myths').select('*').order('label'),
      sb.from('radar_items').select('id,title,platform,typology,harm_score,url,scanned_at').eq('is_disinfo', true).order('scanned_at', { ascending:false }).limit(8),
    ])
    setSurges(s.data || []); setMyths(m.data || []); setAlerts(r.data || [])
  }
  useEffect(() => { load() }, [])

  const mark = async (s, col, status) => {
    const patch = { [col]: new Date().toISOString() }
    if (status) patch.status = status
    const { error } = await sb.from('campaign_surges').update(patch).eq('id', s.id)
    if (error) toast(errMsg(error), 'red'); else load()
  }
  const setStatus = async (s, status) => {
    const { error } = await sb.from('campaign_surges').update({ status, monitoring_ended_at: ['closed','dismissed'].includes(status) ? new Date().toISOString() : null }).eq('id', s.id)
    if (error) toast(errMsg(error), 'red'); else load()
  }
  const startFrom = (r) => {
    const myth = myths.find(m => m.typology === r.typology)
    setForm({ claim_summary: r.title, platform: r.platform || '', myth_slug: myth?.slug || '', radar_item_ref: r.id, detected_by:'radar' })
  }
  const create = async () => {
    if (!form.claim_summary) { toast('Describe the claim', 'red'); return }
    const { error } = await sb.from('campaign_surges').insert({ ...form, myth_slug: form.myth_slug || null })
    if (error) { toast(errMsg(error), 'red'); return }
    setForm(null); toast('✓ Logged — the clock is running', 'green'); load()
  }

  if (brief) return <BriefBuilder surge={brief} myths={myths} onClose={() => { setBrief(null); load() }}/>

  const within48 = (surges || []).filter(s => s.first_counter_post_at)
  const hit = within48.filter(s => s.within_48h).length

  return (
    <div>
      <SectionLabel color={C.lilac}>Rapid response</SectionLabel>
      <p style={{ ...meta, fontSize:12.5, lineHeight:1.6, maxWidth:640 }}>
        Detect → verify → brief → counter-post. Log a surge when the Radar or a partner flags a claim; press each step as it happens so the
        response time is measured. Target: counter-content live within 48 hours (2 hours is the stretch goal).
      </p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
        <span style={pill(C.mint)}>{hit} of {within48.length} answered within 48h</span>
        <span style={{ flex:1 }}/>
        <Btn small onClick={() => setForm(form ? null : { claim_summary:'', platform:'', myth_slug:'', detected_by:'partner' })}>{form ? 'Close' : '＋ Log a surge'}</Btn>
      </div>
      {form && (
        <div style={card(C.coral)}>
          <Field label="The claim, as it’s circulating"><textarea value={form.claim_summary} onChange={e => setForm({ ...form, claim_summary:e.target.value })} rows={2} style={{ ...inputStyle, resize:'vertical' }}/></Field>
          <div style={grid2}>
            <Field label="Myth"><Select value={form.myth_slug} onChange={v => setForm({ ...form, myth_slug:v || '' })} placeholder="—" options={myths.map(m => [m.slug, m.label])}/></Field>
            <Field label="Where"><input value={form.platform} onChange={e => setForm({ ...form, platform:e.target.value })} placeholder="TikTok, WhatsApp groups…" style={inputStyle}/></Field>
            <Field label="Flagged by"><Select value={form.detected_by} onChange={v => setForm({ ...form, detected_by:v })}
              options={[['radar','Radar'],['partner','Partner'],['influencer','Influencer'],['staff','CoMeT team']]}/></Field>
          </div>
          <Btn onClick={create}>Log surge</Btn>
        </div>
      )}
      {alerts.length > 0 && (
        <details style={{ marginBottom:14 }}>
          <summary style={{ ...lbl, cursor:'pointer' }}>Latest Radar disinformation flags ({alerts.length})</summary>
          {alerts.map(r => (
            <div key={r.id} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.line}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ ...ttl, fontSize:12.5 }}>{r.title}</p>
                <p style={{ ...meta, margin:0 }}>{TYPO_LABEL[r.typology] || r.typology} · {r.platform} · harm {r.harm_score}/10 · {timeAgo(r.scanned_at)}</p>
              </div>
              <Btn small ghost onClick={() => startFrom(r)}>Log as surge</Btn>
            </div>
          ))}
        </details>
      )}
      {surges === null && <Empty>Loading…</Empty>}
      {surges && surges.length === 0 && <Empty>No surges logged yet.</Empty>}
      {(surges || []).map(s => {
        const myth = myths.find(m => m.slug === s.myth_slug)
        const closed = ['closed','dismissed'].includes(s.status)
        return (
          <div key={s.id} style={card(closed ? C.mut : s.first_counter_post_at ? C.mint : C.coral)}>
            <p style={ttl}>{s.claim_summary}</p>
            <p style={meta}>{myth ? myth.label + ' · ' : ''}{s.platform ? s.platform + ' · ' : ''}flagged by {s.detected_by} · {timeAgo(s.detected_at)}
              {s.hours_to_counter != null ? ` · countered in ${s.hours_to_counter}h` : ''}</p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {STEPS.map(([col, label, st]) => s[col]
                ? <span key={col} style={pill(C.mint)}>✓ {label} · {timeAgo(s[col])}</span>
                : !closed && <Btn key={col} small ghost onClick={() => mark(s, col, st)}>{label} now</Btn>)}
              {!closed && <Btn small onClick={() => setBrief(s)}>Build brief</Btn>}
              {!closed && <Btn small ghost onClick={() => setStatus(s, 'closed')}>Close</Btn>}
              {!closed && !s.first_counter_post_at && <Btn small ghost onClick={() => setStatus(s, 'dismissed')}>Dismiss</Btn>}
              {closed && <span style={pill(C.mut)}>{s.status}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BriefBuilder({ surge, myths, onClose }) {
  const myth = myths.find(m => m.slug === surge.myth_slug)
  const [responses, setResponses] = useState([])
  const [assets, setAssets] = useState([])
  const [picked, setPicked] = useState({})
  const [extra, setExtra] = useState('')
  useEffect(() => {
    if (myth) sb.from('disinfo_responses').select('response,language,sources').eq('typology', myth.typology).eq('active', true).order('sort_order').limit(6)
      .then(({ data }) => setResponses(data || []))
    let q = sb.from('campaign_assets').select('id,slug,title,language,audience_facing,visibility').eq('review_status','approved').in('visibility', ['test','public'])
    if (surge.myth_slug) q = q.contains('myth_slugs', [surge.myth_slug])
    q.then(({ data }) => { setAssets(data || []); setPicked(Object.fromEntries((data || []).map(a => [a.id, true]))) })
  }, [surge.id])   // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = assets.filter(a => picked[a.id])
  const text = [
    `⚠️ IMAARISHA RAPID RESPONSE — please post within 48 hours\n`,
    `What’s circulating: ${surge.claim_summary}${surge.platform ? ` (${surge.platform})` : ''}`,
    myth?.verified_fact ? `\nThe facts: ${myth.verified_fact}` : '',
    myth?.sources?.length ? `Sources: ${myth.sources.join(', ')}` : '',
    responses.length ? `\nTalking points:\n${responses.slice(0, 3).map(r => '• ' + r.response).join('\n')}` : '',
    chosen.length ? `\nShare one of these (use YOUR link from the Campaign tab on the hub so we can count it):\n${chosen.map(a => `• ${a.title}${a.audience_facing === 'public' ? ` — ${ukweliAssetUrl(a.slug)}` : ''}`).join('\n')}` : '',
    extra ? `\n${extra}` : '',
    `\nIn your own words. Don’t argue with hostile accounts — post, then step back. When in doubt, call us. Do not post.`,
  ].filter(Boolean).join('\n')

  const markBriefed = async () => {
    if (!surge.briefed_at) await sb.from('campaign_surges').update({ briefed_at: new Date().toISOString(), status:'briefed',
      counter_asset_ids: chosen.map(a => a.id) }).eq('id', surge.id)
    onClose()
  }
  return (
    <div>
      <SectionLabel color={C.lilac}>Brief for the influencer group</SectionLabel>
      <div style={card(C.coral)}>
        <p style={ttl}>{surge.claim_summary}</p>
        {!myth && <p style={{ ...meta, color:C.coral }}>No myth linked — talking points and matching assets need one.</p>}
        <span style={lbl}>Counter-content to include ({assets.length} approved match{assets.length === 1 ? '' : 'es'})</span>
        <MultiChips value={Object.keys(picked).filter(k => picked[k])} options={assets.map(a => [a.id, `${a.title} (${LANG_LABEL[a.language] || a.language})`])}
          onChange={ids => setPicked(Object.fromEntries(assets.map(a => [a.id, ids.includes(a.id)])))} color={C.mint}/>
        <Field label="Add a line (optional)"><textarea value={extra} onChange={e => setExtra(e.target.value)} rows={2} style={{ ...inputStyle, resize:'vertical' }}/></Field>
        <pre style={{ whiteSpace:'pre-wrap', fontFamily:C.sans, fontSize:12.5, lineHeight:1.55, background:C.card2, borderRadius:10, padding:12, color:C.txt, margin:'0 0 10px' }}>{text}</pre>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <Btn onClick={() => copyText(text, 'Brief copied — paste it in the influencer WhatsApp group')}>Copy brief</Btn>
          <Btn color={C.sky} onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener')}>Open in WhatsApp</Btn>
          <Btn color={C.mint} onClick={markBriefed}>{surge.briefed_at ? 'Done' : 'Mark as briefed'}</Btn>
          <Btn ghost onClick={onClose}>Back</Btn>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// 5. DASHBOARD
// ══════════════════════════════════════════════════════════════════════════
function Tile({ label, value, target, note, color = C.sky, pct, pts }) {
  const p = target ? Math.min(100, Math.round(100 * (Number(value) || 0) / target)) : null
  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'12px 14px' }}>
      <p style={{ ...lbl, margin:0 }}>{label}</p>
      <p style={{ fontFamily:C.serif, fontSize:30, fontWeight:700, color:C.txt, margin:'2px 0 2px', lineHeight:1.1 }}>
        {value == null ? '—' : pts ? `${value > 0 ? '+' : ''}${value} pts` : pct ? `${value}%` : fmt(value)}</p>
      {target != null && (
        <>
          <div style={{ height:6, borderRadius:3, background:C.card2, overflow:'hidden', margin:'4px 0 4px' }}
            role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${p}% of target`}>
            <div style={{ width:p + '%', height:'100%', background:color }}/>
          </div>
          <p style={{ ...meta, margin:0 }}>Target {pct ? target + '%' : fmt(target)} · {p}%</p>
        </>
      )}
      {note && <p style={{ ...meta, margin:'3px 0 0' }}>{note}</p>}
    </div>
  )
}

export function CampaignDashboard() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    const q = (v, o) => { let x = sb.from(v).select('*'); if (o) x = x.order(o); return x }
    Promise.all([
      q('campaign_kpi_interactions'), q('campaign_kpi_totals'), q('campaign_kpi_knowledge'),
      q('campaign_kpi_rapid_response'), q('campaign_kpi_partners_monthly', 'month'), q('campaign_kpi_share_of_voice', 'month'),
      q('campaign_kpi_links'), q('campaign_kpi_interactions_monthly', 'month'), q('campaign_kpi_reach_monthly', 'month'), q('campaign_kpi_assets'),
    ]).then(([i, t, k, r, p, s, l, im, rm, as]) => {
      const e = [i, t].find(x => x.error)
      if (e) { setErr(errMsg(e.error)); return }
      setD({ i: i.data?.[0] || {}, t: t.data?.[0] || {}, k: k.data || [], r: r.data || [], p: p.data || [], s: s.data || [],
        l: (l.data || []).sort((a, b) => (b.clicks || 0) - (a.clicks || 0)), im: im.data || [], rm: rm.data || [], as: as.data || [] })
    })
  }, [])
  if (err) return <p style={{ ...meta, color:C.coral }}>{err}</p>
  if (!d) return <Empty>Loading…</Empty>

  const wave = (w) => d.k.find(x => x.wave === w && !x.county)
  const base = wave('baseline'), post = wave('endline') || wave('post')
  const change = base && post ? Math.round((post.pct_correct - base.pct_correct) * 10) / 10 : null
  const sovLast = d.s.length ? d.s[d.s.length - 1] : null
  const countered = d.r.filter(x => x.first_counter_post_at)
  const latestP = d.p.length ? d.p[d.p.length - 1] : null

  const exportCsv = () => {
    const rows = [['section','label','value','target']]
    rows.push(['IA2.1','engaged on our sites', d.i.engaged_sessions_onsite, ''], ['IA2.1','off-site link visitors', d.i.offsite_link_visitors, ''],
      ['IA2.1','interactions (estimate)', d.i.interactions_estimate, d.i.target_ia21])
    Object.entries(d.t).filter(([k]) => !k.startsWith('target_')).forEach(([k, v]) => rows.push(['totals', k, v, d.t['target_' + k.replace(/^reported_/, '').replace('whatsapp_channel_followers','whatsapp_subscribers')] ?? '']))
    d.k.forEach(x => rows.push(['knowledge', `${x.wave}${x.county ? ' · ' + x.county : ''} (n=${x.respondents})`, `${x.pct_correct}% correct; ${x.pct_knows_how_to_claim}% know how to claim`, '']))
    d.s.forEach(x => rows.push(['share of voice', x.month, x.pct_positive ?? x.radar_index_positive_share, x.target_pct]))
    d.p.forEach(x => rows.push(['partners distributing', x.month, x.partners_distributing, x.target_distributing]))
    d.r.forEach(x => rows.push(['rapid response', x.claim_summary, x.hours_to_counter ?? 'open', '48h']))
    d.rm.forEach(x => rows.push(['reach', `${x.month} · ${x.platform} · ${x.source}`, x.impressions ?? x.views ?? '', '']))
    d.l.forEach(x => rows.push(['links', `${x.voice || ''} · ${x.code}`, x.clicks, '']))
    const csv = rows.map(r => r.map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }))
    a.download = `imaarisha-campaign_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const gridT = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10, marginBottom:18 }
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <SectionLabel color={C.lilac}>Campaign dashboard</SectionLabel>
        <span style={{ flex:1 }}/>
        <Btn small ghost onClick={exportCsv}>⬇ CSV for ME3</Btn>
      </div>

      <p style={lbl}>Donor indicator IA2.1</p>
      <div style={gridT}>
        <Tile label="People engaged (IA2.1)" value={d.i.interactions_estimate} target={d.i.target_ia21} color={C.gold}
          note={`${fmt(d.i.engaged_sessions_onsite)} on our sites + ${fmt(d.i.offsite_link_visitors)} via links`}/>
        <Tile label="Know how to claim SRHR" value={post?.pct_knows_how_to_claim ?? null} target={15} pct color={C.mint}
          note={post ? `After (n=${post.respondents}) · before ${base?.pct_knows_how_to_claim ?? '—'}%` : 'Needs after-quiz responses'}/>
        <Tile label="Knowledge change" value={change} pts note={base ? `Before ${base.pct_correct}% → after ${post?.pct_correct ?? '—'}% · target +15 pts` : 'Needs before & after responses'}/>
      </div>

      <p style={lbl}>Reach</p>
      <div style={gridT}>
        <Tile label="Impressions" value={d.t.impressions} target={d.t.target_impressions}/>
        <Tile label="Unique reach (reported)" value={d.t.reported_unique_reach} target={d.t.target_unique_reach}/>
        <Tile label="TikTok views" value={d.t.tiktok_views} target={d.t.target_tiktok_views}/>
        <Tile label="YouTube views" value={d.t.youtube_views} target={d.t.target_youtube_views}/>
        <Tile label="WhatsApp Channel" value={d.t.whatsapp_channel_followers} target={d.t.target_whatsapp_subscribers}/>
      </div>

      <p style={lbl}>Trust & response</p>
      <div style={gridT}>
        <Tile label="Positive SRHR content" value={sovLast ? (sovLast.pct_positive ?? sovLast.radar_index_positive_share) : null} target={8} pct color={C.mint}
          note={`Baseline 3.6% · ${sovLast ? sovLast.month.slice(0, 7) : 'no Radar data'}`}/>
        <Tile label="Active influencer voices" value={d.t.active_voices} target={d.t.target_active_voices}/>
        <Tile label="Surges answered ≤48h" value={countered.filter(x => x.within_48h).length} note={`of ${countered.length} countered · ${d.r.length - countered.length} open`}/>
        <Tile label="Partners distributing" value={latestP?.partners_distributing ?? null} target={8} note={latestP ? latestP.month.slice(0, 7) : 'No check-ins yet'}/>
      </div>

      <p style={lbl}>Top links</p>
      {d.l.slice(0, 10).map(x => (
        <div key={x.code} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.line}`, fontFamily:C.sans, fontSize:12.5 }}>
          <span style={{ flex:1, minWidth:0, overflowWrap:'anywhere' }}><b>{x.voice || '—'}</b> · {x.asset || 'Ukweli'} · {x.channel}</span>
          <span style={{ color:C.mut }}>{fmt(x.clicks)} clicks · {fmt(x.sessions_landed)} on Ukweli</span>
        </div>
      ))}
      {d.l.length === 0 && <Empty>No links yet.</Empty>}

      <p style={{ ...lbl, marginTop:16 }}>Assets</p>
      {d.as.filter(x => x.sessions > 0).sort((a, b) => b.sessions - a.sessions).slice(0, 12).map(x => (
        <div key={x.asset_id} style={{ display:'flex', gap:8, padding:'6px 0', borderBottom:`1px solid ${C.line}`, fontFamily:C.sans, fontSize:12.5 }}>
          <span style={{ flex:1, minWidth:0 }}><b>{x.master_title}</b>{x.slug !== x.master_title ? ` · ${KIND_LABEL[x.kind] || x.kind}` : ''}</span>
          <span style={{ color:C.mut }}>{fmt(x.sessions)} people · {fmt(x.half_or_more)} half+ · {fmt(x.downloads)} downloads · {fmt(x.shares)} shares</span>
        </div>
      ))}
      {d.as.every(x => !x.sessions) && <Empty>No plays yet — numbers appear once assets are public on Ukweli.</Empty>}
    </div>
  )
}
