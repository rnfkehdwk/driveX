const CACHE_NAME = 'drivelog-v2.0';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 요청은 항상 네트워크
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: '오프라인' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        })
      )
    );
    return;
  }

  // JS/CSS 파일: 네트워크 우선 (최신 빌드 항상 반영)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          if (r.ok) {
            const cl = r.clone();
            caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl));
          }
          return r;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML: 네트워크 우선
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          if (r.ok) {
            const cl = r.clone();
            caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl));
          }
          return r;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 나머지 (이미지 등): 캐시 우선
  event.respondWith(
    caches.match(event.request).then((c) =>
      c || fetch(event.request).then((r) => {
        if (r.ok) {
          const cl = r.clone();
          caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl));
        }
        return r;
      })
    )
  );
});
