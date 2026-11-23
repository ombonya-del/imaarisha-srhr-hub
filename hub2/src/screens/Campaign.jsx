import { useState, useEffect } from 'react'
import { sb, C, toast, timeAgo } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Chip, Btn, inputStyle } from '../lib/components'
import { MetricsForm, KIND_LABEL, LANG_LABEL, assetFileUrl, youtubeUrl, ukweliAssetUrl, goLink, copyText, UKWELI_URL } from '../lib/campaign'

// ── 📢 Campaign — the partner & influencer side of the digital campaign ──────
// Campaign Kit (released media and its cut-downs), your own tracked links,
// the monthly report, the myths we're countering, and the campaign pulse.

const fmt = (n) => n == null ? '—' : Number(n).toLocaleString('en-KE')
const card = (c = C.gold) => ({ background:C.card, border:`1px solid ${C.line}`, borderLeft:`3px solid ${c}`, borderRadius:12, padding:14, marginBottom:10 })
const ttl = { fontFamily:C.sans, fontSize:14, fontWeight:800, color:C.txt, margin:'0 0 2px', overflowWrap:'anywhere' }
const meta = { fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 6px', lineHeight:1.5 }
const lbl = { display:'block', fontFamily:C.sans, fontSize:10.5, fontWeight:800, color:C.mut, margin:'2px 0 4px' }

export default function Campaign({ session }) {
  const [pulse, setPulse] = useState(null)
  const [assets, setAssets] = useState(null)
  const [myths, setMyths] = useState([])
  const [voice, setVoice] = useState(null)
  const [links, setLinks] = useState([])
  const [lang, setLang] = useState('all')
  const [openM, setOpenM] = useState(null)
  const [report, setReport] = useState(false)

  useEffect(() => {
    sb.rpc('campaign_public_pulse').then(({ data }) => setPulse(data || null))
    sb.from('campaign_assets').select('*').in('visibility', ['test','public']).eq('review_status', 'approved')
      .order('series', { nullsFirst:true }).order('episode_no').then(({ data }) => setAssets(data || []))
    sb.from('campaign_myths').select('*').order('myth_of_month', { ascending:false, nullsFirst:false }).then(({ data }) => setMyths(data || []))
    if (session?.user) sb.from('campaign_voices').select('*').eq('contact_user_id', session.user.id).maybeSingle().then(({ data }) => {
      setVoice(data || null)
      if (data) sb.from('campaign_links').select('*').eq('voice_id', data.id).eq('active', true).order('created_at', { ascending:false })
        .then(({ data: l }) => setLinks(l || []))
    })
  }, [session?.user?.id])

  const masters = (assets || []).filter(a => !a.parent_id || !(assets || []).some(m => m.id === a.parent_id))
  const kidsOf = (id) => (assets || []).filter(a => a.parent_id === id)
  const langs = [...new Set((assets || []).map(a => a.language))]
  const inLang = (a) => lang === 'all' || a.language === lang || a.language === 'multi'
  const linkFor = (a) => links.find(l => l.asset_id === a.id)
  const shareUrl = (a) => {
    const l = linkFor(a)
    if (l) return goLink(l.code)
    if (a.audience_facing !== 'public') return null
    return voice ? `${UKWELI_URL}/?ref=${voice.code}#learn/m-${a.slug}` : ukweliAssetUrl(a.slug)
  }
  const thisMonth = myths.find(m => m.myth_of_month && m.myth_of_month.slice(0, 7) === new Date().toISOString().slice(0, 7))

  return (
    <div>
      <ScreenTitle kicker="📢 Digital campaign · #ImaarishaSRHR" title="Campaign" accent={C.coral}
        sub="The Imaarisha videos, Conversations episodes and field guide — ready to share in your own words, with links that show what your sharing achieves."/>

      {pulse && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10, marginBottom:20 }}>
          {[['People engaged', pulse.people_engaged], ['Impressions (verified)', pulse.impressions], ['Active voices', pulse.active_voices],
            ['Myths countered', pulse.myths_countered], ['Resources released', pulse.resources_public]].map(([l, v]) => (
            <div key={l} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:12, padding:'10px 12px' }}>
              <p style={{ ...lbl, margin:0 }}>{l}</p>
              <p style={{ fontFamily:C.serif, fontSize:28, fontWeight:700, color:C.txt, margin:0, lineHeight:1.15 }}>{fmt(v)}</p>
            </div>
          ))}
        </div>
      )}

      {thisMonth && (
        <div style={card(C.coral)}>
          <SectionLabel color={C.coral}>Myth of the month</SectionLabel>
          <p style={ttl}>“{thisMonth.false_claim || thisMonth.label}”</p>
          {thisMonth.verified_fact && <p style={{ ...meta, color:C.txt, fontSize:13 }}><b>The facts:</b> {thisMonth.verified_fact}</p>}
          {thisMonth.sources?.length > 0 && <p style={meta}>Sources: {thisMonth.sources.join(', ')}</p>}
        </div>
      )}

      {voice && (
        <div style={{ ...card(C.mint), marginBottom:20 }}>
          <SectionLabel color={C.mint}>Your campaign links · {voice.display_name}</SectionLabel>
          <p style={meta}>Use these instead of plain links — they’re how we count what your posts achieve. Same content, your own link.</p>
          {links.length === 0 && <p style={meta}>No links yet — the CoMeT team will add them. Meanwhile, the share buttons below already carry your code.</p>}
          {links.map(l => {
            const a = (assets || []).find(x => x.id === l.asset_id)
            return (
              <div key={l.code} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.line}`, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:180 }}>
                  <p style={{ ...ttl, fontSize:12.5 }}>{a ? a.title : 'Ukweli'} <span style={{ ...meta, fontWeight:400 }}>· for {l.channel}</span></p>
                  <p style={{ ...meta, margin:0, overflowWrap:'anywhere' }}><code>{goLink(l.code)}</code></p>
                </div>
                <Btn small ghost onClick={() => copyText(goLink(l.code), 'Link copied')}>Copy</Btn>
              </div>
            )
          })}
          <div style={{ marginTop:12 }}>
            <Btn small onClick={() => setReport(!report)}>{report ? 'Close' : voice.voice_type === 'partner_org' ? '📝 Monthly check-in' : '📝 Send this month’s numbers'}</Btn>
          </div>
          {report && (voice.voice_type === 'partner_org'
            ? <CheckinForm voice={voice} onDone={() => setReport(false)}/>
            : <div style={{ marginTop:10 }}><MetricsForm source={voice.voice_type === 'radio_station' ? 'radio_report' : 'influencer_report'} voiceId={voice.id} onDone={() => setReport(false)}/></div>)}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginBottom:10 }}>
        <SectionLabel color={C.gold}>Campaign kit</SectionLabel>
        <span style={{ flex:1 }}/>
        {langs.length > 1 && [['all','All languages'], ...langs.map(l => [l, LANG_LABEL[l] || l])].map(([k, l]) =>
          <Chip key={k} active={lang === k} color={C.gold} onClick={() => setLang(k)}>{l}</Chip>)}
      </div>
      {assets === null && <p style={meta}>Loading…</p>}
      {assets && assets.length === 0 && <p style={meta}>Nothing released yet. Approved media appears here as soon as the team releases it.</p>}
      {masters.filter(m => inLang(m) || kidsOf(m.id).some(inLang)).map(m => {
        const kids = kidsOf(m.id).filter(inLang)
        const isOpen = openM === m.id
        return (
          <div key={m.id} style={card(m.visibility === 'test' ? C.lilac : C.gold)}>
            <KitItem a={m} shareUrl={shareUrl(m)} big/>
            {kids.length > 0 && (
              <>
                <button onClick={() => setOpenM(isOpen ? null : m.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'8px 0 0',
                  fontFamily:C.sans, fontSize:12, fontWeight:800, color:C.sky }}>{isOpen ? '▾' : '▸'} {kids.length} ready-to-post cut-down{kids.length > 1 ? 's' : ''}</button>
                {isOpen && <div style={{ marginTop:8, paddingLeft:12, borderLeft:`2px solid ${C.line}` }}>
                  {kids.map(k => <div key={k.id} style={{ padding:'8px 0', borderBottom:`1px solid ${C.line}` }}><KitItem a={k} shareUrl={shareUrl(k)}/></div>)}
                </div>}
              </>
            )}
          </div>
        )
      })}

      <p style={{ ...meta, marginTop:18, maxWidth:620 }}>
        Post in your own words. Don’t argue with hostile accounts — share, then step back. Testimonials stay anonymous unless the person
        has agreed in writing. When in doubt, call us. Do not post.
      </p>
    </div>
  )
}

function KitItem({ a, shareUrl, big }) {
  const file = assetFileUrl(a)
  const yt = youtubeUrl(a)
  const text = `${a.title}${a.summary ? ' — ' + a.summary : ''}`
  return (
    <div>
      <p style={{ ...ttl, fontSize: big ? 14.5 : 13 }}>{a.title}</p>
      <p style={meta}>{KIND_LABEL[a.kind] || a.kind} · {LANG_LABEL[a.language] || a.language}{a.series ? ` · ${a.series}` : ''}
        {a.visibility === 'test' ? ' · test run' : ''}{a.audience_facing === 'partners' ? ' · for partners' : ''}</p>
      {a.summary && <p style={{ ...meta, color:C.txt, fontSize:12.5 }}>{a.summary}</p>}
      {a.winning_frame && <p style={{ ...meta, color:C.mint }}>✓ Tested: {a.winning_frame}</p>}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {yt && <a href={yt} target="_blank" rel="noopener noreferrer" style={btnLink(C.coral)}>▶ Watch</a>}
        {file && !yt && <a href={file} target="_blank" rel="noopener noreferrer" download style={btnLink(C.sky)}>⬇ {/\.pdf/i.test(file) ? 'PDF' : 'Download'}</a>}
        {shareUrl && <button onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(`${text}\n${shareUrl}`), '_blank', 'noopener')} style={{ ...btnLink(C.mint), border:'none', cursor:'pointer' }}>WhatsApp</button>}
        {shareUrl && <button onClick={() => copyText(shareUrl, 'Your link copied')} style={{ ...btnLink(C.mut), border:'none', cursor:'pointer' }}>Copy link</button>}
      </div>
    </div>
  )
}
const btnLink = (c) => ({ display:'inline-flex', alignItems:'center', minHeight:34, padding:'0 12px', borderRadius:17, background:c + '1c', color:c,
  fontFamily:C.sans, fontSize:12, fontWeight:800, textDecoration:'none' })

function CheckinForm({ voice, onDone }) {
  const d = new Date()
  const month = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10)
  const [f, setF] = useState({ month, distributed:true, items_distributed:'', people_reached_est:'', service_referrals:'', evidence_used_in:'', observations:'', testimonials:'' })
  const [busy, setBusy] = useState(false)
  const num = (v) => v === '' ? null : Number(String(v).replace(/[, ]/g, ''))
  const save = async () => {
    setBusy(true)
    const { error } = await sb.from('campaign_partner_checkins').upsert({ voice_id:voice.id, month:f.month, distributed:f.distributed,
      items_distributed:num(f.items_distributed), people_reached_est:num(f.people_reached_est), service_referrals:num(f.service_referrals),
      evidence_used_in:f.evidence_used_in || null, observations:f.observations || null, testimonials:f.testimonials || null }, { onConflict:'voice_id,month' })
    setBusy(false)
    if (error) { toast(error.message, 'red'); return }
    toast('✓ Check-in sent — thank you', 'green'); onDone()
  }
  const inp = (k, ph) => <input inputMode="numeric" value={f[k]} placeholder={ph} onChange={e => setF({ ...f, [k]:e.target.value })} style={inputStyle}/>
  return (
    <div style={{ marginTop:12, background:C.card2, borderRadius:10, padding:12 }}>
      <label style={lbl}>Month</label>
      <input type="month" value={f.month.slice(0, 7)} onChange={e => setF({ ...f, month:e.target.value + '-01' })} style={inputStyle}/>
      <label style={lbl}>Did you share campaign content this month?</label>
      <div style={{ display:'flex', gap:6, marginBottom:10 }}>
        <Chip active={f.distributed} color={C.mint} onClick={() => setF({ ...f, distributed:true })}>Yes</Chip>
        <Chip active={!f.distributed} color={C.coral} onClick={() => setF({ ...f, distributed:false })}>Not this month</Chip>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:'0 10px' }}>
        <div><label style={lbl}>Items shared</label>{inp('items_distributed', '—')}</div>
        <div><label style={lbl}>People reached (estimate)</label>{inp('people_reached_est', '—')}</div>
        <div><label style={lbl}>Referrals to SRHR services</label>{inp('service_referrals', '—')}</div>
      </div>
      <label style={lbl}>Where did you use the Imaarisha evidence? (advocacy, meetings, statements)</label>
      <textarea rows={2} value={f.evidence_used_in} onChange={e => setF({ ...f, evidence_used_in:e.target.value })} style={{ ...inputStyle, resize:'vertical' }}/>
      <label style={lbl}>What are your frontline staff hearing?</label>
      <textarea rows={2} value={f.observations} onChange={e => setF({ ...f, observations:e.target.value })} style={{ ...inputStyle, resize:'vertical' }}/>
      <label style={lbl}>A testimonial (anonymised — no names or identifying details)</label>
      <textarea rows={2} value={f.testimonials} onChange={e => setF({ ...f, testimonials:e.target.value })} style={{ ...inputStyle, resize:'vertical' }}/>
      <Btn disabled={busy} onClick={save}>{busy ? 'Sending…' : 'Send check-in'}</Btn>
    </div>
  )
}
