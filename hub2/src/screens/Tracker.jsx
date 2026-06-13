import { useState, useEffect } from 'react'
import { sb, C, logActivity, toast } from '../lib/supabase'
import { ScreenTitle, SectionLabel, Btn, inputStyle } from '../lib/components'

// ── Static indicator metadata (trend, sources, leading counties, partner orgs, note)
// Ported verbatim from the legacy imaarishasrhr.org hub. Merged by indicator name
// onto whatever the live `tracker_indicators` table returns.
const META = {
  'Family Planning Coverage': {
    trend: [{q:'Q2 2025',val:50},{q:'Q3 2025',val:51},{q:'Q4 2025',val:52},{q:'Q1 2026',val:53}],
    sources: [
      { label:'FEMNET — SRHR at a Glance Kenya Fact Sheet 2022', url:'https://www.femnet.org/wp-content/uploads/2022/12/Kenya-Factsheet_2022.pdf' },
      { label:'KDHS 2022 Summary Report — KNBS (Pg 6)', url:'https://www.knbs.or.ke/wp-content/uploads/2023/08/Kenya-Demographic-and-Health-Survey-KDHS-2022-Summary-Report.pdf' },
      { label:'FP2030 Kenya Commitment Document', url:'https://www.fp2030.org/app/uploads/2023/08/Kenya_FP2030Commitment.pdf' },
      { label:'AFIDEP — Factsheet on Contraception in Kenya', url:'https://afidep.org/publication/factsheet-on-contraception-in-kenya/' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Meru'],
    orgs: ['AfyAfrika','SRHR Alliance','Zamara Foundation','Men Engage Kenya'],
    note: 'Modern contraceptive prevalence rate (mCPR) among women aged 15–49. Value: 53% per FEMNET Kenya Country Factsheet 2022. Unmet need for contraception remains at 25%.',
  },
  'SRHR Disinformation Index': {
    trend: [{q:'Q2 2025',val:21},{q:'Q3 2025',val:18},{q:'Q4 2025',val:15},{q:'Q1 2026',val:12}],
    sources: [
      { label:'Piga Firimbi — Kenya Fact-Checking Network', url:'https://www.pigafirimbi.com' },
      { label:'Africa Uncensored — Disinformation Tracking', url:'https://africauncensored.online' },
      { label:'RPUBLC — Right-Wing Misinformation in Kenya (May 2025)', url:'https://rpublc.com/april-may-2025/right-wing-misinformation-kenya' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Narok','Homa Bay'],
    orgs: ['Activate Action','SRHR Alliance','CYAN','NAYA'],
    note: 'Number of active SRHR disinformation claims tracked across network counties. A downward trend is positive.',
  },
  'Youth SRHR Services': {
    trend: [{q:'Q2 2025',val:280},{q:'Q3 2025',val:290},{q:'Q4 2025',val:300},{q:'Q1 2026',val:312}],
    sources: [
      { label:'HAI — Adolescent Friendly Health Services in Kenya (2023)', url:'https://haiweb.org/storage/2023/07/HCW-Survey-Report_Kenya_2023_FINAL.pdf' },
      { label:'FEMNET — SRHR at a Glance Kenya Fact Sheet 2022', url:'https://www.femnet.org/wp-content/uploads/2022/12/Kenya-Factsheet_2022.pdf' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Machakos','Kilifi'],
    orgs: ['NAYA','CYAN','Activate Action','Zana Africa'],
    note: 'Number of operational youth-friendly health facilities across Kenya.',
  },
  'GBV Response Coverage': {
    trend: [{q:'Q2 2025',val:24},{q:'Q3 2025',val:26},{q:'Q4 2025',val:28},{q:'Q1 2026',val:29}],
    sources: [
      { label:'NCAJ — Technical Working Group Report on GBV Including Femicide (Pg 8–9)', url:'https://home.creaw.org/wp-content/uploads/2026/02/10/Technical%20Working%20Group%20Report%20on%20GBV%20Including%20Femicide.pdf' },
      { label:"JHU — GBV 2024 Women's Data County Dissemination Brief", url:'https://publichealth.jhu.edu/sites/default/files/2025-10/Agile-2.0-2024-Women-s-Data-County-Specific-Dissemination-Brief-BUNGOMA.pdf' },
      { label:'KNCHR — Submissions on GBV Including Femicide in Kenya', url:'https://www.knchr.org/Portals/0/Submissions%20on%20Gender-Based%20Violence%20GBV%20Including%20Femicide%20in%20Kenya.pdf' },
      { label:'KDHS 2022 Key Indicators Report — KNBS', url:'https://www.knbs.or.ke/wp-content/uploads/2023/08/Kenya-Demographic-and-Health-Survey-2022-Key-Indicators-Report.pdf' },
      { label:'ICRW — Generation Equality Forum: Kenya GBV & FGM Roadmap', url:'https://www.icrw.org/wp-content/uploads/2021/06/GEF_Kenya_GBV_summary-05.21-web.pdf' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret'],
    orgs: ['Men Engage Kenya','MMAAK','This Ability Trust','Beyond Initiative'],
    note: 'Counties with functional GBV response capacity. FEMNET 2022: IPV prevalence at 25.1% of women aged 15–49 in the past 12 months.',
  },
  'Access to SRHR Services': {
    trend: [{q:'Q2 2025',val:52},{q:'Q3 2025',val:53},{q:'Q4 2025',val:55},{q:'Q1 2026',val:56}],
    sources: [
      { label:'FEMNET — SRHR at a Glance Kenya Fact Sheet 2022', url:'https://www.femnet.org/wp-content/uploads/2022/12/Kenya-Factsheet_2022.pdf' },
      { label:'Kenya Master Health Facility List — MoH', url:'https://kmhfl.health.go.ke/' },
      { label:'PMC — Access to Adolescent & Youth SRHR Services in Coastal Kenya (2024)', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10870511/pdf/12889_2024_Article_17999.pdf' },
    ],
    counties: ['Nairobi','Kisumu','Mombasa','Turkana','Mandera'],
    orgs: ['AfyAfrika','Secny CBO','Beyond Initiative','Zamara Foundation'],
    note: 'Universal Health Coverage index for Kenya. Value: 56% per FEMNET Kenya Country Factsheet 2022. Health expenditure: 4.6% of GDP.',
  },
  'Youth Friendliness of SRHR Facilities': {
    trend: [{q:'Q2 2025',val:32},{q:'Q3 2025',val:34},{q:'Q4 2025',val:36},{q:'Q1 2026',val:38}],
    sources: [
      { label:'WHO — Adolescent Friendly Health Services Assessment Checklist', url:'https://iris.who.int/server/api/core/bitstreams/7b1527b3-efa1-480f-8242-234a8d37690d/content' },
      { label:'World Bank — Kenya Health Service Delivery Indicator Survey 2018', url:'https://documents1.worldbank.org/curated/en/099430110062245298/pdf/IDU1b312d25b13d0a14c7f1b33c18786382b28ed.pdf' },
      { label:'YSW Kenya — Youth-Friendly SRHR Services Fact Sheet', url:'https://yswkenya.org/wp-content/uploads/2025/11/Youth-friendly-sexual-and-reproductive-health-services-fact-sheet.pdf-.pdf' },
      { label:'HAI — Adolescent Friendly Health Services in Kenya (2023)', url:'https://haiweb.org/storage/2023/07/HCW-Survey-Report_Kenya_2023_FINAL.pdf' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Machakos'],
    orgs: ['NAYA','CYAN','Activate Action','Zana Africa','This Ability Trust'],
    note: 'Percentage of SRHR facilities meeting WHO youth-friendly standards. FEMNET 2022: ANC (4+ visits) = 76%; skilled birth attendance = 70 per 100.',
  },
  'Young Girls Accessing Safe Abortion': {
    trend: [{q:'Q2 2025',val:18},{q:'Q3 2025',val:20},{q:'Q4 2025',val:21},{q:'Q1 2026',val:23}],
    sources: [
      { label:'JSTOR — Unintended Pregnancies, Unsafe Abortion & Maternal Mortality in Kenya', url:'https://www.jstor.org/stable/26214800' },
      { label:'SCIRP — Social & Structural Determinants of Unsafe Abortion in Kibera', url:'https://www.scirp.org/journal/paperinformation?paperid=113845' },
      { label:'MoH, APHRC, Guttmacher, IPAS — Incidence of Induced Abortions in Kenya', url:'https://aphrc.org/wp-content/uploads/2025/05/Policy-Brief-A_Online-Version.pdf' },
      { label:'FEMNET — SRHR at a Glance Kenya Fact Sheet 2022', url:'https://www.femnet.org/wp-content/uploads/2022/12/Kenya-Factsheet_2022.pdf' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Machakos'],
    orgs: ['NAYA','CYAN','Activate Action','Zana Africa'],
    note: 'Girls aged 10–19 accessing safe, legal abortion services under Article 26 of the Kenya Constitution. Adolescent fertility rate: 71.98 births per 1,000 women aged 15–19.',
  },
  'Women Accessing Safe Abortion': {
    trend: [{q:'Q2 2025',val:26},{q:'Q3 2025',val:28},{q:'Q4 2025',val:29},{q:'Q1 2026',val:31}],
    sources: [
      { label:'Center for Reproductive Rights — The Abortion Landscape in Kenya', url:'https://reproductiverights.org/resources/kenya-abortion/' },
      { label:'Center for Reproductive Rights — A Decade of Existence (2020)', url:'https://reproductiverights.org/sites/default/files/documents/A-Decade-of-Existence-Kenya_0.pdf' },
      { label:"3W Kenya — Safe Abortion in Kenya: Who's Really Seeking Care?", url:'https://3wkenya.org/safe-abortion-in-kenya/' },
      { label:'APHRC, MoH, Guttmacher — Incidence of Induced Abortions in Kenya', url:'https://aphrc.org/wp-content/uploads/2025/05/Policy-Brief-A_Online-Version.pdf' },
      { label:'IPAS Africa — Medical Abortion Self Use in Kenya', url:'https://www.medrxiv.org/content/10.1101/2022.11.10.22282174v1.full.pdf' },
      { label:'Marie Stopes Kenya — Capacity Statement 2024', url:'https://mariestopes.or.ke/wp-content/uploads/sites/10/2024/08/2024-CStatement-Final-Ed-1.pdf' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Kiambu','Eldoret'],
    orgs: ['SRHR Alliance','AfyAfrika','Beyond Initiative','Zamara Foundation'],
    note: 'Women aged 20–49 accessing safe, legal abortion under Kenya Constitution Article 26. Post-abortion national guidelines are in place.',
  },
  'Deaths from Unsafe Abortion': {
    trend: [{q:'Q2 2025',val:18},{q:'Q3 2025',val:17},{q:'Q4 2025',val:15},{q:'Q1 2026',val:14}],
    sources: [
      { label:"International Campaign for Women's Rights to Safe Abortion — Kenya", url:'https://www.safeabortionwomensright.org/news/kenya-health-experts-warn-restrictive-policy-will-drive-more-women-toward-unsafe-abortions/' },
      { label:'Global Financing Facility — Kenya RMNCAH-N Investment Case 2025–2030', url:'https://www.globalfinancingfacility.org/sites/default/files/Kenya-RMNCAH-N-IC-2025-2030.pdf' },
      { label:'FEMNET — SRHR at a Glance Kenya Fact Sheet 2022', url:'https://www.femnet.org/wp-content/uploads/2022/12/Kenya-Factsheet_2022.pdf' },
    ],
    counties: ['Nairobi','Turkana','Mandera','Wajir','Kilifi'],
    orgs: ['SRHR Alliance','AfyAfrika','Men Engage Kenya','Secny CBO'],
    note: 'Percentage of maternal deaths attributed to unsafe abortion. A downward trend is positive. FEMNET 2022: Maternal Mortality Ratio = 342 per 100,000 live births.',
  },
  'Access to Quality SRHR Information': {
    trend: [{q:'Q2 2025',val:55},{q:'Q3 2025',val:57},{q:'Q4 2025',val:59},{q:'Q1 2026',val:60}],
    sources: [
      { label:'FEMNET — SRHR at a Glance Kenya Fact Sheet 2022', url:'https://www.femnet.org/wp-content/uploads/2022/12/Kenya-Factsheet_2022.pdf' },
      { label:'Center for Reproductive Rights — Access to SRHR Information by Women & Girls in Kenya', url:'https://reproductiverights.org/resources/kenya-access-to-srhr-information-women-girls/' },
      { label:'KHRC — Who Shapes the Narrative? Media Coverage of SRHR in Kenya (2024)', url:'https://khrc.or.ke/wp-content/uploads/2024/11/Media-coverage-analysis-of-SRHR-in-Kenya-October-2023-to-June-2024b-1.pdf' },
      { label:'PMC — Age & Gender Divide in Digital SRHR Platforms in Kenya', url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC10783845/pdf/ZRHM_31_2291908.pdf' },
    ],
    counties: ['Nairobi','Mombasa','Kisumu','Nakuru','Nyeri','Eldoret'],
    orgs: ['NAYA','Activate Action','CYAN','This Ability Trust','Zana Africa'],
    note: 'Comprehensive knowledge of HIV/AIDS and SRHR. Value: ~60% per FEMNET Kenya Country Factsheet 2022. Higher among young men (63.7%) than young women (56.6%) aged 15–24.',
  },
}

// ── Fallback indicator list — used only if the live `tracker_indicators` table
// is empty or unreachable, so the scorecard always renders. When the live table
// is present, its admin-curated values take precedence.
const FALLBACK = [
  { id:'fb1',  name:'Family Planning Coverage',              subtitle:'Modern contraceptive prevalence (mCPR), women 15–49', current_value:53,  target_value:70, unit:'%',     progress_pct:76, higherIsBetter:true },
  { id:'fb2',  name:'SRHR Disinformation Index',             subtitle:'Active disinfo claims tracked (lower is better)',     current_value:12,  target_value:10, unit:'claims',progress_pct:80, higherIsBetter:false },
  { id:'fb3',  name:'Youth SRHR Services',                   subtitle:'Operational youth-friendly facilities',               current_value:312, target_value:400,unit:'',      progress_pct:78, higherIsBetter:true },
  { id:'fb4',  name:'GBV Response Coverage',                 subtitle:'Counties with functional GBV response',              current_value:29,  target_value:47, unit:'counties',progress_pct:62, higherIsBetter:true },
  { id:'fb5',  name:'Access to SRHR Services',               subtitle:'UHC service coverage index',                          current_value:56,  target_value:80, unit:'%',     progress_pct:70, higherIsBetter:true },
  { id:'fb6',  name:'Youth Friendliness of SRHR Facilities', subtitle:'Facilities meeting WHO youth-friendly standards',     current_value:38,  target_value:75, unit:'%',     progress_pct:51, higherIsBetter:true },
  { id:'fb7',  name:'Young Girls Accessing Safe Abortion',   subtitle:'Girls 10–19 accessing safe, legal services (Art. 26)',current_value:23,  target_value:50, unit:'%',     progress_pct:46, higherIsBetter:true },
  { id:'fb8',  name:'Women Accessing Safe Abortion',         subtitle:'Women 20–49 accessing safe, legal services (Art. 26)',current_value:31,  target_value:60, unit:'%',     progress_pct:52, higherIsBetter:true },
  { id:'fb9',  name:'Deaths from Unsafe Abortion',           subtitle:'Share of maternal deaths from unsafe abortion (lower is better)', current_value:14, target_value:5, unit:'%', progress_pct:70, higherIsBetter:false },
  { id:'fb10', name:'Access to Quality SRHR Information',    subtitle:'Comprehensive SRHR/HIV knowledge',                    current_value:60,  target_value:85, unit:'%',     progress_pct:71, higherIsBetter:true },
]

const pctOf = (ind) => {
  if (ind.progress_pct != null) return Math.max(0, Math.min(100, ind.progress_pct))
  if (!ind.target_value) return 0
  return Math.max(0, Math.min(100, Math.round((ind.current_value / ind.target_value) * 100)))
}
const valLabel = (ind) => `${ind.current_value}${ind.unit === '%' ? '%' : ''}`

export default function Tracker({ session }) {
  const [rows, setRows] = useState(null)   // null = loading
  const [usingFallback, setUsingFallback] = useState(false)
  const [open, setOpen] = useState(null)
  const [submitFor, setSubmitFor] = useState(null)

  const load = () => {
    sb.from('tracker_indicators').select('*').order('sort_order')
      .then(({ data, error }) => {
        if (!error && data && data.length) { setRows(data); setUsingFallback(false) }
        else { setRows(FALLBACK); setUsingFallback(true) }
      })
      .catch(() => { setRows(FALLBACK); setUsingFallback(true) })
  }
  useEffect(load, [])

  return (
    <div>
      <ScreenTitle
        kicker="● County Accountability Scorecard"
        title="SRHR Tracker"
        sub="Ten SRHR indicators tracked quarterly across the network — each tile opens to reveal the trend, the data sources behind the number, the leading counties, and the partner organisations contributing data."
        accent={C.mint}
      />

      {usingFallback && (
        <div style={{ background:C.goldDim, border:`1px solid ${C.gold}`, borderRadius:10,
          padding:'10px 14px', marginBottom:14 }}>
          <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.txt, margin:0, lineHeight:1.5 }}>
            Showing the baseline reference figures. Live network-submitted values appear here automatically
            once the <code>tracker_indicators</code> table is seeded in Supabase.
          </p>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, gap:10, flexWrap:'wrap' }}>
        <SectionLabel color={C.mint}>Indicators — national summary</SectionLabel>
        {session?.user && (
          <Btn small color={C.mint} onClick={()=>setSubmitFor(rows?.[0]?.id || '')}>＋ Submit data</Btn>
        )}
      </div>

      {rows === null && <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>Loading indicators…</p>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
        {(rows || []).map(ind => {
          const meta = META[ind.name] || {}
          const pct = pctOf(ind)
          const isOpen = open === ind.id
          const higherIsBetter = (ind.higher_is_better ?? ind.higherIsBetter) !== false
          return (
            <div key={ind.id} onClick={()=>setOpen(isOpen ? null : ind.id)}
              style={{ background:C.card, border:`1px solid ${isOpen ? C.mint : C.line}`,
                borderTop:`3px solid ${C.mint}`, borderRadius:12, padding:'16px 16px 14px', cursor:'pointer',
                transition:'border-color .15s ease' }}>

              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div>
                  <div style={{ fontFamily:C.serif, fontSize:18, fontWeight:700, color:C.txt, lineHeight:1.15 }}>{ind.name}</div>
                  {ind.subtitle && <div style={{ fontFamily:C.sans, fontSize:11, color:C.mut, marginTop:2 }}>{ind.subtitle}</div>}
                </div>
                <div style={{ fontFamily:C.serif, fontSize:30, fontWeight:700, color:C.mint, lineHeight:1, whiteSpace:'nowrap' }}>{valLabel(ind)}</div>
              </div>

              {/* Progress */}
              <div style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'10px 0 5px' }}>
                {higherIsBetter ? 'Progress toward' : 'Target ceiling'} {ind.target_value}{ind.unit === '%' ? '%' : ''} {ind.unit && ind.unit !== '%' ? ind.unit : 'target'}
              </div>
              <div style={{ height:8, borderRadius:5, background:C.card2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:pct + '%', borderRadius:5,
                  background:`linear-gradient(90deg, ${C.mint}, ${C.gold})` }}/>
              </div>
              <div style={{ display:'flex', gap:14, marginTop:8 }}>
                <Legend dot={C.mint} label={`Current: ${valLabel(ind)}`}/>
                <Legend dot={C.gold} label={`Target: ${ind.target_value}${ind.unit === '%' ? '%' : ''}`}/>
              </div>

              <div style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, textAlign:'right', marginTop:8 }}>
                {isOpen ? '▲ Close' : '👆 Trend, sources & breakdown'}
              </div>

              {/* Detail */}
              {isOpen && (
                <div onClick={e=>e.stopPropagation()} style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.line}` }}>
                  {meta.trend?.length > 0 && <>
                    <DetailLabel>Quarterly trend</DetailLabel>
                    <TrendBars trend={meta.trend} unit={ind.unit}/>
                  </>}
                  {meta.note && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, fontStyle:'italic', lineHeight:1.55, margin:'12px 0' }}>{meta.note}</p>}
                  {meta.sources?.length > 0 && <>
                    <DetailLabel>Data sources</DetailLabel>
                    <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:4 }}>
                      {meta.sources.map((s,i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily:C.sans, fontSize:11, color:C.sky, textDecoration:'none', fontWeight:600 }}>
                          📎 {s.label} →
                        </a>
                      ))}
                    </div>
                  </>}
                  {meta.counties?.length > 0 && <>
                    <DetailLabel>Leading counties</DetailLabel>
                    <TagRow items={meta.counties} color={C.mint}/>
                  </>}
                  {meta.orgs?.length > 0 && <>
                    <DetailLabel>Contributing organisations</DetailLabel>
                    <TagRow items={meta.orgs} color={C.lilac}/>
                  </>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {submitFor !== null && (
        <SubmitModal indicators={rows || []} initial={submitFor} canWrite={!usingFallback}
          session={session} onClose={()=>setSubmitFor(null)} onDone={load}/>
      )}
    </div>
  )
}

function Legend({ dot, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <span style={{ width:9, height:9, borderRadius:'50%', background:dot, display:'inline-block' }}/>
      <span style={{ fontFamily:C.sans, fontSize:10.5, color:C.txt }}>{label}</span>
    </div>
  )
}

function DetailLabel({ children }) {
  return <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.12em',
    textTransform:'uppercase', color:C.mut, margin:'12px 0 7px' }}>{children}</p>
}

function TrendBars({ trend, unit }) {
  const max = Math.max(...trend.map(t => t.val)) || 1
  return (
    <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
      {trend.map((t,i) => (
        <div key={i} style={{ flex:1, textAlign:'center' }}>
          <div style={{ fontFamily:C.sans, fontSize:10, fontWeight:700, color:C.txt, marginBottom:4 }}>{t.val}{unit === '%' ? '%' : ''}</div>
          <div style={{ height: Math.round((t.val / max) * 54) + 4, borderRadius:4,
            background:`linear-gradient(180deg, ${C.mint}, ${C.gold})` }}/>
          <div style={{ fontFamily:C.sans, fontSize:8.5, color:C.mut, marginTop:4 }}>{t.q}</div>
        </div>
      ))}
    </div>
  )
}

function TagRow({ items, color }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:2 }}>
      {items.map((it,i) => (
        <span key={i} style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:700, padding:'3px 10px',
          borderRadius:14, border:`1px solid ${color}`, color, background:`${color}14` }}>{it}</span>
      ))}
    </div>
  )
}

// ── Member data submission — writes to tracker_submissions (same shape the old hub used)
function SubmitModal({ indicators, initial, canWrite, session, onClose, onDone }) {
  const [indicatorId, setIndicatorId] = useState(initial || (indicators[0]?.id ?? ''))
  const [value, setValue] = useState('')
  const [quarter, setQuarter] = useState('Q2 2026')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const submit = async () => {
    if (!indicatorId || value === '') { setMsg('Select an indicator and enter a value.'); return }
    if (!canWrite) { setMsg('Submissions open once the live tracker tables are connected.'); return }
    setBusy(true); setMsg('')
    const { error } = await sb.from('tracker_submissions').insert({
      indicator_id: indicatorId,
      submitted_by: session?.user?.id ?? null,
      value: parseFloat(value),
      quarter,
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    await logActivity('tracker_submit', `${session?.name || 'A member'} submitted tracker data for ${quarter}`, null, 'green')
    toast('✓ Data submitted — pending admin review', 'green')
    onDone?.(); onClose()
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:420 }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Submit tracker data</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px' }}>Submissions are reviewed and aggregated by the Hub Administrator.</p>

        <select value={indicatorId} onChange={e=>setIndicatorId(e.target.value)} style={{ ...inputStyle, appearance:'auto' }}>
          {indicators.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <input style={inputStyle} type="number" placeholder="Value (e.g. 54)" value={value} onChange={e=>setValue(e.target.value)}/>
        <input style={inputStyle} placeholder="Quarter (e.g. Q2 2026)" value={quarter} onChange={e=>setQuarter(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:64, resize:'vertical' }} placeholder="Notes / source (optional)" value={notes} onChange={e=>setNotes(e.target.value)}/>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px', lineHeight:1.5 }}>{msg}</p>}
        <div style={{ display:'flex', gap:8 }}>
          <Btn ghost full onClick={onClose}>Cancel</Btn>
          <Btn full color={C.mint} disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit data'}</Btn>
        </div>
      </div>
    </div>
  )
}
