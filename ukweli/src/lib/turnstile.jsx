// Cloudflare Turnstile — shared widget + verified submit helper.
// The Site Key is public (safe to ship). The Secret Key lives only in the
// turnstile-verify edge function's env (supabase secrets set TURNSTILE_SECRET).
import { useEffect, useRef } from 'react'

export const TURNSTILE_SITE_KEY = '0x4AAAAAADumRx6DdoO40I8b'

let _scriptPromise = null
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve()
  if (_scriptPromise) return _scriptPromise
  _scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.appendChild(s)
  })
  return _scriptPromise
}

// Renders the Turnstile widget. Calls onVerify(token) when solved, onVerify('')
// when the token expires or errors (so the caller can disable submit again).
export function TurnstileWidget({ onVerify, theme = 'auto' }) {
  const boxRef = useRef(null)
  const idRef = useRef(null)
  useEffect(() => {
    let cancelled = false
    loadTurnstile().then(() => {
      if (cancelled || !boxRef.current || !window.turnstile) return
      idRef.current = window.turnstile.render(boxRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme,
        callback: (t) => onVerify(t),
        'expired-callback': () => onVerify(''),
        'error-callback': () => onVerify(''),
      })
    }).catch(() => {})
    return () => {
      cancelled = true
      try { if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current) } catch (_e) {}
    }
  }, [])
  return <div ref={boxRef} style={{ margin: '12px 0' }} />
}

// Reset a widget so the user can get a fresh token after a submit.
export function resetTurnstile() {
  try { if (window.turnstile) window.turnstile.reset() } catch (_e) {}
}

// Drop-in replacement for `sb.from(table).insert(payload)` on public forms:
// routes the submit through the verify edge function. Returns { data, error }
// with the same shape as supabase, so callers can keep their existing handling.
export async function tsInsert(sb, table, payload, token) {
  if (!token) return { data: null, error: { message: 'Please complete the verification.' } }
  const { data, error } = await sb.functions.invoke('turnstile-verify', {
    body: { token, table, payload },
  })
  if (error) return { data: null, error: { message: 'Verification failed. Please try again.' } }
  if (data && data.ok === false) return { data: null, error: { message: data.error || 'Verification failed.' } }
  return { data, error: null }
}
