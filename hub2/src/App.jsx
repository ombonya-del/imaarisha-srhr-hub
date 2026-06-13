import { useState, useEffect } from 'react'
import { sb, C, useSession, startNotifier, toast } from './lib/supabase'
import { Toasts, Btn, inputStyle } from './lib/components'
import Pulse from './screens/Pulse'
import Radar from './screens/Radar'
import Watch from './screens/Watch'
import Forum from './screens/Forum'
import Tracker from './screens/Tracker'
import Exchange from './screens/Exchange'
import Events from './screens/Events'
import Admin from './screens/Admin'

const NAV = [
  { id:'pulse',    icon:'◉',  label:'Pulse',    screen: Pulse },
  { id:'radar',    icon:'⦿',  label:'Radar',    screen: Radar },
  { id:'watch',    icon:'🚩', label:'Disinfo Watch', screen: Watch },
  { id:'forum',    icon:'💬', label:'Forum',    screen: Forum },
  { id:'tracker',  icon:'📊', label:'Tracker',  screen: Tracker },
  { id:'exchange', icon:'⇄',  label:'Exchange', screen: Exchange },
  { id:'events',   icon:'📅', label:'Events',   screen: Events },
  { id:'admin',    icon:'👑', label:'Admin',    screen: Admin, adminOnly: true },
]

