const express = require('express');
const router = express.Router();
const https = require('https');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// 텔레그램 설정
const TELEGRAM_BOT_TOKEN = '8202081780:AAHOrAuyh6O70M98vRK-G210QvFjGjzNPo0';
const TELEGRAM_CHAT_ID = '8282655551';

function sendTelegram(message) {
  const data = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' });
  const req = https.request({
    hostname: 'api.telegram.org', path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  });
  req.on('error', (e) => console.error('Telegram error:', e.message));
  req.write(data);
  req.end();
}

const TYPE_LABEL = { RENEWAL: '갱신 문의', UPGRADE: '업그레이드', DOWNGRADE: '다운그레이드', GENERAL: '일반 문의', BUG: '버그 신고' };
const STATUS_LABEL = { PENDING: '대기', IN_PROGRESS: '처리중', RESOLVED: '처리완료', CLOSED: '종료' };

// GET /api/inquiries - 문의 목록
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let where = '';
    const params = [];

    if (req.user.role === 'MASTER') {
      // MASTER: 전체 문의 조회
      where = 'WHERE 1=1';
    } else {
      // SUPER_ADMIN/RIDER: 자기 업체 문의만
      where = 'WHERE i.company_id = ?';
      params.push(req.user.company_id);
    }
    if (status) { where += ' AND i.status = ?'; params.push(status); }

    const [rows] = await pool.execute(
      `SELECT i.*, c.company_name, c.company_code, u.name AS user_name, u.role AS user_role,
              r.name AS replied_by_name
       FROM inquiries i
       JOIN companies c ON i.company_id = c.company_id
       JOIN users u ON i.user_id = u.user_id
       LEFT JOIN users r ON i.replied_by = r.user_id
       ${where} ORDER BY i.created_at DESC`, params
    );

    const summary = {
      total: rows.length,
      pending: rows.filter(r => r.status === 'PENDING').length,
      in_progress: rows.filter(r => r.status === 'IN_PROGRESS').length,
      resolved: rows.filter(r => r.status === 'RESOLVED').length,
    };

    res.json({ data: rows, summary });
  } catch (err) {
    console.error('GET /inquiries error:', err);
    res.status(500).json({ error: '문의 목록 조회 실패' });
  }
});

// POST /api/inquiries - 문의 등록 (SUPER_ADMIN, RIDER)
router.post('/', authenticate, async (req, res) => {
  try {
    const { inquiry_type, title, content } = req.body;
    if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });

    const [result] = await pool.execute(
      'INSERT INTO inquiries (company_id, user_id, inquiry_type, title, content) VALUES (?, ?, ?, ?, ?)',
      [req.user.company_id, req.user.user_id, inquiry_type || 'GENERAL', title, content || null]
    );

    // 업체 정보 조회
    const [compInfo] = await pool.execute(
      'SELECT c.company_name, c.company_code, c.plan_id, p.plan_name, c.license_expires FROM companies c LEFT JOIN billing_plans p ON c.plan_id = p.plan_id WHERE c.company_id = ?',
      [req.user.company_id]
    );
    const comp = compInfo[0] || {};

    // 텔레그램 알림
    const typeLabel = TYPE_LABEL[inquiry_type] || '일반 문의';
    const msg = `🔔 <b>새 문의 등록</b>\n\n`
      + `📋 유형: <b>${typeLabel}</b>\n`
      + `🏢 업체: ${comp.company_name} (${comp.company_code})\n`
      + `👤 작성자: ${req.user.name}\n`
      + `📌 제목: ${title}\n`
      + (content ? `💬 내용: ${content.slice(0, 200)}\n` : '')
      + `\n📊 요금제: ${comp.plan_name || '미지정'}`
      + (comp.license_expires ? `\n📅 만료일: ${comp.license_expires.toString().slice(0, 10)}` : '')
      + `\n\n🔗 관리자에서 확인하세요`;

    sendTelegram(msg);

    res.status(201).json({ id: result.insertId, message: '문의가 등록되었습니다. 관리자가 확인 후 답변드리겠습니다.' });
  } catch (err) {
    console.error('POST /inquiries error:', err);
    res.status(500).json({ error: '문의 등록 실패' });
  }
});

// PUT /api/inquiries/:id/reply - 답변 등록 (MASTER)
router.put('/:id/reply', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { reply, status } = req.body;
    if (!reply) return res.status(400).json({ error: '답변 내용을 입력해주세요.' });

    await pool.execute(
      'UPDATE inquiries SET reply = ?, replied_by = ?, replied_at = NOW(), status = ? WHERE id = ?',
      [reply, req.user.user_id, status || 'RESOLVED', req.params.id]
    );
    res.json({ message: '답변이 등록되었습니다.' });
  } catch (err) { res.status(500).json({ error: '답변 등록 실패' }); }
});

// PUT /api/inquiries/:id/status - 상태 변경 (MASTER)
router.put('/:id/status', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: '상태를 선택해주세요.' });
    await pool.execute('UPDATE inquiries SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `상태가 '${STATUS_LABEL[status] || status}'로 변경되었습니다.` });
  } catch (err) { res.status(500).json({ error: '상태 변경 실패' }); }
});

module.exports = router;
