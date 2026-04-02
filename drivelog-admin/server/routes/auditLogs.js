const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audit-logs — 감사 로그 조회
router.get('/', authenticate, authorize('MASTER', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { action, user_id, limit = 50, page = 1, date_from, date_to } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    // SUPER_ADMIN은 자기 업체 로그만
    if (req.user.role !== 'MASTER') {
      where += ' AND a.company_id = ?';
      params.push(req.user.company_id);
    }

    if (action) { where += ' AND a.action = ?'; params.push(action); }
    if (user_id) { where += ' AND a.user_id = ?'; params.push(parseInt(user_id)); }
    if (date_from) { where += ' AND DATE(a.created_at) >= ?'; params.push(date_from); }
    if (date_to) { where += ' AND DATE(a.created_at) <= ?'; params.push(date_to); }

    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const offset = (pageNum - 1) * limitNum;

    // 전체 건수
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params
    );
    const total = countResult[0].total;

    // 데이터 조회
    const [rows] = await pool.execute(
      `SELECT a.*, u.name AS user_name, u.login_id, c.company_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN companies c ON a.company_id = c.company_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('GET /audit-logs error:', err);
    res.status(500).json({ error: '감사 로그 조회에 실패했습니다.' });
  }
});

// GET /api/audit-logs/actions — 사용 가능한 액션 목록
router.get('/actions', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    res.json({ data: rows.map(r => r.action) });
  } catch (err) { res.status(500).json({ error: '액션 목록 조회 실패' }); }
});

// GET /api/audit-logs/stats — 감사 로그 통계
router.get('/stats', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const [byAction] = await pool.execute(
      `SELECT action, COUNT(*) AS count FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY action ORDER BY count DESC`,
      [parseInt(days)]
    );
    const [byDay] = await pool.execute(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date`,
      [parseInt(days)]
    );
    const [total] = await pool.execute('SELECT COUNT(*) AS count FROM audit_logs');
    res.json({ by_action: byAction, by_day: byDay, total: total[0].count });
  } catch (err) { res.status(500).json({ error: '통계 조회 실패' }); }
});

module.exports = router;
