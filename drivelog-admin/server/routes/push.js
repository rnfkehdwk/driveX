// drivelog-admin/server/routes/push.js
// Web Push 구독 관리 엔드포인트
// 2026-04-15 신규

const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { hashEndpoint, sendToOne } = require('../utils/pushSender');

// GET /api/push/public-key - VAPID 공개키 반환 (프론트 구독 시 필요)
router.get('/public-key', (req, res) => {
  const pub = process.env.VAPID_PUBLIC_KEY || null;
  res.json({ public_key: pub });
});

// POST /api/push/subscribe - 구독 등록/갱신
// Body: { endpoint, keys: { p256dh, auth }, userAgent? }
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys, userAgent } = req.body || {};
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'endpoint, keys.p256dh, keys.auth 필수' });
    }

    const endpointHash = hashEndpoint(endpoint);
    const ua = (userAgent || req.headers['user-agent'] || '').slice(0, 500);

    // UPSERT: 같은 endpoint_hash면 갱신 (기기 재구독 대응)
    await pool.execute(
      `INSERT INTO push_subscriptions
         (user_id, company_id, endpoint, endpoint_hash, p256dh_key, auth_key, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         company_id = VALUES(company_id),
         endpoint = VALUES(endpoint),
         p256dh_key = VALUES(p256dh_key),
         auth_key = VALUES(auth_key),
         user_agent = VALUES(user_agent)`,
      [req.user.user_id, req.user.company_id, endpoint, endpointHash, keys.p256dh, keys.auth, ua]
    );

    res.json({ ok: true, message: '푸시 알림이 활성화되었습니다.' });
  } catch (err) {
    console.error('POST /push/subscribe error:', err);
    res.status(500).json({ error: '구독 등록 실패' });
  }
});

// POST /api/push/unsubscribe - 구독 해제
// Body: { endpoint }
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint 필수' });

    const endpointHash = hashEndpoint(endpoint);
    await pool.execute(
      'DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND user_id = ?',
      [endpointHash, req.user.user_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /push/unsubscribe error:', err);
    res.status(500).json({ error: '구독 해제 실패' });
  }
});

// POST /api/push/test - 본인 기기에 테스트 푸시 발송
// 디버깅/검증용
router.post('/test', authenticate, async (req, res) => {
  try {
    const [subs] = await pool.execute(
      'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = ?',
      [req.user.user_id]
    );
    if (subs.length === 0) {
      return res.status(404).json({ error: '등록된 구독이 없습니다. 먼저 알림 허용 후 다시 시도하세요.' });
    }

    const payload = {
      title: '🔔 DriveLog 테스트 알림',
      body: '푸시 알림이 정상 동작합니다.',
      url: '/m/',
      tag: 'test-notification',
    };

    const results = [];
    for (const s of subs) {
      const r = await sendToOne(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } },
        payload
      );
      results.push(r);
    }
    res.json({ ok: true, count: subs.length, results });
  } catch (err) {
    console.error('POST /push/test error:', err);
    res.status(500).json({ error: '테스트 발송 실패' });
  }
});

module.exports = router;
