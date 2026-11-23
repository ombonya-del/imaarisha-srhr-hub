import { sb } from './supabase'
import { normCode } from './persist'

// Public VAPID key — safe to ship to the browser. Same keypair the hub uses;
// the private key is an edge-function secret (VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC_KEY = 'BCWPRNd3X295MwN-gbIKdAQKaFjBK8zTh_EcDl9Zs6gNWd8_x2E1coAwnNSlbf41ZX2EzpPk-1vUXKJgY2Bhenk'

const urlBase64ToUint8Array = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

// SHA-256 hex — matches turnstile-verify + uliza_lookup, so the code itself
// never leaves the device even to subscribe for a notification.
async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// iOS only delivers web push to an installed (home-screen) PWA.
export const iosNeedsInstall = () => {
  if (typeof navigator === 'undefined') return false
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  return ios && !standalone
}

// Opt in to a one-time "your answer is ready" nudge for a question code.
// Returns 'ok' | 'blocked' | 'unsupported' | 'ios' | 'error'.
export async function notifyWhenAnswered(code, lang = 'en') {
  if (!pushSupported()) return iosNeedsInstall() ? 'ios' : 'unsupported'
  try {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return 'blocked'
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
    const j = sub.toJSON()
    const ticket_hash = await sha256hex(normCode(code))
    const { data, error } = await sb.rpc('ukweli_ask_subscribe', {
      p: { ticket_hash, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, lang },
    })
    if (error || data !== 'ok') return 'error'
    return 'ok'
  } catch (_e) { return 'error' }
}
