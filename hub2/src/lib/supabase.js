import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Theme — light, warm, easy on the eye; accents drawn from the logo ─────────
// (logo: gold + green + orange blossom, ink-grey wordmark)
export const C = {
  bg:    '#EFEDF6',
  surf:  '#FFFFFF',
  card:  '#FFFFFF',
  card2: '#E9E6F2',
  line:  'rgba(62,60,92,0.13)',
  gold:  '#D99A26',
  goldDim:'rgba(217,154,38,0.15)',
  coral: '#E2552F',
  mint:  '#3E9B4F',
  sky:   '#2D7FD6',
  lilac: '#8B5CF6',
  // aliases kept for existing screens
  teal:  '#3E9B4F',
  red:   '#E2552F',
  txt:   '#2E3338',
  mut:   '#6E7682',
  serif: "'Cormorant Garamond', serif",
  sans:  "'Nunito Sans', sans-serif",
}

// Joyful gradients for avatars / category chips (cycled by index)
export const GRADS = [
  'linear-gradient(135deg,#2A6B5E,#4FD9A6)',
  'linear-gradient(135deg,#7B3F9E,#B98CFF)',
  'linear-gradient(135deg,#B3541E,#FF7A66)',
  'linear-gradient(135deg,#1A5276,#62B0FF)',
  'linear-gradient(135deg,#8A6D1B,#E8B64C)',
]
export const CAT_COLORS = { default: '#62B0FF' }

export function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(m/60), d = Math.floor(h/24)
  if (m < 1)  return 'just now'
  if (m < 60) return m + 'm ago'
  if (h < 24) return h + 'h ago'
  if (d === 1) return 'Yesterday'
  return d + 'd ago'
}

export const initialsOf = (name) =>
  (name || '').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0,2) || 'UN'

// ── Activity log — the metrics backbone (same table the old hub used) ────────
export async function logActivity(activity_type, description, entity_title = null, dot_color = 'gold') {
  try { await sb.from('activity_log').insert({ activity_type, description, entity_title, dot_color }) } catch {}
}

// ── Session / profile / admin ────────────────────────────────────────────────
export function useSession() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user || null))
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!user) { setProfile(null); return }
    sb.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data || null))
    // Auto-add the member's organization to the Directory as a PENDING entry
    // (an admin approves it before it shows publicly). Idempotent — only inserts
    // if no org with that name exists yet.
    const orgName = (user.user_metadata?.org_name || '').trim()
    if (orgName) {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || ('org-' + user.id.slice(0, 8))
      sb.from('organizations').select('id').ilike('name', orgName).limit(1).then(({ data }) => {
        if (!data || data.length === 0) {
          sb.from('organizations').insert({ name: orgName, short_name: orgName, slug, submitted_by: user.id, approved: false }).then(() => {})
        }
      })
    }
  }, [user])
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email || ''
  return { user, profile, name, isAdmin: !!profile?.is_admin }
}

// ── Toast bus — popups for activity while online ─────────────────────────────
const toastListeners = new Set()
export function toast(msg, color) {
  toastListeners.forEach(fn => fn({ id: Math.random().toString(36).slice(2), msg, color }))
}
export function useToasts() {
  const [items, setItems] = useState([])
  useEffect(() => {
    const fn = (t) => {
      setItems(list => [...list, t])
      setTimeout(() => setItems(list => list.filter(x => x.id !== t.id)), 5000)
    }
    toastListeners.add(fn)
    return () => toastListeners.delete(fn)
  }, [])
  return items
}

// ── Live notifier: realtime if enabled, polling fallback ────────────────────
export function startNotifier() {
  let lastSeen = new Date().toISOString()
  // Try realtime
  try {
    sb.channel('hub-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' },
        payload => { const r = payload.new; if (r?.description) toast(r.description, r.dot_color) })
      .subscribe()
  } catch {}
  // Polling fallback (covers projects without realtime enabled on the table)
  const iv = setInterval(async () => {
    try {
      const { data } = await sb.from('activity_log').select('description,dot_color,created_at')
        .gt('created_at', lastSeen).order('created_at', { ascending: true }).limit(5)
      if (data?.length) {
        lastSeen = data[data.length - 1].created_at
        data.forEach(r => toast(r.description, r.dot_color))
      }
    } catch {}
  }, 45000)
  return () => clearInterval(iv)
}

// ── Body renderer: [IMAGE:url] / [VIDEO:url] markers + links + line breaks ───
// Returns an array of segment descriptors; React renders them (auto-escaped).
export function parseBody(body) {
  if (!body) return []
  const segs = []
  const rx = /\[(IMAGE|VIDEO):(https?:\/\/[^\]]+)\]/g
  let last = 0, m
  while ((m = rx.exec(body)) !== null) {
    if (m.index > last) segs.push({ type: 'text', text: body.slice(last, m.index) })
    segs.push({ type: m[1] === 'IMAGE' ? 'image' : 'video', url: m[2] })
    last = m.index + m[0].length
  }
  if (last < body.length) segs.push({ type: 'text', text: body.slice(last) })
  return segs
}
