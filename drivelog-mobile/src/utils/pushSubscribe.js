// drivelog-mobile/src/utils/pushSubscribe.js
// Web Push 구독 헬퍼
// 2026-04-15

import { fetchPushPublicKey, subscribePush, unsubscribePush } from '../api/client';

// base64url → Uint8Array (VAPID 키 변환용)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// 푸시 지원 여부 확인
export function isPushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// 권한 상태: 'default' | 'granted' | 'denied'
export function getPermission() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// 권한 요청 후 구독 등록
// 반환: { ok, reason?, subscription? }
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    return { ok: false, reason: 'NOT_SUPPORTED' };
  }

  // 1. 알림 권한 요청
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return { ok: false, reason: 'PERMISSION_DENIED' };
  }

  // 2. Service Worker 준비 대기
  const registration = await navigator.serviceWorker.ready;

  // 3. 기존 구독 확인
  let subscription = await registration.pushManager.getSubscription();

  // 4. 없으면 새로 구독
  if (!subscription) {
    const { public_key } = await fetchPushPublicKey();
    if (!public_key) {
      return { ok: false, reason: 'VAPID_NOT_CONFIGURED' };
    }
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });
    } catch (err) {
      console.error('[push] subscribe 실패:', err);
      return { ok: false, reason: 'SUBSCRIBE_FAILED', error: err.message };
    }
  }

  // 5. 백엔드에 구독 정보 전송
  try {
    const json = subscription.toJSON();
    await subscribePush({
      endpoint: json.endpoint,
      keys: json.keys,
      userAgent: navigator.userAgent,
    });
    return { ok: true, subscription };
  } catch (err) {
    console.error('[push] 백엔드 등록 실패:', err);
    return { ok: false, reason: 'BACKEND_FAILED', error: err.message };
  }
}

// 구독 해제
export async function disablePushNotifications() {
  if (!isPushSupported()) return { ok: false };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { ok: true };

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await unsubscribePush({ endpoint }).catch(() => {});
    return { ok: true };
  } catch (err) {
    console.error('[push] 해제 실패:', err);
    return { ok: false, error: err.message };
  }
}

// 현재 구독 상태 확인 (UI 표시용)
export async function getSubscriptionStatus() {
  if (!isPushSupported()) return { supported: false };
  if (Notification.permission !== 'granted') {
    return { supported: true, permission: Notification.permission, subscribed: false };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      permission: 'granted',
      subscribed: !!subscription,
    };
  } catch {
    return { supported: true, permission: 'granted', subscribed: false };
  }
}
