import { useState, useEffect } from 'react'
import { sb, C, useSession, startNotifier, toast } from './lib/supabase'
import { Toasts, Btn, inputStyle } from './lib/components'
import { enablePush, disablePush, isPushOn, pushSupported } from './lib/push'
import Pulse from './screens/Pulse'
import Radar from './screens/Radar'
import Watch from './screens/Watch'
import Forum from './screens/Forum'
import Tracker from './screens/Tracker'
import Exchange from './screens/Exchange'
import Events from './screens/Events'
import Unado from './screens/Unado'
import Admin from './screens/Admin'

const NAV = [
  { id:'pulse',    icon:'◉',  label:'Pulse',    screen: Pulse },
  { id:'radar',    icon:'⦿',  label:'Radar',    screen: Radar },
  { id:'watch',    icon:'🚩', label:'Disinfo Watch', short:'Disinfo', screen: Watch },
  { id:'forum',    icon:'💬', label:'Forum',    screen: Forum },
  { id:'unado',    icon:'📸', label:'UnaDO?',   screen: Unado },
  { id:'tracker',  icon:'📊', label:'Tracker',  screen: Tracker },
  { id:'exchange', icon:'⇄',  label:'Exchange', screen: Exchange },
  { id:'events',   icon:'📅', label:'Events',   screen: Events },
  { id:'admin',    icon:'👑', label:'Admin',    screen: Admin, adminOnly: true },
]

const parseHash = () => {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '')
  const [seg, id] = raw.split('/')
  return { seg: seg || 'pulse', id: id || null }
}

