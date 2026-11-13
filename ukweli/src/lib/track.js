// Anonymous usage analytics for UkweliSRHR.
//
// What is recorded: which part of the app was used (tab / item opened), the
// app language, a coarse device type (mobile / desktop), the county the user
// chose to share (optional), and the partner link they arrived through
// (?ref=naya). No names, no IP addresses, no cookies, no question text.
//
// "visitor" is a random id kept on this device and replaced every calendar
// month, so the report can count unique visitors per month without being able
// to follow anyone over time. "session" is a random id for this browser tab.
//
// Events are written through the ukweli_track() database function; the events
// table itself can't be read or written directly.

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const rand = () => {
  try { return crypto.randomUUID().replace(/-/g, '').slice(0, 20) }
  catch { return (Math.random().toString(36) + Math.random().toString(36)).replace(/[^a-z0-9]/g, '').slice(0, 20) }
}
const month = () => new Date().toISOString().slice(0, 7)
const ls = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
}

function visitorId() {
  const m = month()
  try {
    const v = JSON.parse(ls.get('ukweli_vid') || 'null')
    if (v && v.m === m && v.id) return v.id
  } catch {}
  const id = rand()
  ls.set('ukweli_vid', JSON.stringify({ id, m }))
  return id
}

function sessionId() {
  try {
    let s = sessionStorage.getItem('ukweli_sid')
    if (!s) { s = rand(); sessionStorage.setItem('ukweli_sid', s) }
    return s
  } catch { return null }
}

// Partner link: ?ref=<partner> is remembered on this device (latest link wins)
// and then removed from the address bar so it isn't shared onwards by accident.
export function captureRef() {
  try {
    const u = new URL(window.location.href)
    const r = (u.searchParams.get('ref') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40)
    if (r) {
      ls.set('ukweli_ref', r)
      u.searchParams.delete('ref')
      history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash)
    }
  } catch {}
}

// County: optional, chosen by the user once. 'skip' means they declined.
export const getCounty = () => ls.get('ukweli_county')
export function setCounty(c) {
  ls.set('ukweli_county', c)
  if (c && c !== 'skip') track('county', { item: c })
}

const device = () => (window.matchMedia && window.matchMedia('(min-width: 900px)').matches ? 'desktop' : 'mobile')
const currentLang = () => ls.get('imaarisha_lang') || 'en'

let queue = []
let timer = null

function flush(useBeacon) {
  if (!queue.length || !URL_ || !KEY) { queue = []; return }
  const events = queue.splice(0, 50)
  try {
    fetch(`${URL_}/rest/v1/rpc/ukweli_track`, {
      method: 'POST',
      keepalive: !!useBeacon,
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ events }),
    }).catch(() => {})
  } catch {}
  if (queue.length) flush(useBeacon)
}

export function track(event, data = {}) {
  try {
    const county = getCounty()
    queue.push({
      event,
      tab: data.tab || null,
      item: data.item != null ? String(data.item).slice(0, 80) : null,
      visitor: visitorId(),
      session: sessionId(),
      lang: currentLang(),
      county: county && county !== 'skip' ? county : null,
      ref: ls.get('ukweli_ref'),
      device: device(),
    })
    clearTimeout(timer)
    timer = setTimeout(() => flush(false), 3000)
  } catch {}
}

let started = false
export function startTracking() {
  if (started) return
  started = true
  captureRef()
  try {
    if (!sessionStorage.getItem('ukweli_visit')) {
      sessionStorage.setItem('ukweli_visit', '1')
      track('visit')
    }
  } catch { track('visit') }
  const out = () => flush(true)
  window.addEventListener('pagehide', out)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') out() })
}
