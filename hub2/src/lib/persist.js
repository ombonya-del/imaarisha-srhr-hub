import { useState, useEffect } from 'react'
import { sb } from './supabase'

// ── Keep the admin's place ────────────────────────────────────────────────────
// Desk, open editor and half-written drafts (answers, myth cards, learn rows,
// broadcasts…) are mirrored to localStorage, so switching desks, reloading,
// leaving the app or losing signal never throws work away. Everything is cleared
// on sign-out so the next person on a shared machine starts clean.
const PREFIX = 'imaarisha.admin.'

const read = (k, d) => {
  try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v) } catch { return d }
}
const write = (k, v) => {
  try {
    if (v === undefined) localStorage.removeItem(PREFIX + k)
    else localStorage.setItem(PREFIX + k, JSON.stringify(v))
  } catch { /* storage full / private mode — keep working in memory */ }
}

// Drop-in for useState: same API, but the value survives navigation & reloads.
export function usePersisted(key, initial) {
  const [v, setV] = useState(() => {
    const init = typeof initial === 'function' ? initial() : initial
    return read(key, init)
  })
  useEffect(() => { write(key, v) }, [key, v])
  return [v, setV]
}

export const getPersisted = read
export const setPersisted = write

export function clearAdminDrafts() {
  try { Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
}

// Wipe drafts whenever anyone signs out, wherever the sign-out button lives.
try { sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') clearAdminDrafts() }) } catch { /* ignore */ }

// Scroll the item you were last working on back into view after a reload.
export function scrollToWork(id) {
  if (!id) return
  setTimeout(() => {
    const el = document.getElementById('work-' + id)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, 120)
}