export default function App() {
  const session = useSession()
  // URL hash is the source of truth for navigation, so tabs and individual
  // events are bookmarkable / shareable and the browser back button works.
  const [route, setRoute] = useState(parseHash)
  const navigate = (to) => { window.location.hash = to }
  const tab = route.seg === 'event' ? 'events' : route.seg
  const eventId = route.seg === 'event' ? route.id : null
  const [authOpen, setAuthOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 900)

  useEffect(() => { if (session.user) isPushOn().then(setPushOn) }, [session.user])
  const togglePush = async () => {
    try {
      if (pushOn) { await disablePush(); setPushOn(false); toast('🔕 Notifications off', 'gold') }
      else { await enablePush(session.user.id); setPushOn(true); toast('🔔 Notifications on — you’ll hear about new events & activity', 'green') }
    } catch (e) { toast(String(e.message || e), 'red') }
  }

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const fn = e => setIsDesktop(e.matches)
    mq.addEventListener('change', fn)
    const stop = startNotifier()
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => { mq.removeEventListener('change', fn); stop(); window.removeEventListener('hashchange', onHash) }
  }, [])

  // Auto sign-out after 5 minutes of inactivity (members handle sensitive data).
  useEffect(() => {
    if (!session.user) return
    let timer
    const IDLE_MS = 5 * 60 * 1000
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        await sb.auth.signOut()
        toast('Signed out after 5 minutes of inactivity', 'gold')
      }, IDLE_MS)
    }
    const evs = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    evs.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => { clearTimeout(timer); evs.forEach(e => window.removeEventListener(e, reset)) }
  }, [session.user])

  const visibleNav = NAV.filter(n => !n.adminOnly || session.isAdmin)
  const Active = (visibleNav.find(n => n.id === tab) || NAV[0]).screen

  // Access gate: the hub does not open without a signed-in, approved member.
  if (session.loading) return <Splash/>
  if (!session.user) return <Landing/>
  if (!session.approved) return <PendingScreen name={session.name} onSignOut={()=>sb.auth.signOut()}/>

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
      {inviteOpen && <InviteModal session={session} onClose={()=>setInviteOpen(false)}/>}

      {/* ── Top bar ── */}
      <header style={{ position:'sticky', top:4, zIndex:10, background:'rgba(34,39,54,0.96)',
        backdropFilter:'blur(10px)', borderBottom:'1px solid rgba(255,255,255,0.08)',
        boxShadow:'0 2px 16px rgba(20,24,38,0.25)' }}>
        <div style={{ maxWidth: isDesktop ? 1100 : 480, margin:'0 auto', padding:'12px 16px',
          display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:11, whiteSpace:'nowrap' }}>
            <img src="/logo-mark.png" alt="" style={{ height: isDesktop ? 44 : 36, display:'block' }}/>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
              <span style={{ fontFamily:C.serif, fontSize: isDesktop ? 27 : 24, fontWeight:700, color:'#F6F2E8' }}>
                Imaarisha<span style={{ color:'#E8B14B' }}>SRHR</span>
              </span>
              <span style={{ fontFamily:C.sans, fontSize: isDesktop ? 9.5 : 8, fontWeight:800,
                letterSpacing:'.34em', color:'#6FD49B', marginTop:3 }}>COLLECTIVE HUB</span>
            </div>
          </div>

          {/* Desktop nav inline — orange, lights up white on hover */}
          {isDesktop && (
            <nav style={{ display:'flex', gap:1, flex:1, justifyContent:'center' }}>
              {visibleNav.map(n => {
                const on = tab === n.id
                return (
                  <button key={n.id} onClick={()=>navigate(n.id)} title={n.label}
                    className={'navlink' + (on ? ' on' : '')}
                    style={{ fontFamily:C.sans, fontSize:13, fontWeight:800, padding:'8px 10px', whiteSpace:'nowrap',
                      border:'none', cursor:'pointer', background:'transparent', letterSpacing:'.01em' }}>
                    {n.icon} {n.short || n.label}
                  </button>
                )
              })}
            </nav>
          )}

          <div style={{ marginLeft: isDesktop ? 0 : 'auto', display:'flex', alignItems:'center', gap:8 }}>
            {session.user && pushSupported() && (
              <button onClick={togglePush} title={pushOn ? 'Notifications on — tap to turn off' : 'Turn on notifications for new events & activity'}
                style={{ fontFamily:C.sans, fontSize:14, padding:'5px 9px', borderRadius:16, lineHeight:1,
                  border:'1px solid rgba(255,255,255,0.22)', background: pushOn ? 'rgba(111,212,155,0.22)' : 'transparent',
                  color:'#F6F2E8', cursor:'pointer' }}>
                {pushOn ? '🔔' : '🔕'}
              </button>
            )}
            <button onClick={()=>setInviteOpen(true)} title="Recommend a member to join"
              style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding: isDesktop ? '6px 12px' : '6px 9px', borderRadius:16,
                border:'1px solid rgba(255,255,255,0.22)', background:'transparent', color:'#F6F2E8',
                cursor:'pointer', whiteSpace:'nowrap' }}>
              {isDesktop ? '＋ Invite' : '＋'}
            </button>
            {session.user ? (
              <button onClick={async()=>{ await sb.auth.signOut(); toast('Signed out', 'gold') }}
                title={`${session.name || 'Member'} — sign out`}
                style={{ fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding: isDesktop ? '6px 12px' : '6px 9px', borderRadius:16,
                  border:'1px solid rgba(255,255,255,0.22)', background:'transparent', color:'#F6F2E8',
                  cursor:'pointer', whiteSpace:'nowrap' }}>
                {isDesktop
                  ? `${session.isAdmin ? '👑 ' : '✓ '}${((session.name || 'Member').trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,3)) || 'M'} · out`
                  : (session.isAdmin ? '👑' : '↩')}
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
        <Active go={navigate} session={session} eventId={eventId}/>
        <div style={{ textAlign:'center', marginTop:28, paddingTop:14, borderTop:`1px solid ${C.line}` }}>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily:C.sans, fontSize:11, color:C.mut, textDecoration:'none' }}>Privacy Policy</a>
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {!isDesktop && (
        <nav style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480,
          background:'rgba(34,39,54,0.97)', backdropFilter:'blur(10px)', borderTop:'1px solid rgba(255,255,255,0.08)',
          boxShadow:'0 -2px 16px rgba(20,24,38,0.3)',
          display:'flex', justifyContent:'space-around', padding:'6px 0 calc(6px + env(safe-area-inset-bottom))', zIndex:20 }}>
          {visibleNav.map(n => {
            const on = tab === n.id
            return (
              <button key={n.id} onClick={()=>navigate(n.id)}
                style={{ background:'none', border:'none', cursor:'pointer',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  padding:'4px 2px', flex:1, minWidth:0 }}>
                <span style={{ fontSize:15, lineHeight:1, color: on?'#FFFFFF':'#C4C8D4',
                  filter: on ? 'none' : 'grayscale(1) opacity(.95)' }}>{n.icon}</span>
                <span style={{ fontFamily:C.sans, fontSize:8.5, fontWeight: on?800:700, color: on?'#FFFFFF':'#C4C8D4', whiteSpace:'nowrap' }}>{n.short || n.label}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

// ── Auth form (reused by the modal + the landing gate) ───────────────────────
function AuthForm({ onSignedIn }) {
  const [mode, setMode] = useState('magic')   // magic | password | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [org, setOrg] = useState('')
  const [reason, setReason] = useState('')
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
        if (error) setMsg(error.message); else onSignedIn && onSignedIn()
      } else {
        const { error } = await sb.auth.signUp({ email: email.trim(), password,
          options: { data: { full_name: fullName.trim(), org_name: org.trim(), reason: reason.trim() } } })
        setMsg(error ? error.message : '✓ Request submitted — confirm your email, then an admin reviews your membership before access is granted.')
      }
    } catch (e) { setMsg(String(e.message || e)) }
    setBusy(false)
  }

  return (
    <div>
      <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Member access</p>
      <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px' }}>The hub is members-only. Sign in, or request to join.</p>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['magic','✨ Magic link'],['password','🔑 Password'],['signup','＋ Request to join']].map(([k,l]) => (
          <button key={k} onClick={()=>{ setMode(k); setMsg('') }}
            style={{ flex:1, fontFamily:C.sans, fontSize:10.5, fontWeight:800, padding:'8px 0', borderRadius:8,
              border:'none', cursor:'pointer', background: mode===k?C.gold:C.card, color: mode===k?'#171204':C.mut }}>{l}</button>
        ))}
      </div>
      {mode === 'signup' && <input style={inputStyle} placeholder="Full name" value={fullName} onChange={e=>setFullName(e.target.value)}/>}
      {mode === 'signup' && <input style={inputStyle} placeholder="Organization (e.g. NAYA Kenya)" value={org} onChange={e=>setOrg(e.target.value)}/>}
      {mode === 'signup' && <input style={inputStyle} placeholder="Who referred you, and why you want to join" value={reason} onChange={e=>setReason(e.target.value)}/>}
      {mode === 'signup' && <p style={{ fontFamily:C.sans, fontSize:10.5, color:C.mut, margin:'-4px 0 10px', lineHeight:1.45 }}>An admin reviews every request before access is granted.</p>}
      <input style={inputStyle} type="email" placeholder="you@organisation.org" value={email} onChange={e=>setEmail(e.target.value)}/>
      {mode !== 'magic' && <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>}
      {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color: msg.startsWith('✓') ? C.mint : C.coral, margin:'0 0 10px', lineHeight:1.5 }}>{msg}</p>}
      <Btn full onClick={go} disabled={busy || !email.trim()}>
        {busy ? 'Working…' : mode === 'magic' ? 'Send magic link' : mode === 'password' ? 'Sign in' : 'Submit request'}
      </Btn>
    </div>
  )
}

