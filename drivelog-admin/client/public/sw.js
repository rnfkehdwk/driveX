// DriveLog Admin Service Worker
// v1.0 - 2026-04-22: Web Push 알림용 (캐싱 없음, 최소 구성)
// 용도: SUPER_ADMIN이 admin 웹을 닫고 있어도 콜 수락 알림 수신

const SW_VERSION = 'drivelog-admin-v1.0';

self.addEventListener('install', (event) => {
  // 즉시 활성화 (캐싱 없음)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 모든 클라이언트 즉시 장악
  event.waitUntil(self.clients.claim());
});

// fetch 핸들러 없음 — admin은 캐싱 안 함
// (캐싱이 필요하면 추후 추가, 일단 푸시만 동작)

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
    // 진동 패턴: 짧게-쉬고-짧게-쉬고-짧게 (콜 긴급감)
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'drivelog-admin-notification',
    // requireInteraction: false → 자동 사라짐
    requireInteraction: false,
    // renotify: 같은 tag라도 새로 울림
    renotify: true,
    data: {
      url: data.url || '/admin/',
      callId: data.callId || null,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 시 → admin 창 열고 해당 URL로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/admin/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 admin 창이 있으면 focus + 해당 URL로 이동
      for (const client of clientList) {
        if (client.url.includes('/admin/') && 'focus' in client) {
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
  console.log('[sw-admin] pushsubscriptionchange event');
  // 재구독은 메인 앱 측(PushManager)에서 다음 로그인 시 처리
});
