import { useState, useEffect, useMemo } from 'react'
import { KENYA_COUNTIES } from './lib/fika'

// ── Kenya county choropleth for Hebu Fika ────────────────────────────────────
// Loads real county geometry from a CDN at runtime (no heavy bundle), projects
// it with a self-fitting equirectangular projection, and shades each county by
// the number of listed youth-friendly SRHR services. Tap a county to filter.
// Falls back to a schematic county grid if the geometry can't be fetched (offline).

const GEO_URL = 'https://cdn.jsdelivr.net/gh/mikelmaron/kenya-election-data@master/data/counties.geojson'
const NAME_KEYS = ['COUNTY_NAM','COUNTY','COUNTY_NAME','NAME_1','ADM1_EN','shapeName','county','name','Name']
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '')

// canonical county lookup by normalized name
const CANON = Object.fromEntries(KENYA_COUNTIES.map(c => [norm(c), c]))

const TIERS = [
  { min: 5, color: 'var(--uk-map3)' },
  { min: 3, color: 'var(--uk-map2)' },
  { min: 1, color: 'var(--uk-map1)' },
  { min: 0, color: 'var(--uk-map0)' },
]
const colorFor = (n) => (TIERS.find(t => n >= t.min) || TIERS[TIERS.length - 1]).color

export default function KenyaMap({ facilities = [], selected, onSelect, accent = 'var(--uk-gold)', mut = 'var(--uk-mut)', txt = 'var(--uk-txt)' }) {
  const [geo, setGeo] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(GEO_URL).then(r => r.json()).then(d => { if (alive) setGeo(d) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  // counts per canonical county
  const counts = useMemo(() => {
    const m = {}
    facilities.forEach(f => { const c = CANON[norm(f.county)] || f.county; m[c] = (m[c] || 0) + 1 })
    return m
  }, [facilities])

  const built = useMemo(() => {
    if (!geo?.features?.length) return null
    const feats = geo.features
    const nameKey = NAME_KEYS.find(k => feats[0].properties && feats[0].properties[k] != null)
    let minLng = 1e9, maxLng = -1e9, minLat = 1e9, maxLat = -1e9
    const eachRing = (geom, fn) => {
      if (!geom) return
      const polys = geom.type === 'MultiPolygon' ? geom.coordinates : geom.type === 'Polygon' ? [geom.coordinates] : []
      polys.forEach(p => p.forEach(ring => fn(ring)))
    }
    feats.forEach(f => eachRing(f.geometry, ring => ring.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
    })))
    const meanLat = (minLat + maxLat) / 2
    const k = Math.cos(meanLat * Math.PI / 180)
    const effW = (maxLng - minLng) * k, effH = (maxLat - minLat)
    const W = 600, scale = W / effW, H = effH * scale
    const px = (lng, lat) => [((lng - minLng) * k * scale), ((maxLat - lat) * scale)]
    const shapes = feats.map((f, i) => {
      const raw = nameKey ? f.properties[nameKey] : ''
      const canon = CANON[norm(raw)] || raw
      let d = ''
      eachRing(f.geometry, ring => {
        ring.forEach(([lng, lat], j) => { const [x, y] = px(lng, lat); d += (j ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) })
        d += 'Z'
      })
      return { id: i, canon, d, count: counts[canon] || 0 }
    })
    return { shapes, W, H }
  }, [geo, counts])

  if (failed && !geo) return <SchematicGrid counts={counts} selected={selected} onSelect={onSelect} accent={accent} mut={mut} />
  if (!built) return <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center',
    color:mut, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12.5, fontStyle:'italic' }}>Loading map…</div>

  return (
    <div>
      <svg viewBox={`0 0 ${built.W} ${built.H}`} style={{ width:'100%', height:'auto', display:'block' }} role="img" aria-label="Map of Kenya counties by number of youth-friendly SRHR services">
        {built.shapes.map(s => {
          const on = selected && s.canon === selected
          return (
            <path key={s.id} d={s.d} onClick={()=>onSelect?.(s.canon)}
              strokeWidth={on ? 2.4 : 0.7}
              style={{ fill: colorFor(s.count), stroke: on ? accent : 'var(--uk-map-edge)', cursor:'pointer', transition:'fill .15s' }}>
              <title>{s.canon}: {s.count} {s.count === 1 ? 'service' : 'services'}</title>
            </path>
          )
        })}
      </svg>
      <Legend mut={mut} txt={txt}/>
    </div>
  )
}

function Legend({ mut, txt }) {
  const items = [['0', 'var(--uk-map0)'], ['1–2', 'var(--uk-map1)'], ['3–4', 'var(--uk-map2)'], ['5+', 'var(--uk-map3)']]
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginTop:8, justifyContent:'center' }}>
      <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10.5, color:mut, fontWeight:700 }}>Services listed:</span>
      {items.map(([l, c]) => (
        <span key={l} style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
          <span style={{ width:13, height:13, borderRadius:3, background:c, border:'1px solid var(--uk-line)' }}/>
          <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10.5, color:txt, opacity:.8 }}>{l}</span>
        </span>
      ))}
    </div>
  )
}

// Offline fallback — schematic grid of all 47 counties, shaded the same way.
function SchematicGrid({ counts, selected, onSelect, accent, mut }) {
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(78px,1fr))', gap:5 }}>
        {KENYA_COUNTIES.map(c => {
          const n = counts[c] || 0, on = c === selected
          return (
            <button key={c} onClick={()=>onSelect?.(c)}
              style={{ cursor:'pointer', textAlign:'left', border:`1px solid ${on?accent:'var(--uk-line)'}`,
                background:colorFor(n), borderRadius:8, padding:'7px 8px' }}>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:9.5, fontWeight:700, color: n >= 5 ? 'var(--uk-map-ink-hi)' : 'var(--uk-map-ink)', lineHeight:1.15 }}>{c}</div>
              <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:9, color: n >= 5 ? 'var(--uk-map-ink-hi)' : 'var(--uk-map-ink)', opacity:.75 }}>{n}</div>
            </button>
          )
        })}
      </div>
      <p style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:10.5, color:mut, textAlign:'center', marginTop:8, fontStyle:'italic' }}>
        Map view needs a connection — showing county grid.
      </p>
    </div>
  )
}
