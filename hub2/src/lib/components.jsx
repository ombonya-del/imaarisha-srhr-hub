import { C, useToasts, parseBody } from './supabase'

export function SectionLabel({ children, color = C.gold }) {
  return <p style={{ fontFamily:C.sans, fontSize:10, fontWeight:800, letterSpacing:'.16em',
    textTransform:'uppercase', color, margin:'0 0 10px' }}>{children}</p>
}

export function ScreenTitle({ kicker, title, sub, accent = C.gold }) {
  return (
    <>
      <p style={{ fontFamily:C.sans, fontSize:11, fontWeight:800, letterSpacing:'.2em',
        textTransform:'uppercase', color:accent, margin:0 }}>{kicker}</p>
      <h1 style={{ fontFamily:C.serif, fontSize:'clamp(32px, 4.5vw, 42px)', fontWeight:700,
        color:C.txt, margin:'4px 0 8px', lineHeight:1.08, letterSpacing:'-0.01em' }}>{title}</h1>
      <div style={{ width:64, height:5, borderRadius:3, marginBottom:10,
        background:`linear-gradient(90deg, ${accent}, ${accent}22)` }}/>
      {sub && <p style={{ fontFamily:C.sans, fontSize:13, color:C.mut, margin:'0 0 18px', lineHeight:1.65, maxWidth:640 }}>{sub}</p>}
      {!sub && <div style={{ height:12 }}/>}
    </>
  )
}

export function Chip({ children, color = C.sky, onClick, active }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding:'4px 12px', borderRadius:20,
        cursor: onClick ? 'pointer' : 'default', border:`1px solid ${active ? color : C.line}`,
        background: active ? color + '26' : 'transparent', color: active ? color : C.mut, whiteSpace:'nowrap' }}>
      {children}
    </button>
  )
}

export function Btn({ children, onClick, color = C.gold, ghost, disabled, full, small }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ fontFamily:C.sans, fontSize: small ? 11 : 12.5, fontWeight:800,
        padding: small ? '7px 14px' : '11px 20px', borderRadius:10, cursor: disabled ? 'default' : 'pointer',
        width: full ? '100%' : undefined, opacity: disabled ? .5 : 1,
        border: ghost ? `1px solid ${C.line}` : 'none',
        background: ghost ? 'transparent'
          : color === C.gold ? 'linear-gradient(135deg, #E8B14B, #D9822B)' : color,
        color: ghost ? C.mut : '#fff',
        boxShadow: ghost ? 'none' : '0 3px 10px rgba(217,130,43,0.25)' }}>
      {children}
    </button>
  )
}

export const inputStyle = {
  width:'100%', boxSizing:'border-box', fontFamily:C.sans, fontSize:13, color:C.txt,
  background:C.card2, border:`1px solid ${C.line}`, borderRadius:10, padding:'11px 12px',
  outline:'none', marginBottom:8,
}

export function BodyView({ body }) {
  const segs = parseBody(body)
  return (
    <div>
      {segs.map((s, i) => {
        if (s.type === 'image') return <img key={i} src={s.url} alt="" loading="lazy"
          style={{ maxWidth:'100%', maxHeight:340, borderRadius:10, display:'block', margin:'10px 0', objectFit:'contain' }}/>
        if (s.type === 'video') return <video key={i} src={s.url} controls
          style={{ maxWidth:'100%', maxHeight:340, borderRadius:10, display:'block', margin:'10px 0' }}/>
        // text with links + line breaks (React escapes text — no XSS)
        return <span key={i} style={{ whiteSpace:'pre-wrap', fontFamily:C.sans, fontSize:13.5, color:C.txt, lineHeight:1.7 }}>
          {s.text.split(/(https?:\/\/[^\s<"\]]+)/g).map((part, j) =>
            /^https?:\/\//.test(part)
              ? <a key={j} href={part} target="_blank" rel="noopener noreferrer" style={{ color:C.sky, fontWeight:700 }}>{part}</a>
              : part)}
        </span>
      })}
    </div>
  )
}

export function Toasts() {
  const items = useToasts()
  const colorMap = { red: C.coral, green: C.mint, gold: C.gold }
  return (
    <div style={{ position:'fixed', top:64, right:12, zIndex:99, display:'flex', flexDirection:'column', gap:8, maxWidth:320 }}>
      {items.map(t => (
        <div key={t.id} style={{ background:C.card2, border:`1px solid ${C.line}`,
          borderLeft:`3px solid ${colorMap[t.color] || C.gold}`, borderRadius:10, padding:'10px 14px',
          boxShadow:'0 8px 24px rgba(0,0,0,0.4)', animation:'slideIn .25s ease' }}>
          <p style={{ fontFamily:C.sans, fontSize:12, color:C.txt, margin:0, lineHeight:1.45 }}>{t.msg}</p>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(30px); opacity:0 } to { transform:none; opacity:1 } }`}</style>
    </div>
  )
}