export default function App() {
  const session = useSession()
  const [tab, setTab] = useState('pulse')
  const [authOpen, setAuthOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const fn = e => setIsDesktop(e.matches)
    mq.addEventListener('change', fn)
    const stop = startNotifier()
    return () => { mq.removeEventListener('change', fn); stop() }
  }, [])

  const visibleNav = NAV.filter(n => !n.adminOnly || session.isAdmin)
  const Active = (visibleNav.find(n => n.id === tab) || NAV[0]).screen

  return (
    <div style={{ background:C.bg, minHeight:'100vh', fontFamily:C.sans, color:C.txt }}>
      <style>{`* { -webkit-tap-highlight-color: transparent; }
        body { margin:0; background:${C.bg};
          background-image: radial-gradient(700px 420px at 8% -5%, rgba(217,154,38,0.10), transparent 60%),
            radial-gradient(640px 420px at 96% 4%, rgba(62,155,79,0.10), transparent 60%),
            radial-gradient(800px 520px at 50% 110%, rgba(139,92,246,0.08), transparent 60%);
          background-attachment: fixed; }
        ::-webkit-scrollbar { width:8px } ::-webkit-scrollbar-thumb { background:#CFCBE0; border-radius:4px }
        .navlink { color:#FF9466; transition: color .15s ease, text-shadow .15s ease; }
        .navlink:hover { color:#FFFFFF; text-shadow: 0 0 14px rgba(255,255,255,0.35); }
        .navlink.on { color:#FFFFFF; box-shadow: inset 0 -3px 0 #E2552F; }`}</style>
      {/* identity stripe — the logo, as a line */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:4, zIndex:30,
        background:'linear-gradient(90deg, #E8B14B 0%, #D99A26 25%, #3E9B4F 55%, #E2552F 100%)' }}/>
      <Toasts/>
      {authOpen && <AuthModal onClose={()=>setAuthOpen(false)}/>}

      {/* ── Top bar ── */}
      <header style={{ position:'sticky', top:4, zIndex:10, background:'rgba(34,39,54,0.96)',
        backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.08)',
        boxShadow:'0 2px 16px rgba(20,24,38,0.25)' }}>
        <div style={{ maxWidth: isDesktop ? 1100 : 480, margin:'0 auto', padding:'12px 16px',
          display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, whiteSpace:'nowrap' }}>
            <img src="/logo-mark.png" alt="" style={{ height: isDesktop ? 44 : 36, display:'block' }}/>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
              <span style={{ fontFamily:C.serif, fontSize: isDesktop ? 31 : 24, fontWeight:700, color:'#F6F2E8' }}>
                Imaarisha<span style={{ color:'#E8B14B' }}>SRHR</span>
              </span>
              <span style={{ fontFamily:C.sans, fontSize: isDesktop ? 9.5 : 8, fontWeight:800,
                letterSpacing:'.34em', color:'#6FD49B', marginTop:3 }}>COLLECTIVE HUB</span>
            </div>
          </div>

          {/* Desktop nav inline — orange, lights up white on hover */}
          {isDesktop && (
            <nav style={{ display:'flex', gap:2, flex:1, justifyContent:'center' }}>
              {visibleNav.map(n => {
                const on = tab === n.id
                return (
                  <button key={n.id} onClick={()=>setTab(n.id)}
                    className={'navlink' + (on ? ' on' : '')}
                    style={{ fontFamily:C.sans, fontSize:14.5, fontWeight:800, padding:'11px 17px',
                      border:'none', cursor:'pointer', background:'transparent', letterSpacing:'.02em' }}>
                    {n.icon} {n.label}
                  </button>
                )
              })}
            </nav>
          )}

          <div style={{ marginLeft: isDesktop ? 0 : 'auto', display:'flex', alignItems:'center', gap:8 }}>
            {session.user ? (
              <button onClick={async()=>{ await sb.auth.signOut(); toast('Signed out', 'gold') }}
                title={session.name}
                style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding:'6px 12px', borderRadius:16,
                  border:'1px solid rgba(255,255,255,0.22)', background:'transparent', color:'#F6F2E8',
                  cursor:'pointer', whiteSpace:'nowrap' }}>
                {session.isAdmin ? '👑 ' : '✓ '}{(session.name || '').split(' ')[0] || 'Member'} · out
              </button>
            ) : (
              <button onClick={()=>setAuthOpen(true)}
                style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding:'6px 14px', borderRadius:16,
                  border:'none', background:'linear-gradient(135deg, #E8B14B, #D9822B)', color:'#fff',
                  cursor:'pointer', whiteSpace:'nowrap' }}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Screen ── */}
      <main style={{ maxWidth: isDesktop ? 1100 : 480, margin:'0 auto',
        padding: isDesktop ? '24px 16px 60px' : '18px 16px 96px' }}>
        <Active go={setTab} session={session}/>
      </main>

      {/* ── Mobile bottom nav ── */}
      {!isDesktop && (
        <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480,
          background:'rgba(34,39,54,0.97)', backdropFilter:'blur(10px)', borderTop:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 -2px 16px rgba(20,24,38,0.3)',
          display:'flex', justifyContent:'space-around', padding:'7px 0 calc(7px + env(safe-area-inset-bottom))', zIndex:20 }}>
          {visibleNav.map(n => {
            const on = tab === n.id
            return (
              <button key={n.id} onClick={()=>setTab(n.id)}
                style={{ background:'none', border:'none', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  padding:'4px 6px', flex:1 }}>
                <span style={{ fontSize:16, lineHeight:1, filter: on ? 'none' : 'grayscale(1) opacity(.6)' }}>{n.icon}</span>
                <span style={{ fontFamily:C.sans, fontSize:9, fontWeight: on?800:700, color: on?'#FFFFFF':'#FF9466' }}>{n.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

// ── Auth modal: magic link (members) + password + sign up ────────────────────
function AuthModal({ onClose }) {
  const [mode, setMode] = useState('magic')   // magic | password | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true); setMsg('')
    try {
      if (mode === 'magic') {
        const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } })
        setMsg(error ? error.message : '✓ Check your email for the sign-in link.')
      } else if (mode === 'password') {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
        if (error) setMsg(error.message); else onClose()
      } else {
        const { error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } })
        setMsg(error ? error.message : '✓ Account created — check your email to confirm.')
      }
    } catch (e) { setMsg(String(e.message || e)) }
    setBusy(false)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:380 }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Member sign-in</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px' }}>The ops room is members-only for posting. Reading is open.</p>
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[['magic','✨ Magic link'],['password','🔑 Password'],['signup','＋ Sign up']].map(([k,l]) => (
            <button key={k} onClick={()=>{ setMode(k); setMsg('') }}
              style={{ flex:1, fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding:'8px 0', borderRadius:8,
                border:'none', cursor:'pointer', background: mode===k?C.gold:C.card, color: mode===k?'#171204':C.mut }}>{l}</button>
          ))}
        </div>
        {mode === 'signup' && <input style={inputStyle} placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)}/>}
        <input style={inputStyle} type="email" placeholder="you@organisation.org" value={email} onChange={e=>setEmail(e.target.value)}/>
        {mode !== 'magic' && <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>}
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color: msg.startsWith('✓') ? C.mint : C.coral, margin:'0 0 10px', lineHeight:1.5 }}>{msg}</p>}
        <Btn full onClick={go} disabled={busy || !email.trim()}>
          {busy ? 'Working…' : mode === 'magic' ? 'Send magic link' : mode === 'password' ? 'Sign in' : 'Create account'}
        </Btn>
      </div>
    </div>
  )
}
