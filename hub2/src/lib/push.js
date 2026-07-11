import { sb } from './supabase'

// Public VAPID key — safe to ship to the browser. Generate a pair with
//   npx web-push generate-vapid-keys
// then paste the PUBLIC key here and set the PRIVATE key as an edge-function
// secret (supabase secrets set VAPID_PRIVATE_KEY=… VAPID_PUBLIC_KEY=…).
export const VAPID_PUBLIC_KEY = 'BCWPRNd3X295MwN-gbIKdAQKaFjBK8zTh_EcDl9Zs6gNWd8_x2E1coAwnNSlbf41ZX2EzpPk-1vUXKJgY2Bhenk'

const urlBase64ToUint8Array = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export async function isPushOn() {
  if (!pushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.ready
    return !!(await reg.pushManager.getSubscription())
  } catch { return false }
}

export async function enablePush(userId) {
  if (!pushSupported()) throw new Error('This device or browser does not support notifications.')
  if (VAPID_PUBLIC_KEY.startsWith('__REPLACE')) throw new Error('Notifications aren’t configured yet (missing VAPID key).')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications are blocked — enable them in your browser settings.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) })
  const j = sub.toJSON()
  const { error } = await sb.from('push_subscriptions').upsert(
    { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_id: userId, subscription_group: 'hub_members' },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return true
}

export async function disablePush() {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    try { await sub.unsubscribe() } catch {}
  }
}
