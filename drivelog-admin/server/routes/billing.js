const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/audit');

// GET /api/billing - 사용료 목록
router.get('/', authenticate, async (req, res) => {
  try {
    const { company_id, status } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'MASTER' && company_id) {
      where += ' AND b.company_id = ?'; params.push(company_id);
    } else if (req.user.role !== 'MASTER') {
      where += ' AND b.company_id = ?'; params.push(req.user.company_id);
    }
    if (status) { where += ' AND b.status = ?'; params.push(status); }

    const [rows] = await pool.execute(
      `SELECT b.*, c.company_name, c.company_code
       FROM app_billing b
       JOIN companies c ON b.company_id = c.company_id
       ${where} ORDER BY b.billing_period DESC`,
      params
    );

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: '사용료 조회에 실패했습니다.' });
  }
});

// POST /api/billing/generate - 월별 사용료 자동 생성 (MASTER 전용)
router.post('/generate', authenticate, authorize('MASTER'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { billing_period } = req.body; // YYYY-MM

    if (!billing_period) return res.status(400).json({ error: '청구 월(billing_period)은 필수입니다.' });

    // 활성 업체별 운행 건수 집계
    const [stats] = await conn.execute(
      `SELECT r.company_id, c.company_name, COUNT(*) AS total_rides
       FROM rides r
       JOIN companies c ON r.company_id = c.company_id
       WHERE c.status = 'ACTIVE' AND DATE_FORMAT(r.started_at, '%Y-%m') = ? AND r.status != 'CANCELLED'
       GROUP BY r.company_id, c.company_name`,
      [billing_period]
    );

    const created = [];
    for (const stat of stats) {
      // 이미 청구 존재하면 스킵
      const [existing] = await conn.execute(
        'SELECT billing_id FROM app_billing WHERE company_id = ? AND billing_period = ?',
        [stat.company_id, billing_period]
      );
      if (existing.length > 0) continue;

      // 기본 요금 (추후 요금제별 설정 연동)
      const billingAmount = 50000; // 기본 월 5만원

      const [result] = await conn.execute(
        `INSERT INTO app_billing (company_id, billing_period, total_rides, billing_amount, status)
         VALUES (?, ?, ?, ?, 'INVOICED')`,
        [stat.company_id, billing_period, stat.total_rides, billingAmount]
      );

      created.push({ billing_id: result.insertId, company_name: stat.company_name, total_rides: stat.total_rides, amount: billingAmount });
    }

    await conn.commit();
    writeAuditLog({ user_id: req.user.user_id, action: 'BILLING_GENERATE', detail: { billing_period, count: created.length }, ip_address: req.ip });
    res.status(201).json({ message: `${created.length}건의 청구가 생성되었습니다.`, data: created });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: '사용료 생성에 실패했습니다.' });
  } finally { conn.release(); }
});

// PUT /api/billing/:id/pay - 결제 완료 처리
router.put('/:id/pay', authenticate, authorize('MASTER'), async (req, res) => {
  try {
    await pool.execute(`UPDATE app_billing SET status = 'PAID', paid_at = NOW() WHERE billing_id = ?`, [req.params.id]);
    res.json({ message: '결제 처리가 완료되었습니다.' });
  } catch (err) { res.status(500).json({ error: '결제 처리에 실패했습니다.' }); }
});

module.exports = router;