function AuthModal({ onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:380 }}>
        <AuthForm onSignedIn={onClose}/>
      </div>
    </div>
  )
}

// ── Recommend a member: any approved member can put someone forward ──────────
function InviteModal({ session, onClose }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [org, setOrg] = useState('')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!email.trim()) return
    setBusy(true); setMsg('')
    const { error } = await sb.from('member_invites').insert({
      email: email.trim(), invitee_name: name.trim() || null, org: org.trim() || null,
      note: note.trim() || null, recommended_by: session.user?.id, recommender_name: session.name || null,
    })
    setBusy(false)
    if (error) setMsg(error.message)
    else { toast('✓ Recommendation submitted — an admin will review', 'green'); onClose() }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.surf, border:`1px solid ${C.line}`,
        borderRadius:16, padding:22, width:'100%', maxWidth:400 }}>
        <p style={{ fontFamily:C.serif, fontSize:20, fontWeight:700, color:C.txt, margin:'0 0 2px' }}>Recommend a member</p>
        <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.mut, margin:'0 0 14px', lineHeight:1.5 }}>
          Put someone you trust forward to join. An admin reviews every recommendation before access is granted.
        </p>
        <input style={inputStyle} type="email" placeholder="Their email *" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input style={inputStyle} placeholder="Their name" value={name} onChange={e=>setName(e.target.value)}/>
        <input style={inputStyle} placeholder="Their organization" value={org} onChange={e=>setOrg(e.target.value)}/>
        <textarea style={{ ...inputStyle, minHeight:70 }} placeholder="Why they'd be a trusted member" value={note} onChange={e=>setNote(e.target.value)}/>
        {msg && <p style={{ fontFamily:C.sans, fontSize:11.5, color:C.coral, margin:'0 0 10px' }}>{msg}</p>}
        <Btn full onClick={submit} disabled={busy || !email.trim()}>{busy ? 'Sending…' : 'Submit recommendation'}</Btn>
      </div>
    </div>
  )
}

