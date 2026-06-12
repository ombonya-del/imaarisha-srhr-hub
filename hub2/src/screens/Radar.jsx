import { useState, useEffect } from 'react'
import { sb, C, timeAgo } from '../lib/supabase'

const TYPOLOGY = {
  contraceptive_myth: { label:'Contraceptive myths', color:'#D7574B', key:'myth_signals' },
  fertility_abortion: { label:'Fertility & abortion fear', color:'#C9A84C', key:'fertility_signals' },
  anti_cse:           { label:'Anti-CSE rhetoric', color:'#3D9E8A', key:'cse_signals' },
  faith_healing:      { label:'Faith-healing claims', color:'#A855F7', key:'faith_signals' },
}

export default function Radar() {
  const [idx, setIdx]     = useState(null)
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    sb.from('radar_index').select('*').order('date',{ascending:false}).limit(1)
      .then(({data}) => setIdx(data?.[0] || null))
    sb.from('radar_items').select('*').order('scanned_at',{ascending:false}).limit(60)
      .then(({data}) => setItems(data || []))
  }, [])

  const score = idx?.score ?? null
  const delta = idx ? (idx.score - idx.prev_score) : 0
  const sevColor = score == null ? C.mut : score >= 60 ? C.red : score >= 40 ? C.gold : C.teal

  const visible = filter === 'all' ? items
    : filter === 'disinfo' ? items.filter(i => i.is_disinfo)
    : items.filter(i => i.typology === filter)

  return (
    <div>
      <p style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, letterSpacing:'.2em',
        textTransform:'uppercase', color:C.coral, margin:0 }}>● Live · SRHR Disinformation Radar</p>
      <h1 style={{ fontFamily:C.serif, fontSize:'clamp(32px, 4.5vw, 42px)', fontWeight:700, color:C.txt,
        margin:'4px 0 8px', lineHeight:1.08, letterSpacing:'-0.01em' }}>
        What the narrative is doing today
      </h1>
      <div style={{ width:64, height:5, borderRadius:3, marginBottom:16,
        background:`linear-gradient(90deg, ${C.coral}, ${C.coral}22)` }}/>

      {/* Index dial */}
      <div style={{ background:C.card, border:`1px solid ${C.line}`, borderTop:`3px solid ${sevColor}`,
        borderRadius:12, padding:'20px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'flex-end', gap:14 }}>
          <div style={{ fontFamily:C.serif, fontSize:84, fontWeight:700, color:sevColor, lineHeight:.9,
            textShadow:`0 0 36px ${sevColor}66` }}>
            {score ?? '—'}
          </div>
          <div style={{ paddingBottom:6 }}>
            <p style={{ fontFamily:C.sans, fontSize:13, fontWeight:700, color:C.txt, margin:0 }}>SRHR Narrative Index</p>
            <p style={{ fontFamily:C.sans, fontSize:11, color:C.mut, margin:'2px 0 0' }}>
              {score == null ? 'Awaiting first scan' :
                <>{delta > 0 ? '▲' : delta < 0 ? '▼' : '■'} {Math.abs(delta)} vs yesterday · 0 = healthy, 100 = toxic</>}
            </p>
          </div>
        </div>
        {idx && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginTop:16 }}>
            <Stat v={idx.positive_share + '%'} l="positive content" sub="benchmark: 3.6%" color={C.teal}/>
            <Stat v={idx.disinfo_count} l="disinformation signals" sub={`${idx.item_count} items scanned`} color={C.red}/>
          </div>
        )}
      </div>

      {/* Typology breakdown */}
      {idx && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:16 }}>
          {Object.entries(TYPOLOGY).map(([k,t]) => (
            <button key={k} onClick={()=>setFilter(filter===k?'all':k)}
              style={{ textAlign:'left', cursor:'pointer', background: filter===k?C.card2:C.card,
                border:`1px solid ${filter===k?t.color:C.line}`, borderLeft:`3px solid ${t.color}`,
                borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontFamily:C.serif, fontSize:24, fontWeight:700, color:t.color }}>{idx[t.key] ?? 0}</div>
              <div style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, marginTop:2 }}>{t.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
        {[['all','All'],['disinfo','Disinfo only'],...Object.entries(TYPOLOGY).map(([k,t])=>[k,t.label])].map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)}
            style={{ fontFamily:C.sans, fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:20,
              cursor:'pointer', border:`1px solid ${filter===k?C.gold:C.line}`,
              background: filter===k?C.goldDim:'transparent', color: filter===k?C.gold:C.mut }}>{l}</button>
        ))}
      </div>

      {/* Feed */}
      {visible.length === 0 && (
        <p style={{ fontFamily:C.sans, fontSize:12, color:C.mut, fontStyle:'italic' }}>
          No items yet — the radar populates after its first scheduled scan.
        </p>
      )}
      {visible.map(it => {
        const ty = TYPOLOGY[it.typology]
        return (
          <a key={it.id} href={it.url} target="_blank" rel="noopener noreferrer"
            style={{ display:'block', textDecoration:'none', background:C.card, border:`1px solid ${C.line}`,
              borderLeft:`3px solid ${it.is_disinfo ? (ty?.color||C.red) : C.line}`,
              borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
              {it.is_disinfo && ty && (
                <span style={{ fontFamily:C.sans, fontSize:8.5, fontWeight:800, letterSpacing:'.08em',
                  textTransform:'uppercase', color:ty.color, border:`1px solid ${ty.color}`,
                  borderRadius:4, padding:'1px 6px' }}>{ty.label}</span>
              )}
              <span style={{ fontFamily:C.sans, fontSize:10, color:C.mut }}>{it.source_name} · {timeAgo(it.scanned_at)}</span>
              {it.harm_score >= 7 && <span style={{ fontFamily:C.sans, fontSize:10, color:C.red, fontWeight:700 }}>harm {it.harm_score}/10</span>}
            </div>
            <div style={{ fontFamily:C.sans, fontSize:13.5, fontWeight:600, color:C.txt, lineHeight:1.4 }}>{it.title}</div>
          </a>
        )
      })}
    </div>
  )
}

function Stat({ v, l, sub, color }) {
  return (
    <div style={{ background:C.card2, borderRadius:8, padding:'10px 12px' }}>
      <div style={{ fontFamily:C.serif, fontSize:22, fontWeight:700, color }}>{v}</div>
      <div style={{ fontFamily:C.sans, fontSize:10.5, color:C.txt, marginTop:2 }}>{l}</div>
      <div style={{ fontFamily:C.sans, fontSize:9, color:C.mut }}>{sub}</div>
    </div>
  )
}
