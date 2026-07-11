// Push handlers, imported into the Workbox-generated service worker via
// vite-plugin-pwa's workbox.importScripts. Renders the notification and, on
// click, focuses/opens the hub at the deep link carried in the payload.
self.addEventListener('push', (event) => {
  let n = { title: 'ImaarishaSRHR Hub', body: '', tag: 'imaarisha', url: '/' }
  try {
    if (event.data) {
      const d = event.data.json()
      n = { title: d.title || n.title, body: d.body || '', tag: d.tag || 'imaarisha', url: d.url || '/' }
    }
  } catch (_) { /* non-JSON payload — keep defaults */ }
  event.waitUntil(self.registration.showNotification(n.title, {
    body: n.body, tag: n.tag, data: { url: n.url }, icon: '/icon-192.png', badge: '/icon-192.png',
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { try { c.navigate(url) } catch (_) {} return c.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
