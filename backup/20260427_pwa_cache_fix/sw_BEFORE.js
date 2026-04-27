// DriveLog Mobile PWA Service Worker
// v2.4 - 2026-04-15: Web Push 알림 추가
const CACHE_NAME = 'drivelog-v2.4';
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
  if (url.pathname.startsWith('/api/')) { event.respondWith(fetch(event.request).catch(() => new Response(JSON.stringify({ error: '오프라인' }), { headers: { 'Content-Type': 'application/json' }, status: 503 }))); return; }
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) { event.respondWith(fetch(event.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl)); } return r; }).catch(() => caches.match(event.request))); return; }
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) { event.respondWith(fetch(event.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl)); } return r; }).catch(() => caches.match('/index.html'))); return; }
  event.respondWith(caches.match(event.request).then((c) => c || fetch(event.request).then((r) => { if (r.ok) { const cl = r.clone(); caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl)); } return r; })));
});

// ============================================================
// Web Push 이벤트 리스너
// ============================================================

// 서버에서 푸시 도착 시
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'DriveLog', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'DriveLog';
  const options = {
    body: data.body || '',
    icon: '/m/icon-192.png',
    badge: '/m/icon-192.png',
    // 진동 패턴: 짧게-쉬고-짧게-쉬고-짧게 (콜 긴급감)
    // Android가 자동으로 시스템 기본 소리도 함께 재생
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'drivelog-notification',
    // requireInteraction: false → 자동 사라짐 (사장님 요청)
    requireInteraction: false,
    // renotify: 같은 tag라도 새로 울림
    renotify: true,
    data: {
      url: data.url || '/m/',
      callId: data.callId || null,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 시 → 앱 열고 해당 URL로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/m/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 focus + 해당 URL로 이동
      for (const client of clientList) {
        if (client.url.includes('/m/') && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          } else {
            client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          }
          return;
        }
      }
      // 없으면 새 창 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// 구독 만료/변경 시 (브라우저가 자동 발생시킴)
self.addEventListener('pushsubscriptionchange', (event) => {
  // 재구독은 메인 앱 측(PushManager)에서 처리하는 게 안전
  // 여기서는 로그만 남김
  console.log('[sw] pushsubscriptionchange event');
});
