// DriveLog Mobile PWA Service Worker
// v3.0 - 2026-04-27: PWA 캐시 자동 갱신 인프라
// mon45nck는 vite injectSwBuildId 플러그인이 빌드 시점에 치환하므로
// 매 빌드마다 sw.js 자체가 바이트 단위로 달라짐 → 브라우저가 새 SW 자동 감지
const BUILD_ID = 'mon45nck';
const CACHE_NAME = `drivelog-${BUILD_ID}`;

// 정적 자산만 캐시 (HTML은 의도적으로 제외 — 항상 네트워크에서 받아 새 JS 해시 파일명 갱신)
const STATIC_ASSETS = ['/m/manifest.json', '/m/icon-192.png', '/m/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS))
  );
  // 새 SW 즉시 활성화 (대기 큐 건너뛰기)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  // 모든 클라이언트(열린 탭/PWA)를 즉시 이 SW가 제어하도록
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1) API 요청은 절대 캐시하지 않음
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: '오프라인' }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      ))
    );
    return;
  }

  // 2) HTML / navigation 요청은 항상 네트워크 우선, no-store 강제
  //    → 새 JS 해시 파일명을 매번 받기 위함. 오프라인 fallback도 제공하지 않음
  //    (PWA가 오프라인에서 동작할 필요 없음 — 항상 서버 통신 필수)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
    );
    return;
  }

  // 3) JS/CSS는 해시 파일명이라 안전하게 cache-first (속도 최적화)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((r) => {
          if (r.ok) {
            const cl = r.clone();
            caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl));
          }
          return r;
        });
      })
    );
    return;
  }

  // 4) 기타 자산(이미지 등) cache-first
  event.respondWith(
    caches.match(event.request).then((c) => c || fetch(event.request).then((r) => {
      if (r.ok) {
        const cl = r.clone();
        caches.open(CACHE_NAME).then((ca) => ca.put(event.request, cl));
      }
      return r;
    }))
  );
});

// 메인 앱에서 '즉시 SW 교체' 메시지를 보낼 때 처리
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
