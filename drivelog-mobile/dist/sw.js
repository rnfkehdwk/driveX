const CACHE_NAME = 'drivelog-v1.7';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: '오프라인' }), { headers: { 'Content-Type': 'application/json' }, status: 503 })));
    return;
  }
  event.respondWith(caches.match(event.request).then((c) => c || fetch(event.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl)); } return r; })));
});
