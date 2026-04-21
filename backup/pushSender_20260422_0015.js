// drivelog-admin/server/utils/pushSender.js
// Web Push 발송 헬퍼
// 용도: 콜 생성 시 같은 회사의 활성 RIDER에게 푸시 알림 발송
// 2026-04-15 신규

const crypto = require('crypto');
const { pool } = require('../config/database');

// web-push 패키지 graceful load (미설치 시 서버 안 죽음)
let webpush = null;
try {
  webpush = require('web-push');
} catch (err) {
  console.warn('[push] web-push 패키지 미설치. 푸시 비활성화. `npm install web-push` 필요.');
}

// VAPID 초기화 (환경변수에서 읽음)
let vapidReady = false;
function initVapid() {
  if (!webpush) return false;
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:drivelogTC@gmail.com';
  if (!pub || !priv) {
    console.warn('[push] VAPID 키 미설정 (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). .env 확인.');
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidReady = true;
    console.log('[push] VAPID 초기화 완료');
    return true;
  } catch (err) {
    console.error('[push] VAPID 초기화 실패:', err.message);
    return false;
  }
}

// endpoint → SHA-256 hex (UNIQUE key용)
function hashEndpoint(endpoint) {
  return crypto.createHash('sha256').update(endpoint).digest('hex');
}

// 한 구독에 푸시 발송
// 반환: { ok: true } 또는 { ok: false, gone: true }  (gone=true면 구독 삭제 필요)
async function sendToOne(subscription, payload) {
  if (!webpush || !initVapid()) return { ok: false, error: 'NOT_CONFIGURED' };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    // 410 Gone / 404 Not Found = 구독 만료 → DB에서 삭제해야 함
    const gone = err.statusCode === 410 || err.statusCode === 404;
    return { ok: false, gone, error: err.message, statusCode: err.statusCode };
  }
}

// 회사의 모든 활성 RIDER(+ 같은 회사 SUPER_ADMIN)에게 푸시 발송
// 실패한 구독은 자동으로 DB에서 삭제
// fire-and-forget: 호출자는 await 안 해도 됨
async function sendToCompanyRiders(companyId, payload, options = {}) {
  if (!webpush || !initVapid()) {
    console.warn('[push] 발송 스킵: VAPID 미설정');
    return { sent: 0, failed: 0, removed: 0 };
  }

  try {
    // 같은 회사의 활성 RIDER 모두 (SUPER_ADMIN도 원하면 포함 가능)
    const includeSuperAdmin = options.includeSuperAdmin !== false;
    const roleFilter = includeSuperAdmin
      ? "u.role IN ('RIDER', 'SUPER_ADMIN')"
      : "u.role = 'RIDER'";

    const [subs] = await pool.execute(
      `SELECT ps.id, ps.endpoint, ps.p256dh_key, ps.auth_key, ps.user_id
       FROM push_subscriptions ps
       INNER JOIN users u ON u.user_id = ps.user_id
       WHERE ps.company_id = ? AND u.status = 'ACTIVE' AND ${roleFilter}`,
      [companyId]
    );

    if (subs.length === 0) {
      console.log(`[push] 회사 ${companyId} 활성 구독 없음`);
      return { sent: 0, failed: 0, removed: 0 };
    }

    let sent = 0, failed = 0, removed = 0;
    const removeIds = [];

    // 병렬 발송 (Promise.allSettled)
    const results = await Promise.allSettled(
      subs.map(s =>
        sendToOne(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
          payload
        ).then(r => ({ sub: s, r }))
      )
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') { failed++; continue; }
      const { sub, r } = result.value;
      if (r.ok) {
        sent++;
      } else {
        failed++;
        if (r.gone) removeIds.push(sub.id);
      }
    }

    // 만료된 구독 일괄 삭제
    if (removeIds.length > 0) {
      const placeholders = removeIds.map(() => '?').join(',');
      await pool.execute(
        `DELETE FROM push_subscriptions WHERE id IN (${placeholders})`,
        removeIds
      );
      removed = removeIds.length;
      console.log(`[push] 만료 구독 ${removed}건 삭제`);
    }

    // 성공한 구독의 last_used_at 업데이트 (best-effort, 실패 무시)
    if (sent > 0) {
      const successIds = results
        .filter(r => r.status === 'fulfilled' && r.value.r.ok)
        .map(r => r.value.sub.id);
      if (successIds.length > 0) {
        const ph = successIds.map(() => '?').join(',');
        pool.execute(
          `UPDATE push_subscriptions SET last_used_at = NOW() WHERE id IN (${ph})`,
          successIds
        ).catch(() => {});
      }
    }

    console.log(`[push] 회사 ${companyId}: 발송 ${sent}, 실패 ${failed}, 삭제 ${removed}`);
    return { sent, failed, removed };
  } catch (err) {
    console.error('[push] sendToCompanyRiders 오류:', err);
    return { sent: 0, failed: 0, removed: 0, error: err.message };
  }
}

module.exports = {
  hashEndpoint,
  sendToOne,
  sendToCompanyRiders,
  initVapid,
};
