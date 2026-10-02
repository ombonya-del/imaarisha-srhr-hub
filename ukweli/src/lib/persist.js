import { useState, useEffect, useCallback } from 'react'

// ── Keep the reader's place ───────────────────────────────────────────────────
// The URL hash holds WHERE you are (#learn/mental, #fika/Kisumu, #ask/mine), so
// reloading, switching apps or tapping back returns you to the same tab and item.
// Unsent drafts live in sessionStorage: they survive navigating away and back in
// the same tab, but vanish when the tab is closed or Quick Exit is pressed — a
// half-typed SRHR question should never sit on a shared phone indefinitely.

export const TAB_IDS = ['ask', 'myths', 'disinfo', 'learn', 'fika']
const PREFIX = 'uk:'

const readHash = () => {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '')
  const [t, ...rest] = raw.split('/')
  const tab = TAB_IDS.includes(t) ? t : 'ask'
  let item = rest.join('/') || null
  try { item = item ? decodeURIComponent(item) : null } catch { /* keep raw */ }
  return { tab, item }
}

export function useHashRoute() {
  const [route, setRoute] = useState(readHash)
  useEffect(() => {
    const on = () => setRoute(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  // Changing tab adds a history entry (so Back works); opening/closing an item
  // within a tab replaces it (so Back doesn't step through every card you opened).
  const go = useCallback((tab, item = null, { replace = false } = {}) => {
    const h = '#' + tab + (item ? '/' + encodeURIComponent(item) : '')
    if (window.location.hash === h) return
    if (replace) { history.replaceState(null, '', h); setRoute(readHash()) }
    else window.location.hash = h
  }, [])
  return [route, go]
}

const ssGet = (k, d) => { try { const v = sessionStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v) } catch { return d } }
const ssSet = (k, v) => { try { sessionStorage.setItem(PREFIX + k, JSON.stringify(v)) } catch { /* private mode etc. */ } }

// useState that survives navigating away and back in the same browser tab.
export function useSessionState(key, initial) {
  const [v, setV] = useState(() => ssGet(key, initial))
  useEffect(() => { ssSet(key, v) }, [key, v])
  return [v, setV]
}

export function clearSessionDrafts() {
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith(PREFIX)).forEach(k => sessionStorage.removeItem(k))
  } catch { /* ignore */ }
}

// Scroll a remembered item back into view once it has rendered.
export function useScrollToItem(id, ready) {
  useEffect(() => {
    if (!id || !ready) return
    const t = setTimeout(() => {
      const el = document.getElementById('uk-item-' + id)
      if (el) el.scrollIntoView({ block: 'start', behavior: 'auto' })
    }, 60)
    return () => clearTimeout(t)
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Private question codes ────────────────────────────────────────────────────
// A random 12-character code (≈59 bits). Only its SHA-256 hash is stored on the
// server, so the code is the asker's alone. Ambiguous characters (0/O, 1/I/L)
// are left out so it can be copied by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function newQuestionCode() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length]
  return s
}
export const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
export const prettyCode = (c) => normCode(c).replace(/(.{4})(?=.)/g, '$1-')

const CODES_KEY = 'ukweli_my_questions'
export function loadSavedCodes() {
  try { const a = JSON.parse(localStorage.getItem(CODES_KEY) || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}
export function saveCode(code) {
  const list = loadSavedCodes().filter(x => x.code !== normCode(code))
  list.unshift({ code: normCode(code), at: new Date().toISOString() })
  try { localStorage.setItem(CODES_KEY, JSON.stringify(list.slice(0, 20))) } catch { /* ignore */ }
  return list.slice(0, 20)
}
export function forgetSavedCodes() { try { localStorage.removeItem(CODES_KEY) } catch { /* ignore */ } }
