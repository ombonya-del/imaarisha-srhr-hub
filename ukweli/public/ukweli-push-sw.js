// UkweliSRHR — push + notification-click handlers, merged into the Workbox
// service worker via vite.config workbox.importScripts. Shows the nudge that
// notify-asker sends and, on tap, opens the app at "My questions".
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch (_e) { d = {} }
  const title = d.title || 'UkweliSRHR'
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    tag: d.tag || 'ukweli',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    data: { url: d.url || '/' },
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) { try { await c.navigate(target) } catch (_e) {} ; return c.focus() }
    }
    if (clients.openWindow) return clients.openWindow(target)
  })())
})