const STRIPE = { position:'fixed', top:0, left:0, right:0, height:4, zIndex:30,
  background:'linear-gradient(90deg, #E8B14B 0%, #D99A26 25%, #3E9B4F 55%, #E2552F 100%)' }

function Splash() {
  return <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center',
    justifyContent:'center', fontFamily:C.sans, color:C.mut }}>Loading…</div>
}

// ── Landing gate: the site does not open without sign-in ─────────────────────
function Landing() {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:C.sans, color:C.txt,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={STRIPE}/>
      <img src="/logo-mark.png" alt="" style={{ height:64, marginBottom:14 }}/>
      <h1 style={{ fontFamily:C.serif, fontSize:30, fontWeight:700, margin:'0 0 4px', textAlign:'center' }}>
        Imaarisha<span style={{ color:'#D99A26' }}>SRHR</span> Collective Hub
      </h1>
      <p style={{ fontSize:12.5, color:C.mut, margin:'0 0 22px', textAlign:'center', maxWidth:340, lineHeight:1.6 }}>
        A vetted, members-only space. Sign in to continue, or request to join.
      </p>
      <div style={{ width:'100%', maxWidth:380, background:C.surf, border:`1px solid ${C.line}`, borderRadius:16, padding:22 }}>
        <AuthForm/>
      </div>
      <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
        style={{ fontSize:11, color:C.mut, textDecoration:'none', marginTop:18 }}>Privacy Policy</a>
    </div>
  )
}

// ── Pending gate: signed in, awaiting admin approval ─────────────────────────
function PendingScreen({ name, onSignOut }) {
  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:C.sans, color:C.txt,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center' }}>
      <div style={STRIPE}/>
      <div style={{ fontSize:44, marginBottom:12 }}>⏳</div>
      <h1 style={{ fontFamily:C.serif, fontSize:26, fontWeight:700, margin:'0 0 8px' }}>Membership under review</h1>
      <p style={{ fontSize:13, color:C.mut, maxWidth:360, lineHeight:1.7, marginBottom:22 }}>
        Thanks{name ? `, ${name.split(' ')[0]}` : ''} — your request to join the ImaarishaSRHR hub is with an admin.
        You'll get access the moment it's approved. This vetting keeps the collective safe.
      </p>
      <button onClick={onSignOut} style={{ fontFamily:C.sans, fontSize:12, fontWeight:800, padding:'9px 18px',
        borderRadius:16, border:`1px solid ${C.line}`, background:'transparent', color:C.mut, cursor:'pointer' }}>Sign out</button>
    </div>
  )
}
