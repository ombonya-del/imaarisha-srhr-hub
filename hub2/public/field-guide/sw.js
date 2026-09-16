/* ImaarishaSRHR Field Guide — service worker (offline-first) */
const CACHE = 'imaarisha-fieldguide-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './Facilitator_Manual.pdf',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App shell + same-origin: cache-first, fall back to network, then cache the fresh copy.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Google Fonts (stylesheet + font files): stale-while-revalidate so type survives offline.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((hit) => {
        const net = fetch(req).then((res) => { c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => hit);
        return hit || net;
      }))
    );
  }
});
